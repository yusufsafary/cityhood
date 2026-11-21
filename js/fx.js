// Cityhood · fx: live stage countdown, procedural city canvas, tier explorer.
// Every feature guards on its elements existing, so this file is safe on
// any page. Nothing here hides content: all blocks render by default.
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= countdown ================= */
  var cdRoot = document.querySelector("[data-countdown]");
  if (cdRoot) {
    var cdLabel = cdRoot.querySelector("[data-cd-label]");
    var cdStage = cdRoot.querySelector("[data-cd-stage]");
    var cdTime = cdRoot.querySelector("[data-cd-time]");
    var STAGES = [
      { label: "GTD opens in", stage: "Stage 01 · GTD · Free · Max 1", at: Date.UTC(2026, 10, 17, 16, 0, 0) },
      { label: "WL opens in", stage: "Stage 02 · WL · $0.50 · Max 2", at: Date.UTC(2026, 10, 17, 16, 30, 0) },
      { label: "Public opens in", stage: "Stage 03 · Public · $1.50 · Max 3", at: Date.UTC(2026, 10, 17, 17, 0, 0) }
    ];
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function fmt(ms) {
      var s = Math.max(0, Math.floor(ms / 1000));
      return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    }
    var lastShown = "";
    function tick() {
      var now = Date.now();
      var label, stage, time;
      var next = null;
      for (var i = 0; i < STAGES.length; i++) {
        if (STAGES[i].at > now) { next = STAGES[i]; break; }
      }
      if (next) {
        label = next.label;
        stage = next.stage;
        time = fmt(next.at - now);
      } else {
        label = "Public mint is live";
        stage = "Stage 03 · Public · $1.50 · Open now";
        time = fmt(now - STAGES[STAGES.length - 1].at);
      }
      if (time !== lastShown) {
        lastShown = time;
        if (cdTime) cdTime.textContent = time;
        if (cdLabel) cdLabel.textContent = label;
        if (cdStage) cdStage.textContent = stage;
      }
    }
    tick();
    setInterval(tick, 200);
  }

  /* ================= tier explorer ================= */
  var tierCards = document.querySelectorAll("[data-tier]");
  var readout = document.querySelector("[data-tier-readout]");
  if (tierCards.length && readout) {
    var TIERS = {
      block: {
        idx: "Plate 01 / 03",
        name: "Block",
        share: "Common · ≈70% of supply · ≈3,046 of 4,333",
        note: "Low-rise rows of lit windows and one lime corner store at street level. The everyday fabric of the grid, and the likeliest pull in the collection."
      },
      district: {
        idx: "Plate 02 / 03",
        name: "District",
        share: "Rare · ≈25% of supply · ≈1,063 of 4,333",
        note: "A tower cluster around a glowing lime plaza, beacon burning on one roof. Districts anchor their corner of the grid and read from across the city."
      },
      landmark: {
        idx: "Plate 03 / 03",
        name: "Landmark",
        share: "Legendary · ≈5% of supply · ≈224 of 4,333",
        note: "One monumental twisted tower rising over a full block grid, terraces lit in lime. The scarcest silhouette in the collection."
      }
    };
    var tiersWrap = readout.parentElement ? readout.closest(".tiers-wrap") : null;
    var grid = document.querySelector(".tiers");
    var rIdx = readout.querySelector('[data-tr="idx"]');
    var rName = readout.querySelector('[data-tr="name"]');
    var rShare = readout.querySelector('[data-tr="share"]');
    var rNote = readout.querySelector('[data-tr="note"]');
    function selectTier(card) {
      var key = card.getAttribute("data-tier");
      var data = TIERS[key];
      if (!data) return;
      tierCards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle("sel", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (grid) grid.classList.add("has-sel");
      if (rIdx) rIdx.textContent = data.idx;
      if (rName) rName.textContent = data.name;
      if (rShare) rShare.textContent = data.share;
      if (rNote) rNote.textContent = data.note;
      readout.classList.remove("flash");
      /* restart the readout tick animation */
      void readout.offsetWidth;
      readout.classList.add("flash");
    }
    tierCards.forEach(function (card) {
      card.addEventListener("click", function () { selectTier(card); });
      card.addEventListener("focus", function () { selectTier(card); });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          selectTier(card);
        }
      });
    });
    var firstSel = document.querySelector("[data-tier].sel") || tierCards[0];
    if (firstSel) selectTier(firstSel);
  }

  /* ================= procedural city canvas ================= */
  var canvas = document.getElementById("citycanvas");
  if (canvas && canvas.getContext) {
    var band = canvas.parentElement;
    var litEl = document.querySelector("[data-lit]");
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = 1;
    var staticLayer = document.createElement("canvas");
    var windows = [];
    var running = false, rafId = 0, inView = false;
    var wave = null, nextWaveAt = 0, frame = 0, lastLit = -1;
    var pointer = { x: -9999, y: -9999, active: false };
    band.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
      if (!running && inView && !document.hidden) start();
    });
    band.addEventListener("pointerleave", function () { pointer.active = false; });
    band.addEventListener("pointerdown", function (e) {
      var r = canvas.getBoundingClientRect();
      wave = { pos: (e.clientX - r.left) - 60, amp: 1 };
      if (!running && inView && !document.hidden) start();
    });

    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function buildScene() {
      W = band.clientWidth; H = band.clientHeight;
      if (!W || !H) return;
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      staticLayer.width = canvas.width;
      staticLayer.height = canvas.height;
      var sctx = staticLayer.getContext("2d");
      sctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      /* ground */
      var g = sctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#050605");
      g.addColorStop(1, "#0b0d09");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H);

      var rng = mulberry32(4663);
      windows = [];

      function quad(c2, pts, fill) {
        c2.beginPath();
        c2.moveTo(pts[0][0], pts[0][1]);
        for (var q = 1; q < pts.length; q++) c2.lineTo(pts[q][0], pts[q][1]);
        c2.closePath();
        c2.fillStyle = fill;
        c2.fill();
      }

      /* Skyline in three depth rows, back to front. Each building is a
         slab with a slanted top and side face; windows live on the front
         and side faces. Bodies and unlit windows go to the static layer;
         lit windows are redrawn per frame from the same quad data. */
      var rows = [
        { base: 0.50, scale: 0.60, front: "#0a0b08", side: "#060706", top: "#11140c", dim: 0.55 },
        { base: 0.71, scale: 0.80, front: "#0b0d09", side: "#070807", top: "#141810", dim: 0.8 },
        { base: 0.99, scale: 1.0, front: "#0d0f0a", side: "#080908", top: "#171b10", dim: 1 }
      ];
      var unit = W < 560 ? 30 : 44;
      for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        var baseY = H * row.base;
        var bw0 = unit * row.scale;
        var x = -bw0 * (0.3 + rng() * 0.5);
        while (x < W + bw0) {
          var bw = bw0 * (0.82 + rng() * 0.3);
          var maxLv = ri === 0 ? 8 : 6;
          var levels = 2 + Math.floor(Math.pow(rng(), 1.5) * maxLv);
          if (rng() < 0.05) levels = maxLv + 2; /* odd landmark */
          var lh = bw * 0.52;
          var bh = levels * lh;
          var dx = bw * 0.24, dy = -bw * 0.24;
          var topY = baseY - bh;
          /* side, top, front */
          quad(sctx, [[x + bw, topY], [x + bw + dx, topY + dy], [x + bw + dx, baseY + dy], [x + bw, baseY]], row.side);
          quad(sctx, [[x, topY], [x + dx, topY + dy], [x + bw + dx, topY + dy], [x + bw, topY]], row.top);
          quad(sctx, [[x, topY], [x + bw, topY], [x + bw, baseY], [x, baseY]], row.front);
          sctx.beginPath();
          sctx.moveTo(x, topY); sctx.lineTo(x + bw, topY);
          sctx.strokeStyle = "rgba(182,255,46,0.10)";
          sctx.lineWidth = 1;
          sctx.stroke();
          if (levels >= 7 && rng() < 0.7) { /* rooftop beacon mast */
            sctx.beginPath();
            sctx.moveTo(x + bw * 0.5, topY + dy * 0.4);
            sctx.lineTo(x + bw * 0.5, topY + dy * 0.4 - bw * 0.3);
            sctx.strokeStyle = "rgba(182,255,46,0.25)";
            sctx.stroke();
          }
          /* windows: front face grid + one side column */
          var cols = bw > 34 ? [0.16, 0.42, 0.68] : [0.2, 0.55];
          for (var j = 0; j < levels; j++) {
            for (var k = 0; k < cols.length; k++) {
              var wx = x + bw * cols[k];
              var wy = baseY - j * lh - lh * 0.66;
              var ww = bw * 0.13, wh = lh * 0.34;
              var pts = [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]];
              quad(sctx, pts, "rgba(182,255,46,0.05)");
              windows.push({
                pts: pts, s: x + ri * 70,
                on: rng() < 0.42, bright: (0.45 + rng() * 0.55) * row.dim,
                phase: rng() * Math.PI * 2, speed: 0.4 + rng() * 1.4
              });
            }
            /* side window */
            var sx = x + bw + dx * 0.35;
            var sy = baseY - j * lh - lh * 0.66 + dy * 0.35;
            var sw = bw * 0.09, sh = lh * 0.34;
            var spts = [[sx, sy], [sx + dx * 0.5, sy + dy * 0.5], [sx + dx * 0.5, sy + dy * 0.5 + sh], [sx, sy + sh]];
            quad(sctx, spts, "rgba(182,255,46,0.04)");
            windows.push({
              pts: spts, s: x + ri * 70 + 20,
              on: rng() < 0.3, bright: (0.4 + rng() * 0.5) * row.dim,
              phase: rng() * Math.PI * 2, speed: 0.4 + rng() * 1.2
            });
          }
          x += bw * (0.94 + rng() * 0.14);
        }
      }
      /* street glow along the front baseline */
      var gg = sctx.createLinearGradient(0, H * 0.9, 0, H);
      gg.addColorStop(0, "rgba(182,255,46,0)");
      gg.addColorStop(1, "rgba(182,255,46,0.07)");
      sctx.fillStyle = gg;
      sctx.fillRect(0, H * 0.9, W, H * 0.1);
    }

    function drawWindows(t, staticOnly) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticLayer, 0, 0);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var lit = 0;
      for (var i = 0; i < windows.length; i++) {
        var w = windows[i];
        var a = 0;
        if (w.on) a = w.bright * (0.82 + 0.18 * Math.sin(t * 0.001 * w.speed + w.phase));
        var hot = false;
        if (wave && !staticOnly) {
          var d = w.s - wave.pos;
          var boost = wave.amp * Math.exp(-(d * d) / (2 * 75 * 75));
          if (boost > 0.02) { a = Math.min(1, a + boost); hot = boost > 0.3; }
        }
        if (pointer.active && !staticOnly) {
          var pcx = (w.pts[0][0] + w.pts[2][0]) / 2;
          var pcy = (w.pts[0][1] + w.pts[2][1]) / 2;
          var pdx = pcx - pointer.x, pdy = pcy - pointer.y;
          var pb = 0.95 * Math.exp(-(pdx * pdx + pdy * pdy) / (2 * 95 * 95));
          if (pb > 0.02) { a = Math.min(1, a + pb); if (pb > 0.35) hot = true; }
        }
        if (a > 0.04) {
          if (a > 0.4) lit++;
          ctx.beginPath();
          var p = w.pts;
          ctx.moveTo(p[0][0], p[0][1]);
          ctx.lineTo(p[1][0], p[1][1]);
          ctx.lineTo(p[2][0], p[2][1]);
          ctx.lineTo(p[3][0], p[3][1]);
          ctx.closePath();
          ctx.fillStyle = hot
            ? "rgba(224,255,140," + a.toFixed(3) + ")"
            : "rgba(182,255,46," + a.toFixed(3) + ")";
          ctx.fill();
        }
      }
      if (litEl && lit !== lastLit) {
        lastLit = lit;
        litEl.textContent = String(lit);
      }
    }

    function loop(t) {
      if (!running) return;
      frame++;
      /* slow life: flip a few windows each frame */
      for (var n = 0; n < 6; n++) {
        var w = windows[(Math.random() * windows.length) | 0];
        if (w && Math.random() < 0.3) w.on = !w.on;
      }
      if (!wave && t > nextWaveAt) {
        wave = { pos: -220, amp: 0.95 };
      }
      if (wave) {
        wave.pos += Math.max(3.4, W / 340);
        wave.amp *= 0.998;
        if (wave.pos > W + 320) { wave = null; nextWaveAt = t + 4500 + Math.random() * 5500; }
      }
      drawWindows(t, false);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      nextWaveAt = performance.now() + 1200;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    function render() {
      buildScene();
      if (reduceMotion) {
        /* one still frame: a calm, partly lit city */
        drawWindows(1200, true);
      } else {
        /* always paint one real frame immediately, even before the
           animation loop starts, so the band never sits blank */
        drawWindows(performance.now(), false);
      }
    }

    var resizeTimer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 220);
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting;
          if (inView && !document.hidden) start(); else stop();
        });
      }, { rootMargin: "90px" });
      io.observe(band);
    } else {
      inView = true;
      start();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (inView) start();
    });

    render();
  }
})();
