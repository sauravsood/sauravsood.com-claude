(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Her name: set once on <body data-her-name> ---------- */
  var herName = (document.body.getAttribute("data-her-name") || "").trim();
  if (herName) {
    Array.prototype.forEach.call(document.querySelectorAll(".her-name"), function (el) { el.textContent = herName; });
  }

  /* ---------- Photos: empty slot until the file exists; tap to enlarge ---------- */
  var box = document.getElementById("lightbox");
  var boxImg = document.getElementById("lightbox-img");
  Array.prototype.forEach.call(document.querySelectorAll(".photo"), function (fig) {
    var img = fig.querySelector("img");
    var frame = fig.querySelector(".frame");
    if (!img) return;
    function empty() { fig.classList.add("empty"); frame.setAttribute("aria-disabled", "true"); }
    img.addEventListener("error", empty);
    if (img.complete && !img.naturalWidth) empty();
    frame.addEventListener("click", function () {
      if (fig.classList.contains("empty") || !box || !box.showModal) return;
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt;
      box.showModal();
    });
  });
  if (box) box.addEventListener("click", function (e) { if (e.target === box) box.close(); });

  /* ---------- Her rally: one shot per tap ---------- */
  var shots = document.querySelectorAll("#shots li");
  var nextBtn = document.getElementById("next-shot");
  var resetBtn = document.getElementById("reset-shots");
  var countEl = document.getElementById("her-count");
  var endEl = document.getElementById("rally-end");
  var played = 0;
  var nextLabels = ["Next shot", "And another", "Keep going", "She's still going"];
  function paintRally() {
    countEl.textContent = played;
    for (var i = 0; i < shots.length; i++) shots[i].classList.toggle("on", i < played);
    var done = played >= shots.length;
    nextBtn.hidden = done;
    resetBtn.hidden = played === 0;
    endEl.hidden = !done;
    nextBtn.textContent = nextLabels[Math.min(Math.floor(played / 3), nextLabels.length - 1)];
  }
  if (nextBtn && shots.length) {
    nextBtn.addEventListener("click", function () { if (played < shots.length) { played += 1; paintRally(); } });
    resetBtn.addEventListener("click", function () { played = 0; paintRally(); nextBtn.focus(); });
    paintRally();
  }

  /* ---------- The bouquet: add a flower, it grows ---------- */
  var svg = document.getElementById("bouquet");
  if (svg) {
    var NS = "http://www.w3.org/2000/svg";
    var stems = document.getElementById("stems");
    var blooms = document.getElementById("blooms");
    var addBtn = document.getElementById("add-flower");
    var countF = document.getElementById("flower-count");
    var wordF = document.getElementById("flower-word");
    var msg = document.getElementById("bouquet-msg");
    var colours = ["#e2683f", "#d8a42a", "#f6a6b2", "#7b4b8f", "#f6f7f1", "#c0563a", "#e3fb4a"];
    var notes = {
      1: "That was my birthday effort.",
      2: "Better.",
      5: "Getting there.",
      11: "One for every shot in her rally.",
      20: "Still not enough.",
      36: "One for every year. Happy birthday.",
      60: "The vase is full. The point stands."
    };
    var MAX = 60;
    var n = 0;
    /* golden-angle spiral so the bouquet fills out evenly as it grows */
    function addFlower() {
      if (n >= MAX) return;
      var a = n * 2.39996, r = 8 + Math.sqrt(n) * 13;
      var x = 120 + Math.cos(a) * r * 1.15, y = 104 + Math.sin(a) * r * 0.8;
      var stem = document.createElementNS(NS, "path");
      stem.setAttribute("d", "M120 200 Q" + ((x + 120) / 2) + " " + (y + 40) + " " + x.toFixed(1) + " " + y.toFixed(1));
      stems.appendChild(stem);
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", reduceMotion ? "" : "bloom");
      var c = colours[n % colours.length];
      for (var p = 0; p < 5; p++) {
        var pa = p * 1.2566 + n;
        var petal = document.createElementNS(NS, "circle");
        petal.setAttribute("cx", (x + Math.cos(pa) * 6).toFixed(1));
        petal.setAttribute("cy", (y + Math.sin(pa) * 6).toFixed(1));
        petal.setAttribute("r", "6");
        petal.setAttribute("fill", c);
        petal.setAttribute("stroke", "#142238");
        petal.setAttribute("stroke-width", ".8");
        g.appendChild(petal);
      }
      var mid = document.createElementNS(NS, "circle");
      mid.setAttribute("cx", x.toFixed(1)); mid.setAttribute("cy", y.toFixed(1)); mid.setAttribute("r", "3.4");
      mid.setAttribute("fill", c === "#d8a42a" ? "#142238" : "#d8a42a");
      g.appendChild(mid);
      blooms.appendChild(g);
      n += 1;
      countF.textContent = n;
      wordF.textContent = n === 1 ? "flower" : "flowers";
      if (notes[n]) msg.textContent = notes[n];
      if (n >= MAX) { addBtn.disabled = true; addBtn.textContent = "Vase full"; }
    }
    addFlower();
    if (addBtn) addBtn.addEventListener("click", addFlower);
  }
})();
