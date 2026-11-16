/* ============================================================
   character.js — 트러블 캐릭터 '딱이'(가제) SVG 모듈 조합
   · 형태축 = 몸 모양   H: 단단한 둥근 네모 / F: 말랑한 동그라미
   · 타이밍축 = 소품    R: 달력 배지 / S: 번개 배지
   · 요인축 = 배경      I: 달밤·구름 / E: 바람·퍼프
   · 대응축 = 표정(눈)  Q: 또렷한 눈 / W: 느긋한 눈
   · 미션 달성도 mood 0/1/2 = 뾰로통 / 보통 / 편안
   캐릭터를 없애거나 물리치는 연출은 없으며, 잘 돌보면 얌전해지는 설정입니다.
   색은 CSS 변수(--char-*)에서 읽어 와서, 이미지 저장 시에도 같은 색이 나옵니다.
   ============================================================ */
(function () {
  var FALLBACK = {
    body: '#FFD25E', shade: '#F2B93B', ink: '#2B3A42', blush: '#FF9FA8',
    bgI: '#DCE3F8', bgE: '#D6F1EB', moon: '#FFE9A8', star: '#AEBBEA',
    cloud: '#FFFFFF', prop: '#12A593', puff: '#FFD6DC', puff2: '#FFB3BE', wind: '#FFFFFF'
  };

  function cssVar(cs, name, fb) {
    var v = cs.getPropertyValue(name);
    v = v ? v.trim() : '';
    return v || fb;
  }

  function palette() {
    var cs = getComputedStyle(document.documentElement);
    var P = {};
    Object.keys(FALLBACK).forEach(function (k) { P[k] = cssVar(cs, '--char-' + k, FALLBACK[k]); });
    P.prop = cssVar(cs, '--char-prop', cssVar(cs, '--brand-primary', FALLBACK.prop));
    return P;
  }

  function background(c, P) {
    if (c === 'I') {
      return '<circle cx="100" cy="100" r="96" fill="' + P.bgI + '"/>' +
        '<circle cx="46" cy="50" r="15" fill="' + P.moon + '"/><circle cx="53" cy="45" r="13" fill="' + P.bgI + '"/>' +
        '<circle cx="82" cy="30" r="2.6" fill="' + P.star + '"/><circle cx="26" cy="92" r="2.2" fill="' + P.star + '"/>' +
        '<circle cx="176" cy="104" r="2.6" fill="' + P.star + '"/><circle cx="68" cy="68" r="1.8" fill="' + P.star + '"/>' +
        '<g fill="' + P.cloud + '"><ellipse cx="160" cy="160" rx="22" ry="9"/><circle cx="150" cy="153" r="9"/><circle cx="167" cy="151" r="11"/></g>';
    }
    return '<circle cx="100" cy="100" r="96" fill="' + P.bgE + '"/>' +
      '<g fill="none" stroke="' + P.wind + '" stroke-width="4" stroke-linecap="round">' +
      '<path d="M24 52 q14 -10 28 0 t28 0"/><path d="M118 168 q12 -8 24 0 t24 0"/><path d="M20 110 q10 -7 20 0 t20 0" opacity=".7"/></g>' +
      '<circle cx="42" cy="158" r="14" fill="' + P.puff + '"/><circle cx="42" cy="158" r="6.5" fill="' + P.puff2 + '"/>';
  }

  function prop(t, P) {
    var base = '<circle cx="152" cy="48" r="24" fill="#fff" stroke="' + P.prop + '" stroke-width="3"/>';
    if (t === 'R') {
      return base +
        '<rect x="140" y="37" width="24" height="22" rx="4" fill="none" stroke="' + P.prop + '" stroke-width="2.6"/>' +
        '<path d="M140 45 H164" stroke="' + P.prop + '" stroke-width="2.6"/>' +
        '<circle cx="147" cy="51" r="2" fill="' + P.prop + '"/><circle cx="152" cy="51" r="2" fill="' + P.prop + '"/>' +
        '<circle cx="157" cy="51" r="2" fill="' + P.body + '" stroke="' + P.prop + '" stroke-width="1"/>';
    }
    return base + '<path d="M155 32 L142 51 H151 L148 65 L163 45 H154 Z" fill="' + P.prop + '" stroke-linejoin="round"/>';
  }

  function body(s, P) {
    if (s === 'H') {
      return '<circle cx="42" cy="134" r="10" fill="' + P.shade + '"/><circle cx="158" cy="134" r="10" fill="' + P.shade + '"/>' +
        '<rect x="44" y="56" width="112" height="112" rx="32" fill="' + P.body + '"/>' +
        '<rect x="58" y="68" width="24" height="9" rx="4.5" fill="#fff" opacity=".5"/>';
    }
    return '<circle cx="40" cy="136" r="10" fill="' + P.shade + '"/><circle cx="160" cy="136" r="10" fill="' + P.shade + '"/>' +
      '<ellipse cx="100" cy="114" rx="62" ry="56" fill="' + P.body + '"/>' +
      '<ellipse cx="70" cy="80" rx="15" ry="7" fill="#fff" opacity=".5" transform="rotate(-28 70 80)"/>';
  }

  function eyes(r, mood, P) {
    var ink = P.ink, out = '', xs = [80, 120], y = 108;
    xs.forEach(function (cx) {
      if (mood === 2) { // 편안: 감은 눈
        out += r === 'Q'
          ? '<path d="M' + (cx - 8) + ' ' + (y + 2) + ' q8 -10 16 0" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>'
          : '<path d="M' + (cx - 8) + ' ' + (y - 1) + ' q8 9 16 0" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/>';
      } else if (r === 'Q') { // 또렷한 눈
        out += '<circle cx="' + cx + '" cy="' + y + '" r="7" fill="' + ink + '"/><circle cx="' + (cx - 2.2) + '" cy="' + (y - 2.4) + '" r="2.3" fill="#fff"/>';
      } else { // 느긋한 눈 (반쯤 감김)
        out += '<circle cx="' + cx + '" cy="' + y + '" r="7" fill="' + ink + '"/>' +
          '<rect x="' + (cx - 9) + '" y="' + (y - 9) + '" width="18" height="9" fill="' + P.body + '"/>' +
          '<path d="M' + (cx - 8.5) + ' ' + y + ' h17" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>';
      }
    });
    if (mood === 0) { // 뾰로통: 살짝 내려간 눈썹
      var dy = r === 'Q' ? 6 : 3;
      out += '<path d="M70 ' + (92) + ' L90 ' + (92 + dy) + '" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path d="M130 92 L110 ' + (92 + dy) + '" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round"/>';
    }
    return out;
  }

  function mouth(mood, P) {
    if (mood === 0) return '<path d="M91 136 q9 -7 18 0" fill="none" stroke="' + P.ink + '" stroke-width="3.6" stroke-linecap="round"/>';
    if (mood === 1) return '<path d="M92 130 q8 5 16 0" fill="none" stroke="' + P.ink + '" stroke-width="3.6" stroke-linecap="round"/>';
    return '<path d="M88 126 Q100 148 112 126 Z" fill="' + P.ink + '" stroke="' + P.ink + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="100" cy="137" rx="5.5" ry="3.2" fill="' + P.blush + '"/>';
  }

  function blush(mood, P) {
    var o = [0.3, 0.5, 0.95][mood];
    return '<ellipse cx="64" cy="124" rx="9" ry="5.5" fill="' + P.blush + '" opacity="' + o + '"/>' +
      '<ellipse cx="136" cy="124" rx="9" ry="5.5" fill="' + P.blush + '" opacity="' + o + '"/>';
  }

  var Char = {
    moodNames: ['뾰로통', '보통', '편안'],
    palette: palette,
    /* code: 4글자 유형 코드 / mood: 0~2 */
    svg: function (code, mood, opts) {
      opts = opts || {};
      mood = Math.max(0, Math.min(2, mood === undefined ? 1 : mood));
      var t = code.charAt(0), s = code.charAt(1), c = code.charAt(2), r = code.charAt(3);
      var P = palette();
      var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
      var ns = opts.standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
      return '<svg' + ns + ' viewBox="0 0 200 200"' + size + ' role="img" aria-label="나의 트러블 캐릭터 ' + Char.moodNames[mood] + ' 표정">' +
        background(c, P) +
        '<ellipse cx="100" cy="172" rx="46" ry="7" fill="rgba(0,0,0,.08)"/>' +
        '<g class="tq-float">' + body(s, P) + blush(mood, P) + eyes(r, mood, P) + mouth(mood, P) + '</g>' +
        prop(t, P) +
        '</svg>';
    },
    /* 달성 개수(0~3) → mood */
    moodFor: function (doneCount) { return doneCount >= 3 ? 2 : (doneCount >= 1 ? 1 : 0); }
  };

  window.TQChar = Char;
})();
