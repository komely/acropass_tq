/* ============================================================
   cycle.js — 트러블 주기 분석 · 단계 판정 · 케어 문구 조합
   - 입력: 사용자가 기록한 '올라온 날짜' (날짜만 저장, 개인 식별 정보 없음)
   - 규칙값(간격·기간)은 data/cycle.js 의 rules 에서 조정합니다.
   - 주기형(R)만 다음 예상 구간을 계산합니다. 돌발형(S)은 예측하지 않습니다.
   - 예상 구간은 참고용 추정이며, 의학적 판단이 아닙니다.
   ============================================================ */
(function () {
  var D = window.TQ_DATA, Store = window.TQStore;
  var RULE = D.cycle.rules;
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  function sortedLogs() {
    var raw = (Store.get().cycle.logs || []).filter(function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); });
    var seen = {}, out = [];
    raw.forEach(function (d) { if (!seen[d]) { seen[d] = 1; out.push(d); } });
    return out.sort();
  }

  /* 연달아 기록한 날짜(groupGap 일 이내)는 한 번의 '올라온 시기'로 묶고, 각 묶음의 첫 날짜만 반환 */
  function episodes(logs) {
    var eps = [];
    logs.forEach(function (d, i) {
      if (i === 0 || Store.daysBetween(logs[i - 1], d) > RULE.groupGap) eps.push(d);
    });
    return eps;
  }

  var Cycle = {
    dow: DOW,

    fmt: function (key) {
      var p = key.split('-');
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return (+p[1]) + '/' + (+p[2]) + '(' + DOW[d.getDay()] + ')';
    },

    logs: sortedLogs,

    addLog: function (key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return 'invalid';
      if (Store.daysBetween(key, Store.today()) < 0) return 'future';
      var s = Store.get();
      if (s.cycle.logs.indexOf(key) > -1) return 'dup';
      s.cycle.logs.push(key);
      s.cycle.logs.sort();
      if (s.cycle.logs.length > 60) s.cycle.logs = s.cycle.logs.slice(-60);
      Store.save();
      return 'ok';
    },

    removeLog: function (key) {
      var s = Store.get();
      s.cycle.logs = s.cycle.logs.filter(function (d) { return d !== key; });
      Store.save();
    },

    clearLogs: function () { Store.get().cycle.logs = []; Store.save(); },

    /* 현재 상태: { type, phase, logs, episodes, last, sinceLast, pred, notes[] } */
    status: function (code) {
      var T = code.charAt(0), today = Store.today();
      var logs = sortedLogs(), eps = episodes(logs);
      var last = logs.length ? logs[logs.length - 1] : null;
      var sinceLast = last ? Store.daysBetween(last, today) : null;
      var isAfter = sinceLast !== null && sinceLast >= 0 && sinceLast < RULE.afterDays;
      var out = { type: T, phase: isAfter ? 'after' : 'calm', logs: logs, episodes: eps, last: last, sinceLast: sinceLast, pred: null, notes: [] };

      if (T === 'S') {
        out.notes.push(D.cycle.notes.sNoPredict);
        return out;
      }
      if (eps.length < 2) {
        out.notes.push(logs.length ? D.cycle.notes.need2 : D.cycle.notes.empty);
        return out;
      }

      /* 주기형: 올라온 시기 간 평균 간격으로 다음 구간 추정 */
      var gaps = [];
      for (var i = 1; i < eps.length; i++) gaps.push(Store.daysBetween(eps[i - 1], eps[i]));
      var sum = gaps.reduce(function (a, b) { return a + b; }, 0);
      var avg = Math.max(RULE.minInterval, Math.round(sum / gaps.length));
      var spread = Math.max.apply(null, gaps) - Math.min.apply(null, gaps);
      var loose = spread > RULE.looseSpread;
      var half = loose ? 4 : 2;
      var expected = Store.addDays(eps[eps.length - 1], avg), rolled = false, guard = 0;
      while (Store.daysBetween(Store.addDays(expected, half), today) > 0 && guard < 36) {
        expected = Store.addDays(expected, avg); rolled = true; guard++;
      }
      var ws = Store.addDays(expected, -half), we = Store.addDays(expected, half);
      var until = Store.daysBetween(today, ws);
      out.pred = { avg: avg, spread: spread, loose: loose, expected: expected, start: ws, end: we, rolled: rolled, daysUntil: until, episodes: eps.length };
      if (!isAfter) {
        if (until <= 0 && Store.daysBetween(today, we) >= 0) out.phase = 'window';
        else if (until > 0 && until <= RULE.prepDays) out.phase = 'prep';
        else out.phase = 'calm';
      }
      if (rolled) out.notes.push(D.cycle.notes.rolled);
      if (loose) out.notes.push(D.cycle.notes.loose);
      return out;
    },

    phaseDef: function (T, key) {
      var list = D.cycle.phases[T] || [];
      for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
      return list[0];
    },

    /* 단계별 케어 3개: 타이밍 모듈 1 + 요인 모듈 1 + 대응 모듈 1 (날짜에 따라 타이밍 문구가 번갈아 나옴) */
    care: function (code, phaseKey) {
      var T = code.charAt(0), I = code.charAt(2), R = code.charAt(3);
      var def = Cycle.phaseDef(T, phaseKey);
      var MOD = D.modules;
      var pick = Math.abs(Store.daysBetween('2026-01-01', Store.today())) % def.tips.length;
      var cause = D.cycle.cause[I][def.key], resp = D.cycle.response[R][def.key];
      return [
        { kind: 'timing',   tag: MOD[T].label + ' 케어', title: def.tips[pick].title, body: def.tips[pick].body },
        { kind: 'cause',    tag: MOD[I].label + ' 맞춤', title: cause.title, body: cause.body },
        { kind: 'response', tag: MOD[R].label + ' 맞춤', title: resp.title, body: resp.body }
      ];
    },

    /* 시연용 샘플 기록: 오늘 기준 상대 일수로 생성 (주기형 평균 28일 간격) */
    sampleOffsets: {
      calm:   [-70, -42, -14],
      prep:   [-81, -53, -25],
      window: [-84, -56, -28],
      after:  [-60, -32, -3]
    },
    seed: function (kind) {
      var offs = Cycle.sampleOffsets[kind];
      var s = Store.get();
      if (!offs) { s.cycle.logs = []; Store.save(); return; }
      var today = Store.today();
      s.cycle.logs = offs.map(function (o) { return Store.addDays(today, o); });
      Store.save();
    }
  };

  window.TQCycle = Cycle;
})();
