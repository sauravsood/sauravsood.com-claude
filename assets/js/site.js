(function () {
  "use strict";

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lights: day match / night session ---------- */
  var root = document.documentElement;
  var lights = document.getElementById("lights");
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paintLights() {
    if (!lights) return;
    var dark = isDark();
    lights.textContent = dark ? "Lights off" : "Lights on";
    lights.setAttribute("aria-pressed", dark ? "true" : "false");
    lights.title = dark ? "Switch to a day match" : "Switch to a night session";
  }
  var saved = store.get("ss-theme");
  if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  paintLights();
  if (lights) lights.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store.set("ss-theme", next);
    paintLights();
  });

  /* ---------- The rally: a ball you hit with the cursor or a tap ---------- */
  var hero = document.querySelector(".hero");
  var canvas = document.getElementById("rally");
  if (hero && canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var rallyEl = document.getElementById("rally-count");
    var bestEl = document.getElementById("best-count");
    var hint = document.getElementById("hint");
    var W = 0, H = 0, dpr = 1;
    var R = 13;
    var ball = { x: 0, y: 0, vx: 0, vy: 0, spin: 0 };
    var rally = 0;
    var best = parseInt(store.get("ss-best-rally") || "0", 10) || 0;
    var lastHit = 0;
    var ptr = { x: -999, y: -999, vx: 0, vy: 0, t: 0, inside: false };
    var running = false;
    bestEl.textContent = best;

    function resize() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!ball.x) { ball.x = W * 0.72; ball.y = H * 0.22; }
      ball.x = Math.min(Math.max(ball.x, R), W - R);
      ball.y = Math.min(Math.max(ball.y, R), H - R);
      if (!running) draw();
    }

    function speed() { return Math.hypot(ball.vx, ball.vy); }

    function hit(fromX, fromY, power) {
      var dx = ball.x - fromX, dy = ball.y - fromY;
      var d = Math.hypot(dx, dy) || 1;
      var s = Math.min(Math.max(power, 7), 22);
      ball.vx = (dx / d) * s;
      ball.vy = (dy / d) * s;
      ball.spin = (Math.random() - 0.5) * 0.4;
      var now = performance.now();
      if (now - lastHit > 220) {
        rally += 1;
        rallyEl.textContent = rally;
        if (rally > best) { best = rally; bestEl.textContent = best; store.set("ss-best-rally", String(best)); }
        if (hint && rally === 1) hint.textContent = "keep it going…";
        if (hint && rally === 5) hint.textContent = "now you're playing";
        if (hint && rally === 15) hint.textContent = "ok, you can join my doubles team";
      }
      lastHit = now;
      start();
    }

    function local(e) {
      var r = hero.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    hero.addEventListener("pointermove", function (e) {
      var p = local(e), now = performance.now(), dt = Math.max(now - ptr.t, 1);
      ptr.vx = (p.x - ptr.x) / dt * 16; ptr.vy = (p.y - ptr.y) / dt * 16;
      ptr.x = p.x; ptr.y = p.y; ptr.t = now; ptr.inside = true;
      if (Math.hypot(ball.x - p.x, ball.y - p.y) < R + 22) hit(p.x, p.y, Math.hypot(ptr.vx, ptr.vy) + 6);
    });
    hero.addEventListener("pointerleave", function () { ptr.inside = false; });
    hero.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button")) return;
      var p = local(e);
      /* a tap swings at the ball from wherever you tapped */
      hit(p.x, p.y, 14);
    });

    function step() {
      ball.x += ball.vx; ball.y += ball.vy;
      ball.vx *= 0.988; ball.vy *= 0.988;
      ball.vx += ball.spin * 0.05; ball.spin *= 0.98;
      if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx) * 0.85; }
      if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx) * 0.85; }
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy) * 0.85; }
      if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy) * 0.85; }
      if (speed() < 0.35) {
        ball.vx = ball.vy = 0;
        if (rally > 0) {
          rally = 0; rallyEl.textContent = rally;
          if (hint) hint.textContent = "out! hit it again";
        }
        return false;
      }
      return true;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var s = speed();
      /* shadow */
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(ball.x + 5, ball.y + 7, R, R * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      /* motion trail */
      if (s > 4 && !reduceMotion) {
        ctx.strokeStyle = "rgba(216,240,60,.25)";
        ctx.lineWidth = R * 1.2; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x - ball.vx * 2.2, ball.y - ball.vy * 2.2);
        ctx.stroke();
      }
      /* ball */
      var g = ctx.createRadialGradient(ball.x - 4, ball.y - 5, 2, ball.x, ball.y, R);
      g.addColorStop(0, "#f1ff8a"); g.addColorStop(1, "#c4de1f");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();
      /* seam */
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(ball.x - R * 1.1, ball.y, R * 0.95, -0.75, 0.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(ball.x + R * 1.1, ball.y, R * 0.95, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke();
    }

    function loop() {
      var moving = step();
      draw();
      if (moving) requestAnimationFrame(loop); else running = false;
    }
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }

    window.addEventListener("resize", resize);
    resize();
    /* an opening serve, unless the visitor prefers stillness */
    if (!reduceMotion) { ball.vx = -5; ball.vy = 3.2; start(); }
  }

  /* ---------- Fitness: do a rep ---------- */
  var repBtn = document.getElementById("rep");
  var lifter = document.getElementById("lifter");
  if (repBtn) {
    var reps = 0, repCount = document.getElementById("rep-count");
    repBtn.addEventListener("click", function () {
      reps += 1; repCount.textContent = reps;
      if (lifter) { lifter.classList.add("down"); setTimeout(function () { lifter.classList.remove("down"); }, 180); }
    });
  }

  /* ---------- Dogs: pet or treat ---------- */
  var woof = document.getElementById("woof");
  var treatBtn = document.getElementById("treat");
  var lines = ["woof!", "WOOF", "more?", "good human", "*sniff*", "ball??"];
  var woofTimer;
  function bark(text) {
    if (!woof) return;
    woof.textContent = text || lines[Math.floor(Math.random() * lines.length)];
    woof.classList.add("on");
    clearTimeout(woofTimer);
    woofTimer = setTimeout(function () { woof.classList.remove("on"); }, 1100);
  }
  Array.prototype.forEach.call(document.querySelectorAll(".dog"), function (d) {
    var name = d.getAttribute("data-name");
    function pet() { bark(Math.random() < 0.5 ? name + ": woof!" : null); }
    d.addEventListener("click", pet);
    d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pet(); } });
  });
  if (treatBtn) {
    var treats = 0, treatCount = document.getElementById("treat-count");
    treatBtn.addEventListener("click", function () {
      treats += 1; treatCount.textContent = treats;
      bark(treats === 10 ? "best day ever" : treats % 2 ? "Bella: mine!" : "Cindy: mine!");
    });
  }
})();
