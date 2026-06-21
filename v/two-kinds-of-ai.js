/* =========================================================================
   "Two kinds of AI" — animated investment bubble plot (investor page)
   Self-contained inline SVG + vanilla JS. No dependencies.
   Matches semiqlassical-two-kinds-of-ai.pdf: capital floods low-precision AI;
   the high-precision physics corner (top-right) is open — Semiqlassical owns it.
   ========================================================================= */
(function () {
  "use strict";

  // ---- geometry ----
  var VBW = 1000, VBH = 620;
  var M = { l: 58, r: 96, t: 48, b: 58 };
  var PW = VBW - M.l - M.r;   // 846
  var PH = VBH - M.t - M.b;   // 514
  var DIVX = 0.55;

  function rx(x) { return M.l + x * PW; }
  function ry(y) { return M.t + (1 - y) * PH; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var COLOR = { ai: "#6F7BD6", sci: "#3FE0CE", target: "#FDB414" };

  // ---- data ----
  // x = precision (0-1), y = application (0-1), inv = $B (drives bubble size).
  // co = company line, $ = display figure (teal). tx/ty/ta = label title anchor.
  var DATA = [
    { id:"llm", title:"LLM / foundation models", co:"OpenAI · Anthropic · xAI", $:"$150B",
      family:"ai", x:0.065, y:0.06, inv:150, bits:"4–8 bit", basis:"aggregate private funding (est.)",
      ex:"OpenAI, Anthropic, xAI, Mistral", tx:305, ty:455, ta:"start", leader:true },
    { id:"datacenter", title:"AI data-center · FP4/FP8", co:"NVIDIA · hyperscalers", $:"$5.2T",
      family:"ai", x:0.105, y:0.17, inv:5200, bits:"4–8 bit", basis:"projected capex to 2030",
      ex:"NVIDIA (Blackwell), Microsoft, Google, Amazon", tx:305, ty:413, ta:"start", leader:true },
    { id:"photonic", title:"Photonic compute", co:"Lightmatter · Ayar Labs", $:"$2B",
      family:"ai", x:0.175, y:0.235, inv:2.5, bits:"~8 (analog)", basis:"cumulative VC (sector)",
      ex:"Lightmatter, Ayar Labs, Celestial AI", tx:305, ty:371, ta:"start", leader:true },
    { id:"analog", title:"Analog / in-memory", co:"Mythic · d-Matrix · EnCharge", $:"$1.2B",
      family:"ai", x:0.15, y:0.305, inv:1.2, bits:"low (analog)", basis:"cumulative VC (est.)",
      ex:"Mythic, d-Matrix, EnCharge AI", tx:305, ty:331, ta:"start", leader:true },
    { id:"neuromorphic", title:"Neuromorphic", co:"BrainChip · Innatera · Loihi", $:"$2.5B",
      family:"ai", x:0.125, y:0.38, inv:2.5, bits:"1–8 (spiking)", basis:"cumulative VC",
      ex:"BrainChip, Innatera, Intel Loihi", tx:305, ty:290, ta:"start", leader:true },
    { id:"physicsai", title:"Physics AI", co:"PhysicsX · Prometheus · Mistral", $:"$16B",
      family:"sci", x:0.205, y:0.88, inv:16, bits:"low–mod (NN surrogate)", basis:"2025–26 funding cluster",
      ex:"PhysicsX, Prometheus, Mistral (physics)", tx:176, ty:62, ta:"start" },
    { id:"quantum", title:"Quantum computing", co:"IBM · PsiQuantum · IonQ", $:"$12B",
      family:"sci", x:0.25, y:0.76, inv:12, bits:"noisy / low fidelity", basis:"2025 total investment",
      ex:"IBM, PsiQuantum, Quantinuum, IonQ", tx:238, ty:166, ta:"end" },
    { id:"drugdiscovery", title:"AI drug discovery", co:"Isomorphic · Xaira · Recursion", $:"$11B",
      family:"sci", x:0.32, y:0.685, inv:11, bits:"fp16/32 (ML)", basis:"2025 VC",
      ex:"Isomorphic Labs, Xaira, Recursion, Chai", tx:302, ty:160, ta:"start" },
    { id:"aiforscience", title:"AI-for-science", co:"Lila · EvolutionaryScale", $:"$3B",
      family:"sci", x:0.385, y:0.6, inv:3, bits:"fp16/32 (ML)", basis:"recent funding (est.)",
      ex:"Lila Sciences, EvolutionaryScale", tx:404, ty:250, ta:"start" },
    { id:"materials", title:"Materials informatics", co:"Citrine · Orbital Materials", $:"$800M",
      family:"sci", x:0.435, y:0.85, inv:0.8, bits:"fp32 (ML)", basis:"cumulative VC (est.)",
      ex:"Citrine Informatics, Orbital Materials", tx:426, ty:100, ta:"middle" },
    { id:"hpc", title:"HPC / scientific computing", co:"HPE Cray · Ansys · nat.l labs", $:"$57B",
      family:"sci", x:0.62, y:0.72, inv:57, bits:"64-bit", basis:"market size (2025)",
      ex:"HPE Cray, Ansys, national labs", tx:638, ty:196, ta:"start" },
    { id:"compchem", title:"Computational / quantum chemistry", co:"Schrödinger · XtalPi · Qubit", $:"$1.5B",
      family:"sci", x:0.66, y:0.905, inv:1.5, bits:"64-bit+", basis:"market / funding (est.)",
      ex:"Schrödinger, XtalPi, Qubit Pharmaceuticals", tx:616, ty:56, ta:"middle" },
    { id:"semiqlassical", title:"Semiqlassical · Attryx", family:"target", x:0.91, y:0.93, inv:null,
      bits:"~128-bit", basis:"position marker (not sized)", ex:"Attryx — high-precision physics ML",
      sub1:"high-precision physics ML — the open layer", sub2:"~128-bit · kernel-level · inspectable",
      tx:828, ty:146, ta:"middle" }
  ];

  // ---- bubble radius: proportional log scale across the real data range ----
  var LOGS = DATA.filter(function (d) { return d.inv != null; }).map(function (d) { return Math.log10(d.inv); });
  var LMIN = Math.min.apply(null, LOGS), LMAX = Math.max.apply(null, LOGS);
  var RMIN = 7, RMAX = 68;
  function radius(b) { return RMIN + (Math.log10(b) - LMIN) / (LMAX - LMIN) * (RMAX - RMIN); }

  var X_TICKS = [
    { x:0.065, t:"4–8 bit" }, { x:0.31, t:"16 / 32-bit" },
    { x:0.60, t:"64-bit" }, { x:0.90, t:"128-bit" }
  ];
  var Y_TICKS = [
    { y:0.06, t:"LLM / language" }, { y:0.36, t:"general & edge AI" },
    { y:0.66, t:"AI for science" }, { y:0.93, t:"physics AI" }
  ];

  function build(fig) {
    var s = [];
    s.push('<svg class="tk-svg" viewBox="0 0 ' + VBW + ' ' + VBH + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">');

    s.push('<defs><radialGradient id="tkGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' + COLOR.target + '" stop-opacity="0.55"/>' +
      '<stop offset="42%" stop-color="' + COLOR.target + '" stop-opacity="0.12"/>' +
      '<stop offset="100%" stop-color="' + COLOR.target + '" stop-opacity="0"/></radialGradient></defs>');

    // low/high precision divider (no background fill)
    s.push('<line class="tk-divider" x1="' + rx(DIVX) + '" y1="' + M.t + '" x2="' + rx(DIVX) +
      '" y2="' + (M.t + PH) + '" stroke="' + COLOR.sci + '" stroke-opacity="0.45" stroke-width="1" stroke-dasharray="3 5"/>');

    // axes
    s.push('<line class="tk-axis-line" x1="' + M.l + '" y1="' + (M.t + PH) + '" x2="' + (M.l + PW) + '" y2="' + (M.t + PH) + '"/>');
    s.push('<line class="tk-axis-line" x1="' + M.l + '" y1="' + M.t + '" x2="' + M.l + '" y2="' + (M.t + PH) + '"/>');

    // x ticks + gridlines
    X_TICKS.forEach(function (tk) {
      var X = rx(tk.x);
      s.push('<line class="tk-grid" x1="' + X + '" y1="' + M.t + '" x2="' + X + '" y2="' + (M.t + PH) + '"/>');
      s.push('<text class="tk-tick" x="' + X + '" y="' + (M.t + PH + 22) + '" text-anchor="middle">' + esc(tk.t) + '</text>');
    });
    s.push('<text class="tk-axis-label" x="' + (M.l + PW) + '" y="' + (M.t + PH + 44) + '" text-anchor="end">numerical precision → higher</text>');

    // y ticks (rotated)
    Y_TICKS.forEach(function (tk) {
      var Y = ry(tk.y);
      s.push('<text class="tk-ytick" x="18" y="' + Y + '" text-anchor="middle" transform="rotate(-90 18 ' + Y + ')">' + esc(tk.t) + '</text>');
    });

    // region labels
    s.push('<text class="tk-region-label" x="' + (M.l + PW + 18) + '" y="' + (M.t + PH / 2) +
      '" fill="' + COLOR.sci + '" fill-opacity="0.85" text-anchor="middle" transform="rotate(-90 ' +
      (M.l + PW + 18) + ' ' + (M.t + PH / 2) + ')">open · high precision</text>');
    s.push('<text class="tk-region-label" x="' + (M.l + 8) + '" y="' + (M.t + PH - 8) +
      '" fill="var(--faint)" text-anchor="start">crowded · low precision</text>');

    // bubbles, leaders, labels — sorted by x for the entrance stagger
    var order = DATA.slice().sort(function (a, b) { return a.x - b.x; });
    var n = order.length;
    order.forEach(function (d, i) {
      var cx = rx(d.x), cy = ry(d.y);
      var col = COLOR[d.family];
      var delay = (i / n * 0.9).toFixed(2) + "s";
      var r2 = (d.family === "target") ? 18 : radius(d.inv);

      // leader line (under the bubble)
      if (d.leader) {
        var ang = Math.atan2((d.ty - 4) - cy, (d.tx - 8) - cx);
        var ex = cx + Math.cos(ang) * r2, ey = cy + Math.sin(ang) * r2;
        s.push('<line class="tk-leader" x1="' + ex.toFixed(1) + '" y1="' + ey.toFixed(1) +
          '" x2="' + (d.tx - 8) + '" y2="' + (d.ty - 3) + '" stroke="' + col + '" stroke-opacity="0.4" stroke-width="1" style="--d:' + delay + '"/>');
      }

      // marker
      if (d.family === "target") {
        var LS = 48; // logo glyph marker size
        s.push('<g class="tk-star" data-id="' + d.id + '" style="--d:' + delay + '" role="img" aria-label="' + esc(d.title + ', ' + d.ex) + '">');
        s.push('<circle class="tk-star-glow" cx="' + cx + '" cy="' + cy + '" r="30" fill="url(#tkGlow)"/>');
        s.push('<image href="/v/assets/logo-mark.png" x="' + (cx - LS / 2) + '" y="' + (cy - LS / 2) + '" width="' + LS + '" height="' + LS + '" preserveAspectRatio="xMidYMid meet"/>');
        s.push('</g>');
      } else {
        s.push('<g class="tk-bubble" data-id="' + d.id + '" data-family="' + d.family + '" style="--d:' + delay + '" role="img" aria-label="' + esc(d.title + ', ' + d.ex + ', ' + d.$) + '">');
        s.push('<circle class="tk-fill" cx="' + cx + '" cy="' + cy + '" r="' + r2.toFixed(1) + '" fill="' + col + '" fill-opacity="0.2" stroke="' + col + '" stroke-opacity="0.75" stroke-width="1.4"/>');
        s.push('<circle cx="' + cx + '" cy="' + cy + '" r="2.3" fill="' + col + '"/>');
        s.push('</g>');
      }

      // label block
      var fam = d.family;
      if (fam === "target") {
        s.push('<text class="tk-title t" data-id="' + d.id + '" data-family="' + fam + '" x="' + d.tx + '" y="' + d.ty + '" text-anchor="' + d.ta + '" style="--d:' + delay + '">' + esc(d.title) + '</text>');
        s.push('<text class="tk-subw" data-id="' + d.id + '" data-family="' + fam + '" x="' + d.tx + '" y="' + (d.ty + 16) + '" text-anchor="' + d.ta + '" style="--d:' + delay + '">' + esc(d.sub1) + '</text>');
        s.push('<text class="tk-sub2" data-id="' + d.id + '" data-family="' + fam + '" x="' + d.tx + '" y="' + (d.ty + 31) + '" text-anchor="' + d.ta + '" style="--d:' + delay + '">' + esc(d.sub2) + '</text>');
      } else {
        s.push('<text class="tk-title" data-id="' + d.id + '" data-family="' + fam + '" x="' + d.tx + '" y="' + d.ty + '" text-anchor="' + d.ta + '" style="--d:' + delay + '">' + esc(d.title) + '</text>');
        s.push('<text class="tk-sub" data-id="' + d.id + '" data-family="' + fam + '" x="' + d.tx + '" y="' + (d.ty + 14) + '" text-anchor="' + d.ta + '" style="--d:' + delay + '">' + esc(d.co) + ' · <tspan class="inv">' + esc(d.$) + '</tspan></text>');
      }
    });

    s.push('</svg>');

    // screen-reader table
    s.push('<table class="tk-sr"><caption>AI compute categories by numerical precision, application, and investment</caption>' +
      '<thead><tr><th>Category</th><th>Examples</th><th>Precision</th><th>Investment</th></tr></thead><tbody>');
    DATA.forEach(function (d) {
      s.push('<tr><td>' + esc(d.title) + '</td><td>' + esc(d.ex) + '</td><td>' + esc(d.bits) + '</td><td>' + (d.$ || "position marker") + '</td></tr>');
    });
    s.push('</tbody></table>');

    fig.insertAdjacentHTML("afterbegin", s.join(""));
  }

  // ---- tooltip ----
  function wireTooltip(fig) {
    var tip = document.createElement("div");
    tip.className = "tk-tip";
    document.body.appendChild(tip);
    var byId = {}; DATA.forEach(function (d) { byId[d.id] = d; });

    function show(id, ev) {
      var d = byId[id]; if (!d) return;
      tip.innerHTML = '<span class="t-name">' + esc(d.title) + '</span>' +
        '<span class="t-co">' + esc(d.ex) + '</span><br>' +
        '<span class="t-inv">' + (d.$ ? esc(d.$) : "high-precision position") + '</span>' +
        (d.$ ? ' · ' + esc(d.basis) : "") +
        '<span class="t-meta">precision: ' + esc(d.bits) + '</span>';
      tip.classList.add("show");
      move(ev);
    }
    function move(ev) {
      var px = (ev.touches ? ev.touches[0].clientX : ev.clientX);
      var py = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var x = px + 16, y = py + 16;
      if (x + w > window.innerWidth - 8) x = px - w - 16;
      if (y + h > window.innerHeight - 8) y = py - h - 16;
      tip.style.left = Math.max(8, x) + "px";
      tip.style.top = Math.max(8, y) + "px";
    }
    function hide() { tip.classList.remove("show"); }

    fig.querySelectorAll(".tk-bubble,.tk-star").forEach(function (g) {
      var id = g.getAttribute("data-id");
      g.addEventListener("mouseenter", function (e) { show(id, e); });
      g.addEventListener("mousemove", move);
      g.addEventListener("mouseleave", hide);
      g.addEventListener("click", function (e) { e.stopPropagation(); show(id, e); });
    });
    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, { passive: true });
  }

  // ---- legend isolate toggles ----
  function wireLegend(fig) {
    var legend = fig.querySelector(".tk-legend");
    if (!legend) return;
    legend.querySelectorAll(".tk-leg").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fam = btn.getAttribute("data-family");
        var nowOff = btn.classList.toggle("off");
        fig.classList.add("iso");
        fig.querySelectorAll('[data-family="' + fam + '"]').forEach(function (el) {
          el.classList.toggle("dim", nowOff);
        });
        if (!legend.querySelector(".tk-leg.off")) fig.classList.remove("iso");
      });
    });
  }

  // ---- entrance on scroll into view ----
  function wireReveal(fig) {
    fig.classList.add("tk-anim");
    if (!("IntersectionObserver" in window)) { fig.classList.add("in"); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { fig.classList.add("in"); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(fig);
  }

  function init() {
    var fig = document.getElementById("tk-fig");
    if (!fig || fig.dataset.built) return;
    fig.dataset.built = "1";
    build(fig);
    wireReveal(fig);
    wireTooltip(fig);
    wireLegend(fig);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
