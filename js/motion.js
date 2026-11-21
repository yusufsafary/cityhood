// Cityhood · motion layer: reveal stagger, hero parallax, count-up, alloc bars.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* stagger: delay per element among .rv siblings */
  var rvs = document.querySelectorAll(".rv");
  var counters = {};
  rvs.forEach(function (el) {
    var p = el.parentNode;
    var key = p ? (p.className || "x") : "x";
    counters[key] = (counters[key] || 0) + 1;
    var d = Math.min((counters[key] - 1) * 0.07, 0.35);
    el.style.setProperty("--d", d.toFixed(2) + "s");
  });

  if (reduce) return;

  /* count-up for pure-number fact values */
  function countUp(el) {
    var raw = el.textContent.trim();
    if (!/^[0-9,]+$/.test(raw)) return;
    var target = parseInt(raw.replace(/,/g, ""), 10);
    if (!target) return;
    var comma = raw.indexOf(",") >= 0;
    var t0 = null, dur = 1000;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - k, 3);
      var v = Math.round(target * e);
      el.textContent = comma ? v.toLocaleString("en-US") : String(v);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    setTimeout(function () { el.textContent = comma ? target.toLocaleString("en-US") : String(target); }, 1500);
  }
  var facts = document.querySelector(".facts");
  if (facts && "IntersectionObserver" in window) {
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          facts.querySelectorAll(".f-val").forEach(countUp);
          fio.disconnect();
        }
      });
    }, { threshold: 0.4 });
    fio.observe(facts);
  }

  /* allocation bars fill on view */
  var bars = document.querySelectorAll(".abar-fill");
  if (bars.length && "IntersectionObserver" in window) {
    var bio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.width = e.target.style.getPropertyValue("--w");
          bio.unobserve(e.target);
        }
      });
    }, { threshold: 0.35 });
    bars.forEach(function (b) { bio.observe(b); });
  }

  /* hero parallax (transform only, rAF throttled) */
  var plate = document.querySelector(".hero-art .plate");
  if (plate && window.matchMedia("(hover: hover)").matches) {
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        if (y < 900) plate.style.transform = "translateY(" + Math.min(y * 0.045, 26).toFixed(1) + "px)";
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();

  /* safety: force hero entrance to its finished state */
  window.addEventListener("load", function () {
    setTimeout(function () { document.documentElement.classList.add("fx-done"); }, 1600);
  });
