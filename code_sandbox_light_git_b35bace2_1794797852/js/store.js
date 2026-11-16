/* ============================================================
   store.js — localStorage 입출력 (키: tq.v1)
   개인 식별 정보는 저장하지 않습니다. (답변·결과·미션·포인트만)
   ============================================================ */
(function () {
  var KEY = 'tq.v1';
  var memory = null; // localStorage 사용 불가 환경 대비
  var state = null;

  function blank() {
    return {
      v: 1,
      answers: [],          // 문항별 선택 index (0/1/null)
      result: null,         // { code, pct:{R,S,H,F,I,E,Q,W}, at }
      startDate: null,      // 챌린지·미션 로테이션 기준일
      daily: {},            // { 'YYYY-MM-DD': { ids:[...], done:[...] } }
      points: { total: 0, log: [] },
      bonusPaid: false,
      dayOffset: 0,         // 시연용 '다음 날로 넘기기' 보정값 (일)
      cycle: { logs: [] },  // 트러블이 올라온 날짜 기록 ['YYYY-MM-DD', ...] (날짜만 저장)
      read: { ids: [] }     // 읽은 칼럼 id
    };
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 무시 */ }
    return memory ? JSON.parse(memory) : null;
  }

  function write() {
    var s = JSON.stringify(state);
    memory = s;
    try { window.localStorage.setItem(KEY, s); } catch (e) { /* 저장 불가 시 메모리만 사용 */ }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var Store = {
    key: KEY,
    get: function () {
      if (!state) {
        var loaded = read();
        state = loaded && typeof loaded === 'object' ? Object.assign(blank(), loaded) : blank();
        if (!state.points) state.points = { total: 0, log: [] };
        if (!state.daily) state.daily = {};
        /* 이전 버전(기능 추가 전)의 저장 데이터를 보존한 채 새 필드만 보충 */
        if (!state.cycle || !Array.isArray(state.cycle.logs)) state.cycle = { logs: [] };
        if (!state.read || !Array.isArray(state.read.ids)) state.read = { ids: [] };
      }
      return state;
    },
    save: function () { this.get(); write(); },
    dateKey: function (d) {
      d = d || new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    /* 오늘 날짜 (시연용 dayOffset 반영) */
    today: function () {
      var off = this.get().dayOffset || 0;
      return this.dateKey(new Date(Date.now() + off * 86400000));
    },
    addDays: function (key, n) {
      var p = key.split('-');
      return this.dateKey(new Date(+p[0], +p[1] - 1, +p[2] + n));
    },
    /* YYYY-MM-DD 두 날짜 사이의 일수 차이 */
    daysBetween: function (a, b) {
      var pa = a.split('-'), pb = b.split('-');
      var da = new Date(+pa[0], +pa[1] - 1, +pa[2]);
      var db = new Date(+pb[0], +pb[1] - 1, +pb[2]);
      return Math.round((db - da) / 86400000);
    },
    addPoints: function (n, reason) {
      var s = this.get();
      s.points.total = Math.max(0, s.points.total + n);
      s.points.log.push({ d: this.dateKey(), n: n, r: reason });
      if (s.points.log.length > 60) s.points.log = s.points.log.slice(-60);
    },
    /* 시연용 전체 초기화 (사용자가 버튼으로 직접 실행, 확인창 후) */
    wipeAll: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
      memory = null;
      state = null;
    },
    /* 다시 테스트: 답변·결과만 초기화하고 포인트·스탬프 기록은 보존 */
    resetTest: function () {
      var s = this.get();
      s.answers = [];
      s.result = null;
      write();
    }
  };

  window.TQStore = Store;
})();
