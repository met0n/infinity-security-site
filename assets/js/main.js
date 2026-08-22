/* ==========================================================================
   INFINITY SECURITY — comportamento
   Sem dependências externas. Todo conteúdo existe sem JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------
     Navegação: estado no scroll, drawer mobile acessível
     ------------------------------------------------------------------ */
  function initNav() {
    var nav = document.querySelector('[data-nav]');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = nav.querySelector('[data-nav-toggle]');
    var drawer = document.querySelector('[data-nav-drawer]');
    if (!toggle || !drawer) return;

    var close = function (refocus) {
      toggle.setAttribute('aria-expanded', 'false');
      drawer.classList.remove('is-open');
      drawer.setAttribute('inert', '');
      document.body.classList.remove('nav-open');
      if (refocus) toggle.focus();
    };
    var open = function () {
      toggle.setAttribute('aria-expanded', 'true');
      drawer.classList.add('is-open');
      drawer.removeAttribute('inert');
      document.body.classList.add('nav-open');
      var first = drawer.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    };

    drawer.setAttribute('inert', '');
    toggle.addEventListener('click', function () {
      toggle.getAttribute('aria-expanded') === 'true' ? close(false) : open();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true);
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (e) {
      if (e.matches) close(false);
    });
  }

  /* ------------------------------------------------------------------
     Reveals de viewport — entrada escalonada por seção
     ------------------------------------------------------------------ */
  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     Accordions (FAQ) — altura animada, acessível
     ------------------------------------------------------------------ */
  function initAccordions() {
    document.querySelectorAll('[data-acc]').forEach(function (acc) {
      var buttons = acc.querySelectorAll('.acc__btn');
      buttons.forEach(function (btn) {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (!panel) return;

        if (btn.getAttribute('aria-expanded') !== 'true') {
          panel.style.height = '0px';
        } else {
          panel.style.height = 'auto';
        }

        btn.addEventListener('click', function () {
          var isOpen = btn.getAttribute('aria-expanded') === 'true';

          if (acc.hasAttribute('data-acc-single')) {
            buttons.forEach(function (other) {
              if (other === btn || other.getAttribute('aria-expanded') !== 'true') return;
              var op = document.getElementById(other.getAttribute('aria-controls'));
              other.setAttribute('aria-expanded', 'false');
              if (op) { op.style.height = op.scrollHeight + 'px'; requestAnimationFrame(function () { op.style.height = '0px'; }); }
            });
          }

          btn.setAttribute('aria-expanded', String(!isOpen));
          if (isOpen) {
            panel.style.height = panel.scrollHeight + 'px';
            requestAnimationFrame(function () { panel.style.height = '0px'; });
          } else {
            panel.style.height = panel.scrollHeight + 'px';
            panel.addEventListener('transitionend', function once(e) {
              if (e.propertyName !== 'height') return;
              panel.style.height = 'auto';
              panel.removeEventListener('transitionend', once);
            });
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Formulário de contato → mensagem estruturada no WhatsApp
     ------------------------------------------------------------------ */
  function initContactForm() {
    var form = document.querySelector('[data-wa-form]');
    if (!form) return;
    var phone = form.getAttribute('data-wa-phone');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var d = new FormData(form);
      var get = function (k) { return (d.get(k) || '').toString().trim(); };

      var linhas = [
        'Solicitação de avaliação — Infinity Security',
        '',
        'Nome: ' + get('nome'),
        'Empresa: ' + get('empresa'),
        'E-mail: ' + get('email'),
        'Serviço de interesse: ' + get('servico')
      ];
      if (get('mensagem')) linhas.push('', 'Contexto:', get('mensagem'));

      var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(linhas.join('\n'));
      var status = form.querySelector('[data-wa-status]');
      if (status) {
        status.hidden = false;
        status.textContent = 'Abrindo o WhatsApp com sua mensagem preenchida. Se a janela não abrir, verifique o bloqueio de pop-ups.';
      }
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ------------------------------------------------------------------
     Hero — o escudo da marca reconstruído ponto a ponto
     Os pontos vêm de shield-points.js, extraídos do SVG oficial do logo.
     ------------------------------------------------------------------ */
  function initShieldCanvas() {
    var canvas = document.querySelector('[data-shield-canvas]');
    var source = window.INFINITY_SHIELD_POINTS;
    if (!canvas || !source || !source.length || !canvas.getContext) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var W = 0, H = 0, dpr = 1, scale = 0, offX = 0, offY = 0, intensity = 1;
    var nodes = [], links = [];
    var running = false, rafId = null, start = 0, staticDrawn = false;

    // Distribui os índices em ondas de descoberta (de cima para baixo, com jitter)
    function buildNodes() {
      nodes = source.map(function (p, i) {
        var ang = (i * 2.399963) % (Math.PI * 2);      // ângulo áureo: dispersão homogênea
        var dist = 0.42 + ((i * 37) % 100) / 260;
        return {
          x: p[0], y: p[1], r: p[2],
          fx: 0.5 + Math.cos(ang) * dist,               // origem: fora do escudo
          fy: 0.5 + Math.sin(ang) * dist * 0.82,
          delay: p[1] * 620 + ((i * 53) % 100) * 3.2,   // ondas de cima para baixo
          phase: (i % 17) / 17 * Math.PI * 2
        };
      });

      // Conexões entre vizinhos próximos, pré-computadas uma única vez
      links = [];
      var maxD = 0.062, maxD2 = maxD * maxD;
      for (var i = 0; i < nodes.length; i++) {
        var count = 0;
        for (var j = i + 1; j < nodes.length && count < 2; j++) {
          var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < maxD2 && d2 > 0.00004) { links.push([i, j, Math.sqrt(d2) / maxD]); count++; }
        }
      }
    }

    var rect;
    function resize() {
      rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // O escudo é ancorado ao espaço que o layout reserva para ele,
      // o que mantém a composição correta em qualquer largura.
      var anchor = document.querySelector('[data-shield-anchor]');
      var wide = W >= 1000;
      var size, cx, cy;

      if (anchor) {
        var a = anchor.getBoundingClientRect();
        size = Math.min(a.width * 0.94, a.height * 0.94, wide ? W * 0.32 : W * 0.7);
        cx = a.left - rect.left + a.width / 2;
        cy = a.top - rect.top + a.height / 2;
      } else {
        size = wide ? Math.min(H * 0.60, W * 0.30) : Math.min(H * 0.5, W * 0.7);
        cx = wide ? W * 0.725 : W * 0.5;
        cy = H * 0.45;
      }

      scale = size;
      offX = cx - size / 2;
      offY = cy - size / 2;
      intensity = wide ? 1 : 0.85;
      return true;
    }

    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

    function draw(elapsed) {
      ctx.clearRect(0, 0, W, H);

      var DURATION = 1500;
      var progress = Math.max(0, Math.min(1, (elapsed - 400) / 2400));

      // Halo: a luz cresce conforme o escudo se forma
      if (progress > 0) {
        var cx = offX + scale / 2, cy = offY + scale / 2;
        var halo = ctx.createRadialGradient(cx, cy, scale * 0.06, cx, cy, scale * 0.92);
        halo.addColorStop(0, 'rgba(36,107,253,' + (0.20 * progress * intensity).toFixed(3) + ')');
        halo.addColorStop(0.55, 'rgba(36,107,253,' + (0.07 * progress * intensity).toFixed(3) + ')');
        halo.addColorStop(1, 'rgba(36,107,253,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(cx - scale, cy - scale, scale * 2, scale * 2);
      }
      var px = [], py = [], pa = [];

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var t = Math.max(0, Math.min(1, (elapsed - n.delay) / DURATION));
        var e = easeOut(t);
        var breathe = t >= 1 && !reduceMotion.matches
          ? Math.sin(elapsed / 2600 + n.phase) * 0.0022
          : 0;

        var nx = n.fx + (n.x - n.fx) * e;
        var ny = n.fy + (n.y - n.fy) * e + breathe;
        px[i] = offX + nx * scale;
        py[i] = offY + ny * scale;
        pa[i] = e;
      }

      // Conexões: aparecem quando os dois nós já assentaram
      ctx.lineWidth = 1;
      for (var k = 0; k < links.length; k++) {
        var a = links[k][0], b = links[k][1];
        var strength = Math.min(pa[a], pa[b]);
        if (strength < 0.94) continue;
        var alpha = (strength - 0.94) / 0.06 * 0.20 * (1 - links[k][2] * 0.55) * intensity;
        if (alpha <= 0.003) continue;
        ctx.strokeStyle = 'rgba(89,184,255,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(px[a], py[a]);
        ctx.lineTo(px[b], py[b]);
        ctx.stroke();
      }

      // Nós
      for (var m = 0; m < nodes.length; m++) {
        if (pa[m] <= 0.001) continue;
        var radius = Math.max(nodes[m].r * scale, 0.85);
        var alpha2 = (0.22 + pa[m] * 0.50) * intensity;
        ctx.fillStyle = 'rgba(105,192,255,' + alpha2.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(px[m], py[m], radius * (0.55 + pa[m] * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      return elapsed > DURATION + 1400;
    }

    function frame(now) {
      if (!running) return;
      if (!start) start = now;
      var settled = draw(now - start);
      // Depois de assentar, mantém apenas a respiração (barata) — ou congela
      if (settled && reduceMotion.matches) { running = false; rafId = null; return; }
      rafId = requestAnimationFrame(frame);
    }

    function play() {
      if (running || !scale) return;
      running = true;
      staticDrawn = false;
      rafId = requestAnimationFrame(frame);
    }
    function pause() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function drawStatic() {
      if (!scale) return;
      draw(99999);
      staticDrawn = true;
    }

    buildNodes();

    var booted = false;
    function sync() {
      if (!resize()) return;          // ainda sem layout: espera a próxima medição
      if (!booted) {
        booted = true;
        if (reduceMotion.matches) drawStatic(); else play();
        return;
      }
      // Redimensionamento posterior: recompõe sem reiniciar a narrativa
      if (running) draw(performance.now() - start);
      else drawStatic();
    }

    sync();

    if ('ResizeObserver' in window) {
      var roTimer;
      new ResizeObserver(function () {
        clearTimeout(roTimer);
        roTimer = setTimeout(sync, 120);
      }).observe(canvas);
    } else {
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sync, 160);
      }, { passive: true });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
      else if (!reduceMotion.matches && !staticDrawn) { start = 0; play(); }
    });

    // Pausa quando o hero sai da viewport
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            if (!reduceMotion.matches && !staticDrawn) play();
          } else {
            pause();
            if (!staticDrawn) drawStatic();
          }
        });
      }, { threshold: 0 }).observe(canvas);
    }

    reduceMotion.addEventListener('change', function (e) {
      if (e.matches) { pause(); drawStatic(); }
      else { staticDrawn = false; start = 0; play(); }
    });
  }

  /* ------------------------------------------------------------------
     Diagramas SVG: desenha o traçado quando entram na viewport
     ------------------------------------------------------------------ */
  function initDiagrams() {
    var diagrams = document.querySelectorAll('[data-diagram]');
    if (!diagrams.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      diagrams.forEach(function (d) { d.classList.add('is-drawn'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.22 });
    diagrams.forEach(function (d) { io.observe(d); });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function initYear() {
    var y = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = y; });
  }

  function boot() {
    initYear();
    initNav();
    initReveals();
    initAccordions();
    initContactForm();
    initDiagrams();
    initShieldCanvas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
