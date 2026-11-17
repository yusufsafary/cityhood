// Cityhood · shared behaviour
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var CFG = window.CITYHOOD || {};
  var ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

  /* footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* X links: hide until the handle exists */
  var xLinks = document.querySelectorAll("[data-x-link]");
  xLinks.forEach(function (a) {
    if (CFG.X_URL) {
      a.setAttribute("href", CFG.X_URL);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else {
      a.style.display = "none";
    }
  });
  var xSoon = document.querySelectorAll("[data-x-soon]");
  xSoon.forEach(function (el) {
    el.style.display = CFG.X_URL ? "none" : "";
  });

  /* OpenSea buttons */
  var osBtns = document.querySelectorAll("[data-opensea]");
  osBtns.forEach(function (btn) {
    if (CFG.OPENSEA_URL) {
      btn.setAttribute("href", CFG.OPENSEA_URL);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener");
    } else {
      btn.classList.add("is-disabled");
      btn.removeAttribute("href");
      btn.setAttribute("aria-disabled", "true");
      btn.textContent = "Drop page opens at mint";
    }
  });

  /* Registration cards: open form or closed panel, per config flag */
  function setupRegCard(stage, open) {
    var card = document.querySelector('[data-reg-card="' + stage + '"]');
    if (!card) return;
    var formWrap = card.querySelector(".reg-open");
    var closedPanel = card.querySelector(".reg-closed");
    if (open) {
      if (formWrap) formWrap.hidden = false;
      if (closedPanel) closedPanel.hidden = true;
    } else {
      if (formWrap) formWrap.hidden = true;
      if (closedPanel) closedPanel.hidden = false;
    }
    var form = card.querySelector("form.reg-form");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        submitRegistration(form, stage);
      });
    }
  }

  function formMsg(form, text, kind) {
    var msg = form.querySelector(".form-msg");
    if (!msg) return;
    msg.textContent = text;
    msg.className = "form-msg" + (kind ? " " + kind : "");
  }

  function submitRegistration(form, stage) {
    var addr = form.querySelector('input[name="wallet"]').value.trim();
    var xuser = form.querySelector('input[name="xusername"]').value.trim();
    if (!ADDR_RE.test(addr)) {
      formMsg(form, "Enter a valid EVM wallet address (0x, 40 hex characters).", "err");
      return;
    }
    if (!xuser) {
      formMsg(form, "Enter your X username so the follow and repost can be verified.", "err");
      return;
    }
    if (!CFG.REG_ENDPOINT) {
      formMsg(form, "Registration opens soon. Nothing was submitted.", "err");
      return;
    }
    formMsg(form, "Submitting...", "");
    fetch(CFG.REG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: stage, wallet: addr, x: xuser })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("bad status");
        formMsg(form, "Registration received. Winners are drawn by raffle after registration closes.", "ok");
        form.reset();
      })
      .catch(function () {
        formMsg(form, "Submission failed. Try again in a moment.", "err");
      });
  }

  setupRegCard("gtd", !!CFG.REG_GTD_OPEN);
  setupRegCard("wl", !!CFG.REG_WL_OPEN);

  /* Status checker */
  var checkBtn = document.getElementById("check-btn");
  var checkInput = document.getElementById("check-address");
  var checkResult = document.getElementById("check-result");
  if (checkBtn && checkInput && checkResult) {
    var runCheck = function () {
      var addr = checkInput.value.trim().toLowerCase();
      checkResult.className = "check-result show info";
      if (!ADDR_RE.test(addr)) {
        checkResult.innerHTML =
          '<div class="cr-title">Invalid address</div>' +
          "<p>Paste a full EVM wallet address, starting with 0x.</p>";
        return;
      }
      checkResult.innerHTML =
        '<div class="cr-title">Checking</div><p>Reading winner lists...</p>';
      fetch("/data/status.json", { cache: "no-store" })
        .then(function (r) {
          if (!r.ok) throw new Error("no list");
          return r.json();
        })
        .then(function (data) {
          var gtd = (data.gtd || []).map(function (x) { return String(x).toLowerCase(); });
          var wl = (data.wl || []).map(function (x) { return String(x).toLowerCase(); });
          var inGtd = gtd.indexOf(addr) !== -1;
          var inWl = wl.indexOf(addr) !== -1;
          if (gtd.length === 0 && wl.length === 0) {
            checkResult.className = "check-result show info";
            checkResult.innerHTML =
              '<div class="cr-title">Lists not published yet</div>' +
              "<p>Raffle runs after registration closes. Winner lists will appear here, and this checker will answer for any wallet.</p>";
          } else if (inGtd && inWl) {
            checkResult.className = "check-result show win-gtd";
            checkResult.innerHTML =
              '<div class="cr-title">GTD winner, WL winner</div>' +
              "<p>This wallet won both stages: one guaranteed free GTD mint (max 1) and WL access at $0.50 (max 2). Mint on OpenSea when your stage opens.</p>";
          } else if (inGtd) {
            checkResult.className = "check-result show win-gtd";
            checkResult.innerHTML =
              '<div class="cr-title">GTD winner</div>' +
              "<p>This wallet holds a guaranteed free mint slot, max 1 per wallet. Mint on OpenSea when the GTD stage opens.</p>";
          } else if (inWl) {
            checkResult.className = "check-result show win-wl";
            checkResult.innerHTML =
              '<div class="cr-title">WL winner</div>' +
              "<p>This wallet can mint in the WL stage at $0.50, max 2 per wallet. Mint on OpenSea when the WL stage opens.</p>";
          } else {
            checkResult.className = "check-result show info";
            checkResult.innerHTML =
              '<div class="cr-title">Not on the winner lists</div>' +
              "<p>No GTD or WL spot for this wallet. Public mint needs no registration: 2,833 supply at $1.50, max 3 per wallet, on OpenSea.</p>";
          }
        })
        .catch(function () {
          checkResult.className = "check-result show info";
          checkResult.innerHTML =
            '<div class="cr-title">Checker unavailable</div>' +
            "<p>Winner lists could not be loaded. Try again in a moment.</p>";
        });
    };
    checkBtn.addEventListener("click", runCheck);
    checkInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); runCheck(); }
    });
  }

  /* District grid interaction (homepage) */
  var cap = document.getElementById("dcap");
  var blocks = document.querySelectorAll("[data-block]");
  if (cap && blocks.length) {
    var capDefault = cap.innerHTML;
    var light = function (block) {
      blocks.forEach(function (b) { b.classList.remove("lit"); });
      if (!block.classList.contains("solid")) block.classList.add("lit");
      cap.innerHTML = "<strong>Block Nº " + block.getAttribute("data-block") +
        "</strong> · one of 4,333 · every block has an owner";
    };
    blocks.forEach(function (block) {
      block.addEventListener("mouseenter", function () { light(block); });
      block.addEventListener("focus", function () { light(block); });
      block.addEventListener("click", function () { light(block); });
    });
    var grid = document.querySelector(".dgrid");
    if (grid) {
      grid.addEventListener("mouseleave", function () {
        blocks.forEach(function (b) { b.classList.remove("lit"); });
        cap.innerHTML = capDefault;
      });
    }
  }

  /* Scroll reveal */
  var rvEls = document.querySelectorAll(".rv");
  setTimeout(function () { rvEls.forEach(function (el) { el.classList.add("in"); }); }, 1400);
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    rvEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    rvEls.forEach(function (el) { io.observe(el); });
  }
})();
