/* ============================================================
   share.js — 유형 카드 9:16(1080×1920) 이미지 · 링크 복사 · Web Share
   Canvas 로 직접 그립니다. (외부 API·서버 전송 없음)
   ============================================================ */
(function () {
  var W = 1080, H = 1920;
  var C = window.TQ_CONFIG;

  function cssv(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fb;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 한글 줄바꿈: 공백 단위로 쌓고, 한 단어가 너무 길면 글자 단위로 자름 */
  function wrap(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW) { cur = t; return; }
      if (cur) lines.push(cur);
      cur = '';
      if (ctx.measureText(w).width > maxW) {
        w.split('').forEach(function (ch) {
          if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
        });
      } else cur = w;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function loadSvg(svg) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  var Share = {};

  Share.url = function (code) {
    var base = location.href.split('#')[0].split('?')[0];
    return base + '?ref=' + code;
  };

  Share.text = function (code, nick) {
    return '나의 TQ는 ' + code + ' · ' + nick + '! 내 트러블 성향, 딱 알려드림 (시안)';
  };

  /* 카드 렌더 → Promise<Blob> */
  Share.card = function (report, mood) {
    var font = getComputedStyle(document.body).fontFamily;
    var primary = cssv('--brand-primary', '#12A593');
    var deep = cssv('--brand-primary-deep', '#0B7F72');
    var soft = cssv('--brand-primary-soft', '#E5F6F3');
    var accent = cssv('--brand-accent', '#FFC93C');
    var ink = cssv('--ink', '#1F2A30');
    var muted = cssv('--muted', '#7A8890');
    var MOD = window.TQ_DATA.modules;

    var fontReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('900 60px ' + font), document.fonts.load('600 30px ' + font), document.fonts.ready]).catch(function () {})
      : Promise.resolve();

    var svg = window.TQChar.svg(report.code, mood === undefined ? 2 : mood, { size: 760, standalone: true });
    return Promise.all([fontReady, loadSvg(svg)]).then(function (res) {
      var art = res[1];
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // 배경
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, 1100);
      g.addColorStop(0, soft); g.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1100);

      // 상단 라벨
      ctx.textAlign = 'left';
      ctx.fillStyle = deep; ctx.font = '700 30px ' + font;
      ctx.fillText('RAPHAS Lab. · TQ REPORT', 80, 130);
      ctx.textAlign = 'right';
      ctx.fillStyle = ink; ctx.font = '900 34px ' + font;
      ctx.fillText(C.brand.name, W - 80, 130);
      ctx.fillStyle = muted; ctx.font = '600 26px ' + font;
      ctx.fillText('나의 TQ (시안)', W - 80, 168);

      // 캐릭터
      ctx.drawImage(art, (W - 760) / 2, 220, 760, 760);

      // 코드 박스
      var bw = 200, gap = 20, total = bw * 4 + gap * 3, x0 = (W - total) / 2, by = 1030;
      report.code.split('').forEach(function (p, i) {
        var x = x0 + i * (bw + gap);
        ctx.fillStyle = soft; rr(ctx, x, by, bw, 214, 40); ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = deep; ctx.font = '900 128px ' + font;
        ctx.fillText(p, x + bw / 2, by + 134);
        ctx.font = '700 30px ' + font;
        ctx.fillText(MOD[p].label, x + bw / 2, by + 188);
      });

      // 별명
      ctx.fillStyle = ink; ctx.font = '900 84px ' + font;
      ctx.fillText(report.nickname, W / 2, 1368);

      // 태그
      ctx.font = '700 32px ' + font;
      var tags = report.tags, tw = tags.map(function (t) { return ctx.measureText('#' + t).width + 56; });
      var tt = tw.reduce(function (a, b) { return a + b; }, 0) + 16 * (tags.length - 1), tx = (W - tt) / 2;
      tags.forEach(function (t, i) {
        ctx.fillStyle = soft; rr(ctx, tx, 1404, tw[i], 64, 32); ctx.fill();
        ctx.fillStyle = deep; ctx.textAlign = 'center';
        ctx.fillText('#' + t, tx + tw[i] / 2, 1448);
        tx += tw[i] + 16;
      });

      // 한 줄 요약
      ctx.fillStyle = '#44525B'; ctx.font = '600 36px ' + font;
      var lines = wrap(ctx, report.summary, 840).slice(0, 3);
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, 1546 + i * 56); });

      // 엔딩 카피 박스
      var gy = ctx.createLinearGradient(80, 0, W - 80, 0);
      gy.addColorStop(0, primary); gy.addColorStop(1, deep);
      ctx.fillStyle = gy; rr(ctx, 80, 1720, W - 160, 118, 59); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.font = '900 46px ' + font;
      ctx.fillText(C.copy.ending, W / 2, 1796);

      // 푸터
      ctx.fillStyle = muted; ctx.font = '600 26px ' + font;
      ctx.fillText(C.copy.powered, W / 2, 1886);

      return new Promise(function (resolve, reject) {
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
      });
    });
  };

  Share.download = function (blob, code) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'my-tq-' + code + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };

  Share.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  };
  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  Share.canNativeShare = function () { return !!navigator.share; };

  /* Web Share API: 이미지 파일 공유가 가능하면 파일 포함, 아니면 텍스트+링크 */
  Share.native = function (blob, code, nick) {
    var data = { title: '나의 TQ', text: Share.text(code, nick), url: Share.url(code) };
    try {
      var file = new File([blob], 'my-tq-' + code + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
    } catch (e) { /* 파일 공유 미지원 */ }
    return navigator.share(data);
  };

  window.TQShare = Share;
})();
