/* ============================================================
   engine.js — 유형 판정 · 문구 조합 · 미션 선정 · 궁합 · 금칙어 검사
   문구는 모두 data/*.js 에서 가져옵니다. (이 파일에는 문구를 두지 않음)
   ============================================================ */
(function () {
  var D = window.TQ_DATA;
  var C = window.TQ_CONFIG;
  var AXES = D.axes;
  var MOD = D.modules;

  function axisOfPole(p) {
    for (var i = 0; i < AXES.length; i++) if (AXES[i].poles.indexOf(p) > -1) return AXES[i];
    return null;
  }

  function intensityText(domPct) {
    for (var i = 0; i < C.intensity.length; i++) if (domPct >= C.intensity[i].min) return C.intensity[i].text;
    return '';
  }

  var Engine = {};

  /* ---------- 1. 판정 ----------
     answers[i] = i번째 문항에서 고른 선택지 index (0/1)
     축마다 가중 득점을 합산 → 높은 쪽이 해당 극. 핵심 문항 1.5 가중으로 동점 불가. */
  Engine.score = function (answers) {
    var total = {}, pct = {}, code = '';
    AXES.forEach(function (ax) { total[ax.poles[0]] = 0; total[ax.poles[1]] = 0; });
    D.questions.forEach(function (q, i) {
      var a = answers[i];
      if (a === null || a === undefined || !q.options[a]) return;
      total[q.options[a].pole] += q.weight;
    });
    AXES.forEach(function (ax) {
      var p0 = ax.poles[0], p1 = ax.poles[1];
      var sum = total[p0] + total[p1] || 1;
      var a = Math.round((total[p0] / sum) * 100);
      pct[p0] = a; pct[p1] = 100 - a;
      code += total[p0] >= total[p1] ? p0 : p1;
    });
    return { code: code, pct: pct };
  };

  Engine.isValidCode = function (code) {
    if (typeof code !== 'string' || code.length !== 4) return false;
    return AXES.every(function (ax, i) { return ax.poles.indexOf(code.charAt(i)) > -1; });
  };

  Engine.allCodes = function () {
    var out = [''];
    AXES.forEach(function (ax) {
      var next = [];
      out.forEach(function (p) { ax.poles.forEach(function (pole) { next.push(p + pole); }); });
      out = next;
    });
    return out;
  };

  /* ---------- 2. 리포트 조합 ---------- */
  Engine.buildReport = function (code, pctMap) {
    var poles = code.split('');
    var m = poles.map(function (p) { return MOD[p]; });
    var T = m[0], S = m[1], I = m[2], R = m[3];
    var pct = pctMap || {};

    var axes = AXES.map(function (ax, i) {
      var dom = poles[i];
      var other = ax.poles[0] === dom ? ax.poles[1] : ax.poles[0];
      var domPct = typeof pct[dom] === 'number' ? pct[dom] : 70;
      return {
        key: ax.key, name: ax.name, dominant: dom, domPct: domPct,
        left: { pole: ax.poles[0], label: MOD[ax.poles[0]].label, pct: ax.poles[0] === dom ? domPct : 100 - domPct },
        right: { pole: ax.poles[1], label: MOD[ax.poles[1]].label, pct: ax.poles[1] === dom ? domPct : 100 - domPct },
        otherLabel: MOD[other].label,
        intensity: intensityText(domPct)
      };
    });

    return {
      code: code,
      nickname: I.adj + ' ' + S.noun,
      tags: [T.nick, R.nick],
      summary: T.sum + ', ' + S.sum + ' ' + I.sum + ' ' + R.sum,
      axes: axes,
      whys: axes.map(function (a, i) {
        return { name: a.name, label: MOD[poles[i]].label, pole: poles[i], text: m[i].why + ' ' + a.intensity };
      }),
      care: [I.care, R.care, T.care].filter(Boolean),
      shapePole: poles[1],
      causePole: poles[2],
      labShape: D.labnotes.shape[poles[1]],
      labCause: D.labnotes.cause[poles[2]]
    };
  };

  /* ---------- 3. 데일리 미션 선정 ----------
     하루 3개 = 요인 풀 1 + 대응 풀 1 + (타이밍 + 공통) 풀 1
     dayIndex(시작일로부터 경과일)로 순환 → 7일 동안 겹치지 않음 */
  Engine.missionsFor = function (code, dayIndex) {
    var T = code.charAt(0), I = code.charAt(2), R = code.charAt(3);
    var all = D.missions;
    function pool(keys) { return all.filter(function (x) { return keys.indexOf(x.pool) > -1; }); }
    var pools = [pool([I]), pool([R]), pool([T, 'common'])];
    var d = Math.max(0, dayIndex || 0);
    return pools.map(function (p) { return p[d % p.length]; });
  };

  Engine.missionById = function (id) {
    for (var i = 0; i < D.missions.length; i++) if (D.missions[i].id === id) return D.missions[i];
    return null;
  };

  /* ---------- 4. 궁합 ---------- */
  Engine.compat = function (mine, friend) {
    var K = D.compat;
    var matches = 0;
    var items = AXES.map(function (ax, i) {
      var same = mine.charAt(i) === friend.charAt(i);
      if (same) matches++;
      return { name: ax.name, same: same, a: MOD[mine.charAt(i)].label, b: MOD[friend.charAt(i)].label, text: K.axis[ax.key][same ? 'same' : 'diff'] };
    });
    return { matches: matches, title: K.titles[matches].title, line: K.titles[matches].line, items: items, tip: K.tip };
  };

  /* ---------- 5. 표현 기준 점검 (개발용, 화면 비노출) ---------- */
  Engine.lint = function () {
    var hits = [];
    var words = C.lint.banned.concat(C.lint.guarantee);
    function walk(v, path) {
      if (typeof v === 'string') {
        words.forEach(function (w) { if (v.indexOf(w) > -1) hits.push(path + ' → "' + w + '" : ' + v); });
      } else if (Array.isArray(v)) {
        v.forEach(function (x, i) { walk(x, path + '[' + i + ']'); });
      } else if (v && typeof v === 'object') {
        Object.keys(v).forEach(function (k) { if (path === 'config' && k === 'lint') return; walk(v[k], path + '.' + k); });
      }
    }
    walk(D, 'data');
    walk(C, 'config');
    if (hits.length) console.warn('[TQ lint] 표현 기준 점검 필요 ' + hits.length + '건\n' + hits.join('\n'));
    else console.info('[TQ lint] 금칙어·보장 표현 없음 ✓');
    return hits;
  };

  /* ---------- 6. 16유형 일괄 점검(개발용) ---------- */
  Engine.selfTest = function () {
    var codes = Engine.allCodes();
    var bad = codes.filter(function (c) {
      var r = Engine.buildReport(c);
      return !r.nickname || !r.summary || r.care.length !== 3 || !r.labShape || !r.labCause;
    });
    console.info('[TQ selfTest] 유형 ' + codes.length + '개 조합 점검, 누락 ' + bad.length + '건');
    return bad;
  };

  window.TQEngine = Engine;
})();
