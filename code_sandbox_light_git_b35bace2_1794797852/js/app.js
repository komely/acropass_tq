/* ============================================================
   app.js — 화면 전환 · 렌더링 · 이벤트
   흐름: 인트로 → 테스트(16문항) → 분석 연출 → 앱(알기 / 돌보기 / 나누기)
   ============================================================ */
(function () {
  var C = window.TQ_CONFIG, D = window.TQ_DATA;
  var Store = window.TQStore, Engine = window.TQEngine, Char = window.TQChar, Share = window.TQShare;
  var MOD = D.modules;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var els = {};
  var ui = { tab: 'know', qi: 0, lock: false, friend: [null, null, null, null], shareToken: 0, blobCache: null, readId: null, cat: 'all', cyclePhase: null, calOff: 0 };
  var Cycle = window.TQCycle;

  /* ---------------- 공통 유틸 ---------------- */
  function toast(msg) {
    var t = els.toast;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function setScreen(html, cls) {
    els.view.innerHTML = '<div class="screen ' + (cls || '') + '">' + html + '</div>';
    window.scrollTo(0, 0);
  }

  function setChrome(inApp) {
    els.topbar.hidden = !inApp;
    els.tabbar.hidden = !inApp;
    els.app.classList.toggle('has-tabs', inApp);
  }

  function refreshPoints(bump) {
    var s = Store.get();
    $('#pointsNum').textContent = s.points.total;
    $('#pointsUnit').textContent = C.points.unit;
    if (bump) { els.chip.classList.remove('bump'); void els.chip.offsetWidth; els.chip.classList.add('bump'); }
  }

  function confetti(x, y) {
    var colors = [C_var('--brand-primary', '#12A593'), C_var('--brand-accent', '#FFC93C'), '#FF9FA8', '#8EDCCF'];
    for (var i = 0; i < 16; i++) {
      var p = document.createElement('i');
      p.className = 'confetti';
      var ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 80;
      p.style.left = x + 'px'; p.style.top = y + 'px';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(ang) * dist - 30 + 'px');
      p.style.setProperty('--rot', Math.round(Math.random() * 540) + 'deg');
      document.body.appendChild(p);
      setTimeout(function (n) { n.remove(); }.bind(null, p), 1050);
    }
  }
  function C_var(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name); return (v && v.trim()) || fb; }

  function openModal(html) {
    els.modal.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    els.modal.hidden = false;
    els.modal.onclick = function (e) { if (e.target === els.modal) closeModal(); };
  }
  function closeModal() { els.modal.hidden = true; els.modal.innerHTML = ''; }

  function currentReport() {
    var r = Store.get().result;
    return r ? Engine.buildReport(r.code, r.pct) : null;
  }

  /* 쿼리: ?ref=XXXX (친구 유형 코드) */
  function refCode() {
    try {
      var c = new URLSearchParams(location.search).get('ref');
      c = c ? c.toUpperCase() : null;
      return c && Engine.isValidCode(c) ? c : null;
    } catch (e) { return null; }
  }

  /* ---------------- 인트로 ---------------- */
  function renderIntro() {
    setChrome(false);
    var ref = refCode();
    var refHtml = ref
      ? '<div class="ref-banner">' + Char.svg(ref, 2) + '<div><b>친구의 TQ는 ' + ref + '</b><br><span class="muted">나도 해보고 궁합을 확인해 보세요!</span></div></div>'
      : '';
    var flow = C.copy.introFlow.map(function (t, i) { return '<span class="step"><i>0' + (i + 1) + '</i>' + esc(t) + '</span>'; }).join('<span class="arrow">›</span>');
    setScreen(
      '<section class="intro">' +
        '<div class="brand-row"><span class="logo"><span class="logo-img"></span><span class="logo-text">' + esc(C.brand.name) + '</span></span><span class="chip">시안</span></div>' +
        '<div class="intro-stage">' + Char.svg('SHIQ', 1) + '</div>' +
        '<div class="intro-title"><h1>나의 <em>TQ</em></h1>' +
        '<p class="intro-sub">' + esc(C.copy.introSub) + '</p>' +
        '<p class="intro-tagline">' + esc(C.copy.introTagline) + '</p></div>' +
        '<div class="flow" aria-label="이용 흐름">' + flow + '</div>' + refHtml +
        '<div class="intro-cta"><p class="intro-meta">⏱ ' + esc(C.copy.introMeta) + '</p>' +
        '<button class="btn" id="btnStart">' + esc(C.copy.introStart) + '</button>' +
        '<p class="powered">' + esc(C.copy.powered) + '</p></div>' +
      '</section>'
    );
    $('#btnStart').onclick = function () { startTest(); };
  }

  /* ---------------- 테스트 ---------------- */
  function startTest() {
    Store.get().answers = [];
    ui.qi = 0; ui.lock = false;
    setChrome(false);
    renderQuestion(true);
  }

  function renderQuestion(first) {
    var s = Store.get(), Q = D.questions, q = Q[ui.qi], total = Q.length;
    var picked = s.answers[ui.qi];
    var opts = q.options.map(function (o, i) {
      return '<button class="opt' + (picked === i ? ' selected' : '') + '" data-i="' + i + '"><span class="opt-key">' + (i === 0 ? 'A' : 'B') + '</span><span>' + esc(o.text) + '</span></button>';
    }).join('');
    var html =
      '<section class="test">' +
        '<div class="test-top">' +
          '<button class="back-btn" id="btnBack" aria-label="이전 문항"' + (ui.qi === 0 ? ' disabled' : '') + '>‹</button>' +
          '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (ui.qi + 1) + '"><i id="progFill" style="width:' + (first ? 0 : (ui.qi / total) * 100) + '%"></i></div>' +
          '<span class="progress-num">' + (ui.qi + 1) + '/' + total + '</span>' +
        '</div>' +
        '<div class="q-wrap q-anim"><p class="q-no">Q' + String(ui.qi + 1).padStart(2, '0') + '</p>' +
        '<h2 class="q-text">' + esc(q.text) + '</h2>' +
        '<div class="options">' + opts + '</div></div>' +
        '<p class="test-foot">정답은 없어요. 떠오르는 대로 골라주세요.</p>' +
      '</section>';
    setScreen(html);
    requestAnimationFrame(function () { var f = $('#progFill'); if (f) f.style.width = ((ui.qi + 1) / total * 100) + '%'; });

    $('#btnBack').onclick = function () { if (ui.qi > 0 && !ui.lock) { ui.qi--; renderQuestion(); } };
    $$('.opt').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-i'), b); }; });
  }

  function choose(i, btn) {
    if (ui.lock) return;
    ui.lock = true;
    var s = Store.get();
    s.answers[ui.qi] = i;
    Store.save();
    $$('.opt').forEach(function (b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    setTimeout(function () {
      ui.lock = false;
      if (ui.qi < D.questions.length - 1) { ui.qi++; renderQuestion(); }
      else renderAnalyzing();
    }, 280);
  }

  /* ---------------- 분석 연출 ---------------- */
  function renderAnalyzing() {
    ui.lock = true;
    var steps = ['16개 응답을 4개 축으로 정리하는 중', '축별 성향 비율을 계산하는 중', '나의 트러블 캐릭터를 준비하는 중'];
    setScreen(
      '<section class="analyzing"><div class="lab-ring"></div>' +
      '<h2>리포트를 작성하고 있어요</h2>' +
      '<ul class="steps">' + steps.map(function (t, i) { return '<li style="animation-delay:' + (0.3 + i * 0.5) + 's">' + t + '</li>'; }).join('') + '</ul>' +
      '<p class="powered">' + esc(C.copy.powered) + '</p></section>'
    );
    setTimeout(function () {
      var s = Store.get();
      var r = Engine.score(s.answers);
      s.result = { code: r.code, pct: r.pct, at: Store.today() };
      if (!s.startDate) s.startDate = Store.today();
      Store.save();
      ui.lock = false; ui.tab = 'know';
      enterApp('know');
    }, 2100);
  }

  /* ---------------- 앱 셸 ---------------- */
  function enterApp(tab) {
    setChrome(true);
    refreshPoints(false);
    switchTab(tab || ui.tab);
  }

  function switchTab(tab) {
    ui.tab = tab;
    $$('.tab').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === tab); });
    if (tab === 'know') renderKnow();
    else if (tab === 'cycle') renderCycle();
    else if (tab === 'care') renderCare();
    else if (tab === 'read') renderRead();
    else renderShare();
  }

  /* 탭 버튼·바로가기로 이동: 읽기 상세·주기 미리보기 상태를 초기화 */
  function goTab(tab) {
    if (tab === 'read') ui.readId = null;
    if (tab === 'cycle') { ui.cyclePhase = null; ui.calOff = 0; }
    switchTab(tab);
  }
  function openColumn(id) { ui.readId = id; switchTab('read'); }

  /* ---------------- 알기: 결과 리포트 ---------------- */
  function renderKnow() {
    var s = Store.get(), rep = currentReport();
    if (!rep) { renderIntro(); return; }

    /* 1단: 유형 카드 */
    var codeBoxes = rep.code.split('').map(function (p) {
      return '<div class="code-box"><strong>' + p + '</strong><small>' + MOD[p].label + '</small></div>';
    }).join('');
    var stage1 =
      '<div class="stage-tag"><b>1</b><span>유형 카드</span></div>' +
      '<article class="type-card">' +
        '<div class="tc-top"><span class="kicker">TQ TYPE</span><span class="chip accent">' + (MOD[rep.code.charAt(1)].label) + '</span></div>' +
        '<div class="tc-art">' + Char.svg(rep.code, 1) + '</div>' +
        '<div class="tc-body"><div class="code-row" aria-label="유형 코드 ' + rep.code + '">' + codeBoxes + '</div>' +
          '<h2 class="nickname">' + esc(rep.nickname) + '</h2>' +
          '<div class="tc-tags">' + rep.tags.map(function (t) { return '<span class="chip">#' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<p class="tc-sum">' + esc(rep.summary) + '</p></div>' +
        '<div class="tc-foot">나의 트러블 캐릭터 · 딱이(가제)</div>' +
      '</article>';

    /* 2단: 성향 리포트 */
    var spec = rep.axes.map(function (a) {
      var L = a.left, R = a.right;
      return '<div class="spec-row"><div class="spec-head"><span class="axis-name">' + esc(a.name) + '</span><span class="axis-res">' + esc(MOD[a.dominant].label) + ' · ' + a.domPct + '%</span></div>' +
        '<div class="spec-track"><i class="' + (L.pole === a.dominant ? 'dom' : '') + '" data-w="' + L.pct + '"></i><i class="' + (R.pole === a.dominant ? 'dom' : '') + '" data-w="' + R.pct + '"></i></div>' +
        '<div class="spec-labels"><span class="' + (L.pole === a.dominant ? 'dom' : '') + '">' + L.label + ' <b>' + L.pct + '%</b></span><span class="' + (R.pole === a.dominant ? 'dom' : '') + '"><b>' + R.pct + '%</b> ' + R.label + '</span></div></div>';
    }).join('');
    var whys = rep.whys.map(function (w) {
      return '<div class="why-item"><h4><span>' + w.pole + '</span>' + esc(w.name) + ' · ' + esc(w.label) + '</h4><p>' + esc(w.text) + '</p></div>';
    }).join('');
    var cares = rep.care.map(function (c) { return '<div class="care-item"><h4>' + esc(c.title) + '</h4><p>' + esc(c.body) + '</p></div>'; }).join('');
    var stage2 =
      '<div class="stage-tag"><b>2</b><span>성향 리포트</span></div>' +
      '<section class="card"><p class="kicker">Axis Spectrum</p><h3 class="section-title" style="margin:6px 0 20px">4개 축으로 본 나의 성향</h3>' +
      '<div class="spec">' + spec + '</div>' +
      '<h3 class="sub-title">왜 이런 결과인가</h3><div class="why-list">' + whys + '</div>' +
      '<h3 class="sub-title">케어 제안</h3><div class="care-list">' + cares + '</div></section>';

    /* 3단: Lab Note */
    var ls = rep.labShape, lc = rep.labCause, pr = ls.product;
    var tips = ls.tips ? '<ul class="tips">' + ls.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
    var stage3 =
      '<div class="stage-tag"><b>3</b><span>Lab Note</span></div>' +
      '<div class="lab-card"><span class="lab-label">LAB NOTE No.' + ls.no + '</span><h3>' + esc(ls.title) + '</h3><p class="body">' + esc(ls.body) + '</p>' + tips + '<p class="evidence">' + esc(ls.evidence) + '</p></div>' +
      '<div class="lab-card"><span class="lab-label">LAB NOTE No.' + lc.no + '</span><h3>' + esc(lc.title) + '</h3><p class="body">' + esc(lc.body) + '</p><p class="evidence">' + esc(lc.evidence) + '</p></div>' +
      '<div class="product"><p class="pk">' + esc(pr.kicker) + '</p><h3 class="pn">' + esc(pr.name) + ' <span class="chip">' + esc(pr.tag) + '</span></h3><p class="pd">' + esc(pr.desc) + '</p>' +
      '<ul>' + pr.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
      '<a class="btn small" id="btnProduct" href="' + esc(C.links[pr.link] || '#') + '" target="_blank" rel="noopener">' + esc(pr.cta) + ' ›</a></div>';

    var ending =
      '<div class="ending"><small>TROUBLE QUOTIENT</small><strong>' + endingHtml(C.copy.ending) + '</strong></div>' +
      '<p class="disclaimer">' + esc(C.copy.disclaimer) + '</p>' +
      '<p class="sample-note">' + esc(C.copy.sampleNotice) + '</p>';

    setScreen(
      '<div class="report-head"><span class="kicker">TQ Report</span><span class="report-no">No. ' + esc(rep.code) + ' · ' + esc(s.result.at || '') + '</span></div>' +
      stage1 + stage2 + cycleTeaser(rep) + stage3 + columnTeaser(rep) + ending
    );

    /* 막대 채우기 애니메이션 */
    setTimeout(function () { $$('.spec-track i').forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }, 80);
    $('#btnProduct').onclick = function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#') { e.preventDefault(); toast(C.copy.linkPending); }
    };
  }

  /* 엔딩 카피: "딱!" 강조 */
  function endingHtml(t) { return esc(t).replace('딱!', '<em>딱!</em>'); }

  /* ---------------- 돌보기 ---------------- */
  function ensureDaily() {
    var s = Store.get(), rep = s.result, today = Store.today();
    if (!s.startDate) s.startDate = today;
    var idx = Math.max(0, Store.daysBetween(s.startDate, today));
    var ids = Engine.missionsFor(rep.code, idx).map(function (m) { return m.id; });
    var rec = s.daily[today];
    if (!rec || rec.code !== rep.code) {
      var prevDone = rec ? rec.done.filter(function (id) { return ids.indexOf(id) > -1; }) : [];
      rec = s.daily[today] = { code: rep.code, ids: ids, done: prevDone };
    }
    Store.save();
    return rec;
  }

  function challengeInfo() {
    var s = Store.get(), today = Store.today(), n = C.challenge.days;
    var days = [], full = 0, stamped = 0;
    for (var i = 0; i < n; i++) {
      var key = Store.addDays(s.startDate, i);
      var rec = s.daily[key], cnt = rec ? rec.done.length : 0;
      var rel = Store.daysBetween(today, key); // <0 과거, 0 오늘, >0 미래
      if (cnt >= 1) stamped++;
      if (cnt >= 3) full++;
      days.push({ key: key, cnt: cnt, rel: rel, md: +key.split('-')[2] });
    }
    return { days: days, stamped: stamped, full: full, ended: Store.daysBetween(s.startDate, today) > n - 1, complete: stamped >= n };
  }

  function renderCare() {
    var rep = currentReport();
    if (!rep) { renderIntro(); return; }
    ensureDaily();
    setScreen(
      '<div class="care-hero" id="careHero"></div>' +
      '<div class="sec-head"><h2>오늘의 케어 미션</h2><span class="count" id="missionCount"></span></div>' +
      '<div id="missionList"></div>' + cycleMini() +
      '<div class="sec-head"><h2>7일 챌린지</h2><span class="count" id="chalCount"></span></div>' +
      '<div class="card challenge" id="challenge"></div>' +
      '<div class="sec-head"><h2>딱 포인트</h2></div>' +
      '<div id="pointsCard"></div>' +
      '<p class="disclaimer" style="margin-top:22px">' + esc(C.copy.disclaimer) + '</p>' +
      '<p class="sample-note">' + esc(C.copy.sampleNotice) + '</p>'
    );
    paintHero(false); paintMissions(); paintChallenge(null); paintPoints();
  }

  function paintHero(wiggle) {
    var s = Store.get(), rec = s.daily[Store.today()], rep = s.result;
    var n = rec.done.length, mood = Char.moodFor(n);
    var dots = [0, 1, 2].map(function (i) { return '<i class="' + (i <= mood ? 'on' : '') + '"></i>'; }).join('');
    $('#careHero').innerHTML =
      '<div class="stage" id="charStage" role="button" aria-label="딱이 쓰다듬기" tabindex="0">' + Char.svg(rep.code, mood) + '</div>' +
      '<span class="mood-badge"><span class="mood-dots">' + dots + '</span>' + Char.moodNames[mood] + ' 표정</span>' +
      '<div class="bubble">' + esc(C.copy.moodLines[mood]) + '</div>' +
      '<p class="char-name">딱이(가제) · ' + esc(currentReport().nickname) + '</p>';
    var stage = $('#charStage');
    function pet() {
      stage.classList.remove('wiggle'); void stage.offsetWidth; stage.classList.add('wiggle');
      var h = document.createElement('span'); h.className = 'heart'; h.textContent = ['💛', '💚', '✨'][Math.floor(Math.random() * 3)];
      h.style.left = (40 + Math.random() * 120) + 'px'; h.style.top = '30px';
      stage.appendChild(h); setTimeout(function () { h.remove(); }, 1000);
    }
    stage.onclick = pet;
    stage.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pet(); } };
    if (wiggle) pet();
  }

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function paintMissions() {
    var s = Store.get(), rec = s.daily[Store.today()];
    $('#missionCount').textContent = rec.done.length + ' / ' + rec.ids.length;
    $('#missionList').innerHTML = rec.ids.map(function (id) {
      var m = Engine.missionById(id), done = rec.done.indexOf(id) > -1;
      return '<div class="mission' + (done ? ' done' : '') + '" data-id="' + id + '">' +
        '<button class="m-check" aria-label="' + esc(m.text) + ' 완료 체크" aria-pressed="' + done + '">' + CHECK + '</button>' +
        '<div class="m-main"><p class="m-title"><span>' + m.icon + '</span><span class="t">' + esc(m.text) + '</span></p>' +
        '<p class="m-why"><b>WHY</b><span>' + esc(m.why) + '</span></p></div></div>';
    }).join('');
    $$('.mission').forEach(function (el) {
      var go = function () { toggleMission(el); };
      $('.m-check', el).onclick = function (e) { e.stopPropagation(); go(); };
      el.onclick = go;
    });
  }

  function toggleMission(el) {
    var s = Store.get(), today = Store.today(), rec = s.daily[today], id = el.getAttribute('data-id');
    var i = rec.done.indexOf(id), wasFull = rec.done.length >= 3;
    var before = challengeInfo().complete;
    if (i === -1) {
      rec.done.push(id);
      Store.addPoints(C.points.perMission, 'mission');
      el.classList.add('done', 'clearing');
      $('.m-check', el).setAttribute('aria-pressed', 'true');
      var r = $('.m-check', el).getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2);
      var plus = document.createElement('span'); plus.className = 'm-plus'; plus.textContent = '+' + C.points.perMission + C.points.unit;
      el.appendChild(plus); setTimeout(function () { plus.remove(); el.classList.remove('clearing'); }, 1100);
      var after = challengeInfo();
      if (!before && after.complete && !s.bonusPaid) {
        s.bonusPaid = true;
        Store.addPoints(C.points.weekBonus, 'bonus');
        setTimeout(function () { toast('🎉 7일 챌린지 완주! 보너스 +' + C.points.weekBonus + C.points.unit); confetti(window.innerWidth / 2, window.innerHeight / 2); }, 700);
      } else if (rec.done.length === 3) {
        setTimeout(function () { toast('오늘 미션 완료! 딱이가 아주 편안해졌어요 😊'); }, 600);
      }
    } else {
      rec.done.splice(i, 1);
      Store.addPoints(-C.points.perMission, 'undo');
      el.classList.remove('done');
      $('.m-check', el).setAttribute('aria-pressed', 'false');
    }
    Store.save();
    $('#missionCount').textContent = rec.done.length + ' / ' + rec.ids.length;
    var moodChanged = Char.moodFor(rec.done.length) !== Char.moodFor(wasFull ? 3 : (i === -1 ? rec.done.length - 1 : rec.done.length + 1));
    paintHero(moodChanged);
    paintChallenge(i === -1 ? today : null);
    paintPoints();
    refreshPoints(true);
  }

  function paintChallenge(justKey) {
    var s = Store.get(), info = challengeInfo(), n = C.challenge.days;
    $('#chalCount').textContent = info.stamped + ' / ' + n + '일';
    var cal = info.days.map(function (d, i) {
      var cls = 'stamp', inner = d.md;
      if (d.cnt >= 3) { cls += ' full'; inner = CHECK; }
      else if (d.cnt >= 1) { cls += ' part'; inner = d.cnt + '/3'; }
      else if (d.rel < 0) cls += ' miss';
      if (d.rel === 0) cls += ' today';
      if (justKey && d.key === justKey) cls += ' just';
      return '<div class="day"><div class="d-lb">D' + (i + 1) + '</div><div class="' + cls + '">' + inner + '</div></div>';
    }).join('');
    var tail = '';
    if (info.complete) tail = '<div class="chal-done">🎉 7일 챌린지 완주! 보너스 ' + C.points.weekBonus + C.points.unit + ' 적립 완료</div>';
    if (info.ended || info.complete) tail += '<button class="btn ghost small" id="btnNewChal" style="margin-top:12px">새 7일 챌린지 시작하기</button>';
    $('#challenge').innerHTML =
      '<p class="kicker">Calendar Stamp</p>' +
      '<div class="cal">' + cal + '</div>' +
      '<div class="chal-bar"><div class="progress"><i style="width:' + Math.min(100, info.stamped / n * 100) + '%"></i></div><span>' + info.stamped + '/' + n + '</span></div>' +
      '<p class="chal-note">하루에 미션을 1개 이상 클리어하면 스탬프가 찍혀요. 3개를 모두 하면 진한 스탬프예요. 연속이 아니어도 7일을 채우면 완주예요.</p>' + tail;
    var b = $('#btnNewChal');
    if (b) b.onclick = function () {
      var st = Store.get(); st.startDate = Store.today(); st.bonusPaid = false; Store.save();
      renderCare(); toast('새 챌린지를 시작했어요!');
    };
  }

  function paintPoints() {
    var s = Store.get(), U = C.points.unit;
    $('#pointsCard').innerHTML =
      '<div class="points-card"><p class="pc-lb">MY DDAK POINT</p>' +
      '<p class="pc-num">' + s.points.total + '<small>' + U + '</small></p>' +
      '<div class="pc-rule"><span>• 미션 1개 클리어 = ' + C.points.perMission + U + '</span><span>• 7일 챌린지 완주 = 보너스 ' + C.points.weekBonus + U + '</span></div>' +
      '<span class="pc-soon">🎁 ' + esc(C.copy.rewardNotice) + '</span></div>';
  }

  /* ---------------- 나누기 ---------------- */
  function renderShare() {
    var rep = currentReport();
    if (!rep) { renderIntro(); return; }
    var ref = refCode();
    if (ref && !ui.friend.every(Boolean)) ui.friend = ref.split('');
    setScreen(
      '<div class="report-head"><span class="kicker">Share</span></div>' +
      '<h2 class="section-title">내 TQ 카드 공유하기</h2>' +
      '<p class="muted" style="margin-top:6px;font-size:13px">스토리 규격(9:16) 이미지로 저장하거나 링크로 나눠보세요.</p>' +
      '<div class="share-preview" id="sharePreview"><div class="loading">카드 만드는 중…</div></div>' +
      '<p class="share-hint">미션 달성도에 따라 달라지는 딱이 표정은 카드에 반영되지 않아요.</p>' +
      '<div class="share-actions">' +
        '<button class="btn" id="btnSave">📥 이미지로 저장</button>' +
        '<div class="row2"><button class="btn ghost small" id="btnCopy">🔗 링크 복사</button><button class="btn ghost small" id="btnShare">📤 공유하기</button></div>' +
      '</div>' +
      '<div class="sec-head"><h2>친구 TQ와 궁합 보기</h2></div>' +
      '<section class="card compat-box"><p class="muted" style="font-size:13px">친구의 유형을 고르면 궁합 카드가 나와요. 이름이나 연락처는 묻지 않아요.</p>' +
      '<div class="axis-pick" id="axisPick"></div><div id="compatOut"></div></section>' +
      '<p class="sample-note">' + esc(C.copy.sampleNotice) + '</p>'
    );
    paintCompat();

    var token = ++ui.shareToken;
    var key = rep.code;
    var ready = (ui.blobCache && ui.blobCache.key === key)
      ? Promise.resolve(ui.blobCache.blob)
      : Share.card(rep, 2).then(function (b) { ui.blobCache = { key: key, blob: b, url: URL.createObjectURL(b) }; return b; });
    ready.then(function () {
      if (token !== ui.shareToken || ui.tab !== 'share') return;
      $('#sharePreview').innerHTML = '<img alt="내 TQ 유형 카드 미리보기" src="' + ui.blobCache.url + '">';
    }).catch(function () {
      var p = $('#sharePreview'); if (p) p.innerHTML = '<div class="loading">미리보기를 만들지 못했어요</div>';
    });

    function getBlob() { return ready; }
    $('#btnSave').onclick = function () {
      getBlob().then(function (b) { Share.download(b, rep.code); toast('이미지를 저장했어요'); }).catch(function () { toast('이미지 저장에 실패했어요'); });
    };
    $('#btnCopy').onclick = function () {
      Share.copy(Share.url(rep.code)).then(function (ok) { toast(ok ? '링크를 복사했어요' : '복사에 실패했어요. 주소창의 링크를 직접 복사해 주세요'); });
    };
    $('#btnShare').onclick = function () {
      if (!Share.canNativeShare()) {
        Share.copy(Share.url(rep.code)).then(function () { toast('이 브라우저는 공유 시트를 지원하지 않아 링크를 복사했어요'); });
        return;
      }
      getBlob().then(function (b) { return Share.native(b, rep.code, rep.nickname); }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        toast('공유에 실패했어요. 링크 복사를 이용해 주세요');
      });
    };
  }

  function paintCompat() {
    var rep = currentReport();
    $('#axisPick').innerHTML = D.axes.map(function (ax, i) {
      return '<div class="ap-row"><span class="ap-name">' + esc(ax.name) + '</span>' +
        ax.poles.map(function (p) { return '<button class="pill' + (ui.friend[i] === p ? ' sel' : '') + '" data-i="' + i + '" data-p="' + p + '">' + MOD[p].label + '</button>'; }).join('') + '</div>';
    }).join('');
    $$('#axisPick .pill').forEach(function (b) {
      b.onclick = function () { ui.friend[+b.getAttribute('data-i')] = b.getAttribute('data-p'); paintCompat(); };
    });
    var out = $('#compatOut');
    if (!ui.friend.every(Boolean)) {
      var left = ui.friend.filter(function (x) { return !x; }).length;
      out.innerHTML = '<div class="empty-hint">남은 선택 ' + left + '개 · 모두 고르면 궁합 카드가 나타나요</div>';
      return;
    }
    var fc = ui.friend.join(''), cp = Engine.compat(rep.code, fc);
    out.innerHTML =
      '<p class="friend-code">FRIEND TQ <b>' + fc + '</b></p>' +
      '<div class="compat-card"><div class="compat-pair">' +
        '<div class="who">' + Char.svg(rep.code, 2) + '<small>' + rep.code + '</small></div><span class="heart-mid">💞</span>' +
        '<div class="who">' + Char.svg(fc, 2) + '<small>' + fc + '</small></div></div>' +
      '<h3 class="compat-title">' + esc(cp.title) + '</h3>' +
      '<p class="compat-match">축 ' + cp.matches + '/4 일치</p>' +
      '<p class="compat-line">' + esc(cp.line) + '</p>' +
      '<div class="compat-items">' + cp.items.map(function (it) {
        return '<div class="ci"><b>' + esc(it.name) + '</b><div><span class="tag' + (it.same ? '' : ' diff') + '">' + (it.same ? '일치' : '보완') + '</span> ' + esc(it.a) + ' × ' + esc(it.b) + '<br>' + esc(it.text) + '</div></div>';
      }).join('') + '</div>' +
      '<p class="compat-tip">' + esc(cp.tip) + '</p></div>';
  }

  /* ============================================================
     주기 케어 탭
     ============================================================ */
  var PHASE_ORDER = { R: ['calm', 'prep', 'window', 'after'], S: ['calm', 'after'] };
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  function predRange(st) { return Cycle.fmt(st.pred.start) + ' ~ ' + Cycle.fmt(st.pred.end); }

  /* 알기 탭: 성향 리포트 끝에 붙는 주기 케어 진입 카드 */
  function cycleTeaser(rep) {
    var T = rep.code.charAt(0), st = Cycle.status(rep.code), def = Cycle.phaseDef(T, st.phase);
    return '<div class="promo" id="cycleTeaser"><div class="promo-ic">' + def.icon + '</div><div class="promo-tx">' +
      '<p class="kicker">Cycle Care</p><h3>내 주기에 맞춘 케어 방법</h3>' +
      '<p>' + esc(MOD[T].label) + '인 내 리듬에 맞춰 지금 단계의 케어를 정리해 드려요. 지금은 <b>' + esc(def.name) + '</b> 단계예요.</p>' +
      '<button class="btn small" data-go="cycle">주기 케어 보러 가기 ›</button></div></div>';
  }

  /* 돌보기 탭: 현재 주기 단계 바로가기 */
  function cycleMini() {
    var r = Store.get().result;
    if (!r) return '';
    var T = r.code.charAt(0), st = Cycle.status(r.code), def = Cycle.phaseDef(T, st.phase);
    var sub = st.pred ? '다음 예상 구간 ' + predRange(st) : def.goal;
    return '<button class="go-card" data-go="cycle"><span class="go-ic">' + def.icon + '</span><span class="go-tx"><small>주기 케어</small><b>지금은 ' + esc(def.name) + '</b><em>' + esc(sub) + '</em></span><span class="go-arrow">›</span></button>';
  }

  function renderCycle() {
    var rep = currentReport();
    if (!rep) { renderIntro(); return; }
    var code = rep.code, T = code.charAt(0), st = Cycle.status(code), order = PHASE_ORDER[T];
    var def = Cycle.phaseDef(T, st.phase);

    /* 상태 카드 */
    var predHtml = '';
    if (st.pred) {
      var pr = st.pred, d = pr.daysUntil;
      var untilTx = st.phase === 'window' ? '구간 진행 중' : (st.phase === 'after' && d > 0 ? 'D-' + d : (d > 0 ? 'D-' + d : '구간 진행 중'));
      predHtml =
        '<div class="pred-grid"><div class="pred"><small>다음 예상 구간</small><b>' + esc(predRange(st)) + '</b></div>' +
        '<div class="pred"><small>예상 구간까지</small><b>' + untilTx + '</b></div>' +
        '<div class="pred"><small>평균 간격</small><b>' + pr.avg + '일</b></div></div>' +
        '<p class="cy-note">' + esc(C.copy.cycleEstimateNotice) + '</p>';
    }
    var noteHtml = st.notes.map(function (n) { return '<p class="cy-note">ℹ️ ' + esc(n) + '</p>'; }).join('');

    var hero =
      '<section class="cy-hero"><p class="kicker">Cycle Care · ' + esc(MOD[T].label) + '</p>' +
      '<h2 class="section-title" style="margin-top:6px">나의 트러블 주기</h2>' +
      '<p class="cy-intro">' + esc(D.cycle.intro[T]) + '</p>' +
      '<div class="phase-now"><span class="pn-ic">' + def.icon + '</span><div><small>지금은</small><b>' + esc(def.name) + '</b><em>' + esc(def.when) + '</em></div></div>' +
      predHtml + noteHtml + '</section>';

    /* 기록 카드 */
    var today = Store.today();
    var recent = st.logs.slice(-6).reverse().map(function (k) {
      return '<span class="log-chip">' + esc(Cycle.fmt(k)) + '<button class="log-x" data-del="' + k + '" aria-label="' + esc(Cycle.fmt(k)) + ' 기록 삭제">×</button></span>';
    }).join('');
    var rec =
      '<div class="sec-head"><h2>트러블 기록</h2><span class="count">' + st.logs.length + '개</span></div>' +
      '<section class="card cy-record"><div id="cal"></div>' +
      '<p class="cal-hint">날짜를 누르면 기록하거나 지울 수 있어요. ' + esc(C.copy.logPrivacy) + '</p>' +
      '<div class="log-form"><input type="date" id="logDate" value="' + today + '" max="' + today + '" aria-label="트러블이 올라온 날짜"><button class="btn small" id="btnLog">기록하기</button></div>' +
      '<button class="btn ghost small" id="btnLogToday" style="margin-top:8px">오늘 올라왔어요</button>' +
      (recent ? '<p class="sub-title" style="margin-top:20px">최근 기록</p><div class="log-chips">' + recent + '</div>' : '<div class="empty-hint" style="margin-top:14px">' + esc(D.cycle.notes.empty) + '</div>') +
      '</section>';

    /* 단계별 케어 */
    var care =
      '<div class="sec-head"><h2>단계별 케어 방법</h2></div>' +
      '<section class="card"><div class="phase-line" id="phaseLine" role="tablist"></div><div id="phaseCare"></div></section>';

    var sos = '';
    if (T === 'S') {
      var S = D.cycle.sos;
      sos = '<section class="sos"><p class="kicker">SOS · 돌발형 맞춤</p><h3>' + esc(S.title) + '</h3>' +
        S.steps.map(function (x) { return '<div class="sos-step"><b>' + x.n + '</b><div><strong>' + esc(x.title) + '</strong><p>' + esc(x.body) + '</p></div></div>'; }).join('') + '</section>';
    }

    var related = D.columns.filter(function (c) { return c.cat === 'record' || c.tags.indexOf(T) > -1; }).slice(0, 2);
    var relHtml = '<div class="sec-head"><h2>함께 읽어보세요</h2><button class="link-btn" data-go="read">칼럼 전체 ›</button></div>' +
      related.map(function (c) { return colCard(c, rep, false); }).join('');

    setScreen(hero + rec + care + sos + relHtml +
      '<p class="disclaimer" style="margin-top:22px">' + esc(C.copy.disclaimer) + '</p>' +
      '<p class="sample-note">' + esc(C.copy.sampleNotice) + '</p>');

    paintCal(st);
    paintPhase(st);

    function afterChange(msg) { toast(msg); renderCycle(); }
    function add(key) {
      var r = Cycle.addLog(key);
      if (r === 'ok') { var y = window.scrollY; afterChange('기록했어요 · ' + Cycle.fmt(key)); window.scrollTo(0, y); }
      else if (r === 'dup') toast('이미 기록한 날짜예요');
      else if (r === 'future') toast('오늘 이후 날짜는 기록할 수 없어요');
      else toast('날짜를 다시 확인해 주세요');
    }
    $('#btnLog').onclick = function () { add($('#logDate').value); };
    $('#btnLogToday').onclick = function () { add(Store.today()); };
    $$('.log-x').forEach(function (b) {
      b.onclick = function () { var y = window.scrollY; Cycle.removeLog(b.getAttribute('data-del')); afterChange('기록을 지웠어요'); window.scrollTo(0, y); };
    });
  }

  /* 달력: 기록(점) · 예상 구간(색) · 오늘(테두리) */
  function paintCal(st) {
    var today = Store.today(), tp = today.split('-');
    var base = new Date(+tp[0], +tp[1] - 1 + ui.calOff, 1);
    var y = base.getFullYear(), m = base.getMonth();
    var lead = base.getDay(), days = new Date(y, m + 1, 0).getDate();
    var logSet = {}; st.logs.forEach(function (k) { logSet[k] = 1; });
    var cells = '';
    Cycle.dow.forEach(function (w) { cells += '<span class="cd-w">' + w + '</span>'; });
    for (var i = 0; i < lead; i++) cells += '<span class="cd empty"></span>';
    for (var d = 1; d <= days; d++) {
      var key = y + '-' + p2(m + 1) + '-' + p2(d);
      var cls = 'cd';
      if (logSet[key]) cls += ' log';
      if (st.pred && key >= st.pred.start && key <= st.pred.end) cls += ' win';
      if (st.pred && key === st.pred.expected) cls += ' exp';
      if (key === today) cls += ' tod';
      var future = Store.daysBetween(today, key) > 0;
      cells += '<button class="' + cls + '" data-day="' + key + '"' + (future ? ' disabled' : '') + ' aria-label="' + (m + 1) + '월 ' + d + '일">' + d + '</button>';
    }
    $('#cal').innerHTML =
      '<div class="cal-head"><button class="cal-nav" id="calPrev" aria-label="이전 달">‹</button><b>' + y + '년 ' + (m + 1) + '월</b><button class="cal-nav" id="calNext" aria-label="다음 달"' + (ui.calOff >= 3 ? ' disabled' : '') + '>›</button></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="cal-legend"><span><i class="lg log"></i>올라온 날</span>' + (st.pred ? '<span><i class="lg win"></i>예상 구간(참고용)</span>' : '') + '<span><i class="lg tod"></i>오늘</span></div>';
    $('#calPrev').onclick = function () { if (ui.calOff > -12) { ui.calOff--; paintCal(st); } };
    $('#calNext').onclick = function () { if (ui.calOff < 3) { ui.calOff++; paintCal(st); } };
    $$('#cal .cd[data-day]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-day'), y0 = window.scrollY;
        if (logSet[k]) { Cycle.removeLog(k); toast('기록을 지웠어요'); }
        else { var r = Cycle.addLog(k); if (r === 'ok') toast('기록했어요 · ' + Cycle.fmt(k)); }
        var keep = ui.calOff; renderCycle(); ui.calOff = keep; paintCal(Cycle.status(currentReport().code)); window.scrollTo(0, y0);
      };
    });
  }

  /* 단계 탭 + 케어 카드 3개 */
  function paintPhase(st) {
    var rep = currentReport(), T = rep.code.charAt(0), order = PHASE_ORDER[T];
    var viewKey = ui.cyclePhase && order.indexOf(ui.cyclePhase) > -1 ? ui.cyclePhase : st.phase;
    $('#phaseLine').innerHTML = order.map(function (k) {
      var d = Cycle.phaseDef(T, k), cls = 'ph' + (k === viewKey ? ' view' : '') + (k === st.phase ? ' now' : '');
      return '<button class="' + cls + '" data-ph="' + k + '" role="tab" aria-selected="' + (k === viewKey) + '"><span class="ph-ic">' + d.icon + '</span><span class="ph-nm">' + esc(d.name) + '</span>' + (k === st.phase ? '<i class="ph-now">지금</i>' : '') + '</button>';
    }).join('');
    var vd = Cycle.phaseDef(T, viewKey), cares = Cycle.care(rep.code, viewKey);
    $('#phaseCare').innerHTML =
      '<div class="ph-goal"><b>' + vd.icon + ' ' + esc(vd.name) + '</b><span>' + esc(vd.when) + '</span><p>' + esc(vd.goal) + '</p>' +
      (viewKey !== st.phase ? '<p class="ph-preview">지금 단계가 아닌 미리보기예요.</p>' : '') + '</div>' +
      '<div class="care-list">' + cares.map(function (c) {
        return '<div class="care-item"><span class="chip ' + (c.kind === 'timing' ? '' : 'accent') + '" style="margin-bottom:6px">' + esc(c.tag) + '</span><h4>' + esc(c.title) + '</h4><p>' + esc(c.body) + '</p></div>';
      }).join('') + '</div>';
    $$('#phaseLine .ph').forEach(function (b) { b.onclick = function () { ui.cyclePhase = b.getAttribute('data-ph'); paintPhase(st); }; });
  }

  /* ============================================================
     읽기 탭 (전문가 칼럼)
     ============================================================ */
  function catOf(key) {
    var cs = D.columnMeta.categories;
    for (var i = 0; i < cs.length; i++) if (cs[i].key === key) return cs[i];
    return cs[0];
  }
  function colScore(c, code) { return c.tags.filter(function (t) { return code.indexOf(t) > -1; }).length; }
  function recommended(code, n) {
    return D.columns.map(function (c, i) { return { c: c, s: colScore(c, code), i: i }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .slice(0, n).map(function (x) { return x.c; });
  }

  function colCard(c, rep, badge) {
    var cat = catOf(c.cat), au = D.columnMeta.authors[c.author];
    var isRead = Store.get().read.ids.indexOf(c.id) > -1;
    return '<button class="col-card" data-col="' + c.id + '"><div class="col-top"><span class="chip">' + cat.icon + ' ' + esc(cat.name) + '</span>' +
      (badge ? '<span class="chip accent">나와 맞아요</span>' : '') + (isRead ? '<span class="read-mark">읽음 ✓</span>' : '') + '</div>' +
      '<h3>' + esc(c.title) + '</h3><p>' + esc(c.summary) + '</p>' +
      '<div class="col-meta"><span>' + esc(au.name) + ' · ' + esc(au.role) + '</span><span>' + c.readMin + '분</span></div></button>';
  }

  /* 알기 탭: 내 유형과 맞는 칼럼 2개 */
  function columnTeaser(rep) {
    var list = recommended(rep.code, 2);
    return '<div class="sec-head" id="colTeaser" style="margin-top:34px"><h2>내 유형에 맞는 칼럼</h2><button class="link-btn" data-go="read">전체 ›</button></div>' +
      list.map(function (c) { return colCard(c, rep, true); }).join('');
  }

  function renderRead() {
    var rep = currentReport();
    if (!rep) { renderIntro(); return; }
    if (ui.readId) { renderColumn(ui.readId, rep); return; }

    var cats = [{ key: 'all', name: '전체', icon: '' }].concat(D.columnMeta.categories);
    if (!cats.some(function (c) { return c.key === ui.cat; })) ui.cat = 'all';
    var filt = cats.map(function (c) {
      return '<button class="fchip' + (ui.cat === c.key ? ' on' : '') + '" data-cat="' + c.key + '">' + (c.icon ? c.icon + ' ' : '') + esc(c.name) + '</button>';
    }).join('');

    var body = '';
    var readCount = Store.get().read.ids.length;
    if (ui.cat === 'all') {
      var rec = recommended(rep.code, 3), recIds = rec.map(function (c) { return c.id; });
      var rest = D.columns.filter(function (c) { return recIds.indexOf(c.id) === -1; });
      body = '<div class="sec-head" style="margin-top:18px"><h2>나를 위한 추천</h2><span class="count">' + esc(rep.code) + '</span></div>' +
        rec.map(function (c) { return colCard(c, rep, true); }).join('') +
        '<div class="sec-head"><h2>전체 칼럼</h2><span class="count">' + rest.length + '편</span></div>' +
        rest.map(function (c) { return colCard(c, rep, false); }).join('');
    } else {
      var items = D.columns.filter(function (c) { return c.cat === ui.cat; });
      body = '<div class="sec-head" style="margin-top:18px"><h2>' + esc(catOf(ui.cat).name) + '</h2><span class="count">' + items.length + '편</span></div>' +
        (items.length ? items.map(function (c) { return colCard(c, rep, colScore(c, rep.code) > 0); }).join('') : '<div class="empty-hint">아직 칼럼이 없어요</div>');
    }

    setScreen(
      '<div class="report-head"><span class="kicker">Expert Column</span><span class="report-no">읽은 글 ' + readCount + ' / ' + D.columns.length + '</span></div>' +
      '<h2 class="section-title">트러블 케어, 전문가와 함께 읽기</h2>' +
      '<p class="muted" style="margin-top:6px;font-size:13px">내 유형에 맞는 글부터 가볍게 읽어보세요.</p>' +
      '<div class="fchips" role="tablist">' + filt + '</div>' + body +
      '<p class="disclaimer" style="margin-top:22px">' + esc(C.copy.disclaimer) + '</p>' +
      '<p class="sample-note">' + esc(D.columnMeta.sampleNotice) + '</p>'
    );
    $$('.fchip').forEach(function (b) { b.onclick = function () { ui.cat = b.getAttribute('data-cat'); renderRead(); }; });
  }

  function renderColumn(id, rep) {
    var c = null;
    D.columns.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) { ui.readId = null; renderRead(); return; }
    var s = Store.get();
    if (s.read.ids.indexOf(id) === -1) { s.read.ids.push(id); Store.save(); }
    var cat = catOf(c.cat), au = D.columnMeta.authors[c.author];
    var body = c.body.map(function (b) {
      var h = b.h ? '<h3>' + esc(b.h) + '</h3>' : '';
      if (b.list) return h + '<ul>' + b.list.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>';
      return h + '<p>' + esc(b.p) + '</p>';
    }).join('');
    var go = c.link === 'cycle' ? { tab: 'cycle', tx: '내 주기 케어 보러 가기' } : { tab: 'care', tx: '오늘의 케어 미션 하러 가기' };
    var more = recommended(rep.code, 4).filter(function (x) { return x.id !== id; }).slice(0, 2);
    if (more.length < 2) more = D.columns.filter(function (x) { return x.id !== id; }).slice(0, 2);

    setScreen(
      '<button class="back-link" data-act="readback">‹ 칼럼 목록</button>' +
      '<article class="col-detail"><div class="col-top"><span class="chip">' + cat.icon + ' ' + esc(cat.name) + '</span>' + (colScore(c, rep.code) > 0 ? '<span class="chip accent">나와 맞아요</span>' : '') + '</div>' +
      '<h1>' + esc(c.title) + '</h1>' +
      '<div class="author-row"><span class="avatar" aria-hidden="true">' + esc(au.name.charAt(0)) + '</span><div><b>' + esc(au.name) + '</b><small>' + esc(au.role) + ' · ' + esc(au.org) + '</small></div><span class="rd-min">' + c.readMin + '분 읽기</span></div>' +
      '<p class="col-lead">' + esc(c.summary) + '</p>' +
      '<div class="col-body">' + body + '</div>' +
      '<div class="takeaway"><p class="kicker">Key Takeaways</p><ul>' + c.takeaways.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<button class="btn" data-go="' + go.tab + '" style="margin-top:20px">' + esc(go.tx) + ' ›</button>' +
      '</article>' +
      '<div class="sec-head"><h2>이어서 읽기</h2></div>' + more.map(function (x) { return colCard(x, rep, false); }).join('') +
      '<p class="disclaimer" style="margin-top:22px">' + esc(C.copy.disclaimer) + '</p>' +
      '<p class="sample-note">' + esc(D.columnMeta.sampleNotice) + '</p>'
    );
  }

  /* ---------------- 설정(시연 도구) ---------------- */
  function openSettings() {
    var s = Store.get(), rep = s.result;
    var opts = Engine.allCodes().map(function (c) {
      var r = Engine.buildReport(c);
      return '<option value="' + c + '"' + (rep && rep.code === c ? ' selected' : '') + '>' + c + ' · ' + esc(r.nickname) + '</option>';
    }).join('');
    openModal(
      '<h3>설정 · 시연 도구</h3><p class="s-sub">광고주 시연을 위한 도구예요. 실제 서비스에서는 숨길 수 있어요.</p>' +
      '<p class="s-group">유형 바꿔보기 (16유형 미리보기)</p>' +
      '<select id="selType" style="width:100%;height:46px;border-radius:14px;border:1.5px solid var(--line);padding:0 12px;font:inherit;background:#fff">' + opts + '</select>' +
      '<p class="s-group">시간 이동 (미션·스탬프 시연)</p>' +
      '<button class="btn ghost small" id="btnNextDay">다음 날로 넘기기 · 오늘 ' + esc(Store.today()) + '</button>' +
      '<p class="s-group">주기 샘플 기록 (주기 탭 시연)</p>' +
      '<select id="selCycle" style="width:100%;height:46px;border-radius:14px;border:1.5px solid var(--line);padding:0 12px;font:inherit;background:#fff">' +
        '<option value="">선택해서 샘플 기록 넣기</option><option value="calm">안정기 샘플</option><option value="prep">준비기 샘플</option><option value="window">예상 구간 샘플</option><option value="after">올라온 뒤 샘플</option><option value="none">주기 기록 모두 지우기</option></select>' +
      '<p class="s-group">초기화</p>' +
      '<button class="btn ghost small" id="btnRetest">테스트 다시 하기 (포인트·스탬프는 유지)</button>' +
      '<button class="btn ghost small danger" id="btnWipe">모든 기록 지우기</button>' +
      '<button class="btn dark small" id="btnClose" style="margin-top:16px">닫기</button>'
    );
    $('#selType').onchange = function () {
      var code = this.value, pct = {};
      D.axes.forEach(function (ax, i) { pct[code.charAt(i)] = 72; pct[ax.poles[0] === code.charAt(i) ? ax.poles[1] : ax.poles[0]] = 28; });
      s.result = { code: code, pct: pct, at: Store.today() }; Store.save();
      ui.blobCache = null; closeModal(); switchTab(ui.tab); toast('유형을 ' + code + ' 로 바꿨어요');
    };
    $('#btnNextDay').onclick = function () { s.dayOffset = (s.dayOffset || 0) + 1; Store.save(); closeModal(); switchTab(ui.tab === 'care' ? 'care' : ui.tab); toast('하루 뒤로 이동했어요 · ' + Store.today()); };
    $('#btnRetest').onclick = function () { Store.resetTest(); ui.blobCache = null; ui.friend = [null, null, null, null]; closeModal(); startTest(); };
    $('#btnWipe').onclick = function () {
      if (!window.confirm('이 브라우저에 저장된 결과·미션·포인트를 모두 지울까요?')) return;
      Store.wipeAll(); ui.blobCache = null; ui.friend = [null, null, null, null]; closeModal(); renderIntro();
    };
    $('#selCycle').onchange = function () {
      if (!this.value) return;
      Cycle.seed(this.value); ui.cyclePhase = null; closeModal();
      switchTab('cycle'); toast(this.value === 'none' ? '주기 기록을 지웠어요' : '샘플 기록을 넣었어요');
    };
    $('#btnClose').onclick = closeModal;
  }

  /* ---------------- 초기화 ---------------- */
  function init() {
    els.app = $('#app'); els.view = $('#view'); els.topbar = $('#topbar'); els.tabbar = $('#tabbar');
    els.toast = $('#toast'); els.modal = $('#modal'); els.chip = $('#pointsChip');
    $('#logoText').textContent = C.brand.name;
    $$('.tab').forEach(function (b) { b.onclick = function () { goTab(b.getAttribute('data-tab')); }; });
    /* 본문 안의 바로가기(data-go), 칼럼 열기(data-col), 목록으로(data-act) */
    els.view.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]'), col = e.target.closest('[data-col]'), act = e.target.closest('[data-act="readback"]');
      if (go) { goTab(go.getAttribute('data-go')); }
      else if (col) { openColumn(col.getAttribute('data-col')); }
      else if (act) { goTab('read'); }
    });
    $('#btnSettings').onclick = openSettings;

    /* 개발용 점검 (콘솔) */
    try { Engine.lint(); Engine.selfTest(); } catch (e) { console.warn(e); }

    applyDemoParams();
    /* 시연: ?cycle=calm|prep|window|after|none (샘플 기록을 덮어쓰므로 주소에 직접 넣었을 때만), ?col=c01 (칼럼 상세) */
    var qq = new URLSearchParams(location.search);
    if (['calm', 'prep', 'window', 'after', 'none'].indexOf(qq.get('cycle')) > -1) Cycle.seed(qq.get('cycle'));
    if (qq.get('col') && D.columns.some(function (c) { return c.id === qq.get('col'); })) ui.readId = qq.get('col');
    if (qq.get('cat') && qq.get('cat').length < 12) ui.cat = qq.get('cat');
    var s = Store.get();
    var q = new URLSearchParams(location.search);
    var tab = q.get('tab');
    /* ?start=N : N번 문항(1~16)에서 테스트 시작 (시연용) */
    var startQ = parseInt(q.get('start'), 10);
    if (startQ >= 1 && startQ <= D.questions.length) {
      startTest(); ui.qi = startQ - 1;
      for (var k = 0; k < ui.qi; k++) s.answers[k] = k % 2;
      renderQuestion(); return;
    }
    if (s.result && Engine.isValidCode(s.result.code)) enterApp(['know', 'cycle', 'care', 'read', 'share'].indexOf(tab) > -1 ? tab : 'know');
    else renderIntro();
    /* 시연: ?goto=요소 id (예: cycleTeaser, colTeaser) — 렌더 후 해당 위치로 스크롤 */
    var gt = qq.get('goto');
    if (gt && /^[A-Za-z][\w-]{0,30}$/.test(gt)) setTimeout(function () { var t = document.getElementById(gt); if (t) t.scrollIntoView({ block: 'start' }); }, 150);
  }

  /* 시연 바로가기: ?demo=SHIQ&tab=care&done=2
     - demo: 해당 유형 결과로 바로 진입 (명시적으로 주소에 넣었을 때만 결과를 덮어씀)
     - done: 오늘 미션 N개를 완료 상태로 시작 (포인트도 함께 적립) */
  function applyDemoParams() {
    var q = new URLSearchParams(location.search), code = (q.get('demo') || '').toUpperCase();
    if (!Engine.isValidCode(code)) return;
    var s = Store.get(), pct = {};
    D.axes.forEach(function (ax, i) { var d = code.charAt(i); pct[d] = [78, 66, 71, 83][i]; pct[ax.poles[0] === d ? ax.poles[1] : ax.poles[0]] = 100 - pct[d]; });
    s.result = { code: code, pct: pct, at: Store.today() };
    if (!s.startDate) s.startDate = Store.today();
    Store.save();
    var n = Math.max(0, Math.min(3, parseInt(q.get('done'), 10) || 0));
    if (n) {
      var rec = ensureDaily();
      while (rec.done.length < n) { var id = rec.ids[rec.done.length]; rec.done.push(id); Store.addPoints(C.points.perMission, 'demo'); }
      Store.save();
    }
  }

  window.TQApp = { toast: toast, switchTab: switchTab };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
