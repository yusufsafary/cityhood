// Cityhood · live layer: scroll progress, hero tilt, on-chain mint
// console, haul builder. Everything degrades gracefully: scheduled
// values are the fallback, chain reads only replace them when real.
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ scroll progress ============ */
  var prog = document.querySelector(".scroll-progress");
  if (prog) {
    var ticking = false;
    function upd() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      prog.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(upd); }
    }, { passive: true });
    upd();
  }

  /* ============ hero tilt ============ */
  var plate = document.querySelector(".plate-hero");
  if (plate && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    var hero = plate.closest(".hero");
    var raf = 0;
    hero.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = plate.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        plate.style.transform = "perspective(1100px) rotateY(" + (dx * 3.2).toFixed(2) + "deg) rotateX(" + (-dy * 3.2).toFixed(2) + "deg)";
      });
    });
    hero.addEventListener("pointerleave", function () { plate.style.transform = ""; });
  }

  /* ============ mint console ============ */
  var con = document.getElementById("mintconsole");
  if (con) {
    var NFT = "0x306073f5338Ca906de252A9Bf055ad72733820C3";
    var SEADROP = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";
    var RPC = "https://rpc.mainnet.chain.robinhood.com";
    var SUPPLY = 4333;
    var FALLBACK_START = 1795269600; /* 21 Nov 2026 14:00 UTC, verified on-chain */
    var startAt = FALLBACK_START;
    var el = function (n) { return con.querySelector("[data-con-" + n + "]"); };
    var dot = el("dot"), badge = el("badge"), label = el("label"), time = el("time"),
        sub = el("sub"), mintedEl = el("minted"), bar = el("bar"), left = el("left"),
        pct = el("pct"), price = el("price"), btn = el("btn");
    var pubState = document.querySelector("[data-pub-state]");

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function fmtClock(sec) {
      sec = Math.max(0, Math.floor(sec));
      var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600),
          m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return (d > 0 ? d + "d " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
    }
    function fmtNum(n) { return n.toLocaleString("en-US"); }

    function renderClock() {
      var now = Math.floor(Date.now() / 1000);
      var open = now >= startAt;
      if (open) {
        label.textContent = "Public mint is live";
        time.textContent = fmtClock(now - startAt);
        sub.textContent = "Open now on OpenSea via SeaDrop · FCFS until sold out";
        dot.classList.add("live");
        if (btn) { btn.textContent = "Mint on OpenSea"; btn.classList.remove("waiting"); }
        if (pubState) pubState.textContent = "Live now · OpenSea";
      } else {
        label.textContent = "Public opens in";
        time.textContent = fmtClock(startAt - now);
        sub.textContent = "Today · Saturday 21 November 2026 · 14:00 UTC · OpenSea via SeaDrop";
        if (btn) { btn.textContent = "Mint opens 14:00 UTC"; btn.classList.add("waiting"); }
        if (pubState) pubState.textContent = "Today · 14:00 UTC";
      }
    }
    renderClock();
    setInterval(renderClock, 250);

    function setMinted(n) {
      mintedEl.textContent = fmtNum(n);
      var p = Math.min(100, (n / SUPPLY) * 100);
      bar.style.width = p.toFixed(2) + "%";
      pct.textContent = (p < 0.1 && n > 0 ? "<0.1" : p.toFixed(1)) + "%";
      left.textContent = fmtNum(SUPPLY - n) + " blocks remain";
    }
    setMinted(0);

    function rpc(data, to) {
      return fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: to, data: data }, "latest"] })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.result || j.result === "0x") throw new Error("no result");
        return j.result;
      });
    }
    function word(hex, i) { return BigInt("0x" + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }

    function refresh() {
      rpc("0x18160ddd", NFT).then(function (res) {
        setMinted(Number(BigInt(res)));
        badge.textContent = "On-chain · Robinhood 4663";
        badge.classList.add("chain");
      }).catch(function () { /* keep scheduled state */ });
      var padded = "000000000000000000000000" + NFT.slice(2).toLowerCase();
      rpc("0xbc6a629c" + padded, SEADROP).then(function (res) {
        var priceWei = word(res, 0);
        var start = Number(word(res, 1));
        var maxW = Number(word(res, 3));
        if (start > 0) { startAt = start; renderClock(); }
        if (priceWei > 0n) {
          var eth = Number(priceWei) / 1e18;
          price.textContent = "$1.50 · " + eth.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") + " ETH · Max " + maxW;
        }
      }).catch(function () { /* keep fallback config */ });
    }
    refresh();
    setInterval(refresh, 30000);
  }

  /* ============ haul builder ============ */
  var haul = document.querySelector(".haul");
  if (haul) {
    var blocksEl = haul.querySelector("[data-haul-blocks]");
    var amtEl = haul.querySelector("[data-haul-amt]");
    var rows = haul.querySelectorAll("[data-haul]");
    function fmtNum(n) { return n.toLocaleString("en-US"); }
    function recalc() {
      var blocks = 0, amt = 0;
      rows.forEach(function (row) {
        var n = parseInt(row.querySelector("[data-n]").textContent, 10) || 0;
        blocks += n;
        amt += n * parseInt(row.getAttribute("data-rate"), 10);
        row.querySelector("[data-dec]").disabled = n <= 0;
        row.querySelector("[data-inc]").disabled = n >= parseInt(row.getAttribute("data-max"), 10);
      });
      blocksEl.textContent = fmtNum(blocks);
      amtEl.textContent = fmtNum(amt);
    }
    rows.forEach(function (row) {
      var nEl = row.querySelector("[data-n]");
      row.querySelector("[data-inc]").addEventListener("click", function () {
        var n = parseInt(nEl.textContent, 10) || 0;
        if (n < parseInt(row.getAttribute("data-max"), 10)) { nEl.textContent = n + 1; recalc(); }
      });
      row.querySelector("[data-dec]").addEventListener("click", function () {
        var n = parseInt(nEl.textContent, 10) || 0;
        if (n > 0) { nEl.textContent = n - 1; recalc(); }
      });
    });
    recalc();
  }
})();
