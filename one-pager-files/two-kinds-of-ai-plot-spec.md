# Build Spec — "Two Kinds of AI" Interactive Plot (Investor Page)

A dynamic, on-brand bubble plot for the **investor page**. Each bubble is a compute/AI category,
positioned by **precision (x)** and **application (y)**, sized by **investment**, and labeled with
**example companies**. Semiqlassical · Attryx sits alone in the open high-precision physics corner.

> Reference render: `semiqlassical-two-kinds-of-ai.(png|pdf)` — build to match this. Data:
> `plot_data.json` (embedded below too).
> This page is **noindex** (see invest-page spec); the plot adds no indexable content.

---

## 1. The thesis the plot must land (read before building)

Do **not** title or frame this as "physics AI is unfunded" — that's false and an investor will
instantly counter with PhysicsX ($300M @ $2.4B) and Prometheus ($12B). The real, defensible point
is about **precision**:

> Capital floods **low-precision** AI. Even *physics AI* (PhysicsX, Prometheus, Mistral) runs on
> **low-precision neural surrogates** that approximate the physics. The **high-precision** layer
> that actually computes it — kernel-level, ~128-bit — is the open frontier. **Semiqlassical owns it.**

So the emptiness is the **right side of the x-axis (high precision)**, across every application —
and especially the top-right (high precision × physics). The whole figure is an argument that the
differentiator is **precision**, not "doing physics."

---

## 2. Axes & encodings

| Channel | Encodes | Notes |
|---|---|---|
| **x** | numerical precision, low → high | categorical scale, 0–1. Ticks: `4–8 bit` (0.07), `16/32-bit` (0.31), `64-bit` (0.60), `128-bit` (0.90). Label: "NUMERICAL PRECISION → HIGHER". |
| **y** | application, language → physical world | 0–1. Ticks: `LLM / language AI` (0.06), `general & edge AI` (0.36), `AI for science` (0.66), `physics AI` (0.93). Label: "APPLICATION → PHYSICAL WORLD". |
| **bubble area** | investment (USD) | **log-scaled**, illustrative. `r = 12 + 15·max(log10(invB), 0)` (px at desktop). Floor so sub-$1B dots stay visible. |
| **color** | family | `ai` = low-precision compute → violet/blue `#6F7BD6`; `sci` = science/physics applications → teal `#3FE0CE`; `target` = orange `#FDB414`. |
| **highlight** | target | Semiqlassical is an orange **star with glow**, not a sized bubble (it's a position, not a capital figure). Label always visible. |

Both axes are **approximate category placements**, not measured coordinates — say so in the
caption. The pattern is the message, not exact x/y.

### Regions / annotations
- Shade the **high-precision region** (x > ~0.55) with a subtle left→right teal gradient
  (`rgba(63,224,206,0→0.11)`) and a dashed vertical divider at x≈0.55. Right-margin vertical
  label: **"OPEN · HIGH PRECISION"** (teal). Bottom-left label: **"CROWDED · LOW PRECISION"** (muted).
- Caption (small, mono, faint): *"Bubble area = investment, log-scaled (illustrative). Basis
  varies: AI data-center = capex to 2030; physics-AI/quantum/drug = 2025 funding; HPC = market
  size. Axis positions are approximate category placements."*

---

## 3. Interactivity (this is why it's dynamic, not a static image)

- **Hover / tap a bubble →** tooltip showing: `label` · example companies · investment (formatted
  `$Xx.xT/B/M`) · investment basis · precision bits · one-line source. (Company names live here so
  the plot stays uncluttered at small sizes; on desktop, also show the short label + companies as a
  static caption under each bubble as in the reference render.)
- **Legend toggles** (optional): click a family in the legend to fade/isolate `low-precision AI`
  vs `science/physics` — lets a partner see "all the money is one color, in one place."
- **Semiqlassical** pulses gently (slow glow) to draw the eye; respects reduced-motion.
- **Responsive:** on mobile (<700px) drop the per-bubble static captions, keep tooltips, shrink
  font/markers, and let the plot scroll-snap or fit width. Never clip the Semiqlassical label.
- **`prefers-reduced-motion`:** disable the pulse and any entrance transitions.
- **Accessibility:** the plot needs a text fallback — render the data table (Section 5) in a
  visually-hidden `<table>` or `<figcaption>` so it's screen-reader legible; bubbles get
  `role="img"` + `aria-label` = "{label}, {examples}, {investment}".

---

## 4. Styling (match Attryx house style; fall back to these tokens)

**First choice:** if the Attryx site already has a chart/plot component (the mission & science
pages render plots dynamically), **reuse it** — same library, axis style, tooltip, type, and color
treatment — and just feed it this data. House-style consistency matters more than my tokens.

If there's no shared component, use these brand tokens (same as the rest of the dark one-pager
system):

```css
--bg:#07070A; --ink:#ECECEF; --mut:#9A9AA6; --faint:#5A5A64;
--line:rgba(255,255,255,0.10);
--ai:#6F7BD6;      /* low-precision AI/compute bubbles */
--sci:#3FE0CE;     /* science/physics bubbles + axes accents */
--target:#FDB414;  /* Semiqlassical */
--disp:'Space Grotesk'; --sans:'Inter'; --mono:'JetBrains Mono';
```
- Title in Space Grotesk 700; axis ticks & captions in JetBrains Mono; labels/tooltips in Inter.
- Bubbles: fill at ~0.20 opacity, 1.4px stroke at ~0.75 opacity in the family color, plus a 2.3px
  solid center dot. Transparent background; dark page shows through.
- Keep it flat and quiet — no drop shadows except the Semiqlassical glow.

---

## 5. Data

Authoritative dataset (also in `plot_data.json`). `investment_usd_b` is in **$ billions**;
`precision_x` / `application_y` are 0–1 plot coordinates. Treat figures as **directional**;
several are estimates and bases differ (see `investment_basis`).

| label | family | precision | x | y | invest ($B) | basis | examples |
|---|---|---|---|---|---|---|---|
| LLM / foundation models | ai | 4–8 bit | 0.065 | 0.06 | 150 | aggregate private (est.) | OpenAI, Anthropic, xAI, Mistral |
| AI data-center compute · FP4/FP8 | ai | 4–8 bit | 0.105 | 0.17 | 5200 | capex to 2030 | NVIDIA (Blackwell), hyperscalers |
| Photonic compute | ai | ~8 (analog) | 0.175 | 0.235 | 2.5 | cumulative VC | Lightmatter, Ayar Labs, Celestial AI |
| Analog / in-memory | ai | low (analog) | 0.15 | 0.305 | 1.2 | cumulative VC (est.) | Mythic, d-Matrix, EnCharge |
| Neuromorphic | ai | 1–8 (spiking) | 0.125 | 0.38 | 2.5 | cumulative VC | BrainChip, Innatera, Intel Loihi |
| Physics AI · Large Physics Models | sci | low–mod (NN surrogate) | 0.205 | 0.88 | 16 | 2025–26 funding | PhysicsX, Prometheus, Mistral |
| Quantum computing | sci | noisy / low fidelity | 0.25 | 0.76 | 12 | 2025 total | IBM, PsiQuantum, IonQ, Quantinuum |
| AI drug discovery | sci | fp16/32 (ML) | 0.32 | 0.685 | 11 | 2025 VC | Isomorphic, Xaira, Recursion, Chai |
| AI-for-science platforms | sci | fp16/32 (ML) | 0.385 | 0.60 | 3 | recent (est.) | Lila Sciences, EvolutionaryScale |
| Materials informatics | sci | fp32 (ML) | 0.435 | 0.85 | 0.8 | cumulative VC (est.) | Citrine, Orbital Materials |
| HPC / scientific computing | sci | 64-bit | 0.62 | 0.72 | 57 | market size | HPE Cray, Ansys, national labs |
| Computational / quantum chemistry | sci | 64-bit+ | 0.66 | 0.905 | 1.5 | market/funding (est.) | Schrödinger, XtalPi, Qubit Pharma |
| **Semiqlassical · Attryx** | **target** | **~128-bit** | **0.91** | **0.93** | *(marker)* | position | **Attryx** |

```json
[
  {
    "id": "llm",
    "label": "LLM / foundation models",
    "family": "ai",
    "precision_bits": "4\u20138",
    "precision_x": 0.065,
    "application_y": 0.06,
    "investment_usd_b": 150,
    "investment_basis": "aggregate private funding (est.)",
    "examples": [
      "OpenAI",
      "Anthropic",
      "xAI",
      "Mistral"
    ],
    "source": "widely reported; aggregate estimate"
  },
  {
    "id": "datacenter",
    "label": "AI data-center compute \u00b7 FP4/FP8",
    "family": "ai",
    "precision_bits": "4\u20138",
    "precision_x": 0.105,
    "application_y": 0.17,
    "investment_usd_b": 5200,
    "investment_basis": "projected capex to 2030",
    "examples": [
      "NVIDIA (Blackwell)",
      "Microsoft",
      "Google",
      "Amazon"
    ],
    "source": "McKinsey, $5.2T AI data-center capex by 2030"
  },
  {
    "id": "photonic",
    "label": "Photonic compute",
    "family": "ai",
    "precision_bits": "~8 (analog)",
    "precision_x": 0.175,
    "application_y": 0.235,
    "investment_usd_b": 2.5,
    "investment_basis": "cumulative VC (sector)",
    "examples": [
      "Lightmatter",
      "Ayar Labs",
      "Celestial AI",
      "Lightelligence"
    ],
    "source": "Lightmatter ~$850M, Ayar ~$375M, Celestial ~$339M"
  },
  {
    "id": "analog",
    "label": "Analog / in-memory",
    "family": "ai",
    "precision_bits": "low (analog)",
    "precision_x": 0.15,
    "application_y": 0.305,
    "investment_usd_b": 1.2,
    "investment_basis": "cumulative VC (est.)",
    "examples": [
      "Mythic",
      "d-Matrix",
      "EnCharge AI"
    ],
    "source": "company rounds, aggregate estimate"
  },
  {
    "id": "neuromorphic",
    "label": "Neuromorphic",
    "family": "ai",
    "precision_bits": "1\u20138 (spiking)",
    "precision_x": 0.125,
    "application_y": 0.38,
    "investment_usd_b": 2.5,
    "investment_basis": "cumulative VC",
    "examples": [
      "BrainChip",
      "Innatera",
      "Intel Loihi",
      "Unconventional AI"
    ],
    "source": "~$1.1B VC in 2025; $5B+ non-GPU AI HW 2024\u201326"
  },
  {
    "id": "physicsai",
    "label": "Physics AI \u00b7 Large Physics Models",
    "family": "sci",
    "precision_bits": "low\u2013mod (NN surrogate)",
    "precision_x": 0.205,
    "application_y": 0.88,
    "investment_usd_b": 16,
    "investment_basis": "2025\u201326 funding cluster",
    "examples": [
      "PhysicsX",
      "Prometheus",
      "Mistral (physics)"
    ],
    "source": "PhysicsX $300M @ $2.4B; Prometheus $12B; ~$15.8B in one week"
  },
  {
    "id": "quantum",
    "label": "Quantum computing",
    "family": "sci",
    "precision_bits": "noisy / low fidelity",
    "precision_x": 0.25,
    "application_y": 0.76,
    "investment_usd_b": 12,
    "investment_basis": "2025 total investment",
    "examples": [
      "IBM",
      "PsiQuantum",
      "Quantinuum",
      "IonQ"
    ],
    "source": "quantum-computing investment ~$12.6B (2025)"
  },
  {
    "id": "drugdiscovery",
    "label": "AI drug discovery",
    "family": "sci",
    "precision_bits": "fp16/32 (ML)",
    "precision_x": 0.32,
    "application_y": 0.685,
    "investment_usd_b": 11,
    "investment_basis": "2025 VC",
    "examples": [
      "Isomorphic Labs",
      "Xaira",
      "Recursion",
      "Chai Discovery"
    ],
    "source": "DealForma: 348 rounds, $11B in 2025"
  },
  {
    "id": "aiforscience",
    "label": "AI-for-science platforms",
    "family": "sci",
    "precision_bits": "fp16/32 (ML)",
    "precision_x": 0.385,
    "application_y": 0.6,
    "investment_usd_b": 3,
    "investment_basis": "recent funding (est.)",
    "examples": [
      "Lila Sciences",
      "EvolutionaryScale"
    ],
    "source": "Lila $500M+, EvolutionaryScale $142M"
  },
  {
    "id": "materials",
    "label": "Materials informatics",
    "family": "sci",
    "precision_bits": "fp32 (ML)",
    "precision_x": 0.435,
    "application_y": 0.85,
    "investment_usd_b": 0.8,
    "investment_basis": "cumulative VC (est.)",
    "examples": [
      "Citrine Informatics",
      "Orbital Materials"
    ],
    "source": "company rounds, aggregate estimate"
  },
  {
    "id": "hpc",
    "label": "HPC / scientific computing",
    "family": "sci",
    "precision_bits": "64-bit",
    "precision_x": 0.62,
    "application_y": 0.72,
    "investment_usd_b": 57,
    "investment_basis": "market size (2025)",
    "examples": [
      "HPE Cray",
      "Ansys",
      "national labs (Frontier, El Capitan)"
    ],
    "source": "HPC market ~$57B in 2025"
  },
  {
    "id": "compchem",
    "label": "Computational / quantum chemistry",
    "family": "sci",
    "precision_bits": "64-bit+",
    "precision_x": 0.66,
    "application_y": 0.905,
    "investment_usd_b": 1.5,
    "investment_basis": "market / funding (est.)",
    "examples": [
      "Schr\u00f6dinger",
      "XtalPi",
      "Qubit Pharmaceuticals"
    ],
    "source": "sector estimate"
  },
  {
    "id": "semiqlassical",
    "label": "Semiqlassical \u00b7 Attryx",
    "family": "target",
    "precision_bits": "~128-bit",
    "precision_x": 0.91,
    "application_y": 0.93,
    "investment_usd_b": null,
    "investment_basis": "position marker (not sized)",
    "examples": [
      "Attryx"
    ],
    "source": "target \u2014 high-precision physics ML"
  }
]
```

---

## 6. Library guidance

I couldn't detect which library Attryx uses (its plots are client-rendered). **Match it.** If you
must pick, any of these handle a bubble scatter with categorical axes + tooltips cleanly:

- **Observable Plot** or **D3** — most control over the dark, hand-tuned look; best for matching the
  reference render exactly (regions, custom annotations, the star marker).
- **visx** (React + D3 primitives) — if the site is React and wants composable control.
- **Plotly** (`scatter`, `marker.size` from sqrt of investment, `mode:"markers+text"`) — fastest to
  stand up; good hover out of the box; slightly less control over the bespoke annotations.
- **Recharts `ScatterChart` + `ZAxis`** (z = investment for bubble size) — fine if Recharts is
  already in the stack; custom shapes for the target marker.

**Component contract** (framework-agnostic):
```
TwoKindsOfAIPlot({
  data,                 // the array above
  width, height,        // responsive container
  onHover?(point),      // for external tooltip if desired
  highlightId="semiqlassical"
})
// renders: axes(precision x, application y) + region shading + bubbles(size=log(invest), color=family)
//          + target star/glow + legend(toggles) + caption
```

Encoding logic (pseudocode):
```js
const rx = px => margin.l + px * plotW;
const ry = py => margin.t + (1 - py) * plotH;        // y inverted (physics at top)
const radius = invB => 12 + 15 * Math.max(Math.log10(invB), 0);
const color = f => ({ai:'#6F7BD6', sci:'#3FE0CE', target:'#FDB414'}[f]);
```

---

## 7. Honesty guardrails (keep the plot un-rebuttable)

- Keep the **"basis varies / log-scaled / approximate placement"** caption visible. It's not a
  disclaimer to bury — it's what makes a sharp partner trust the rest.
- Don't inflate Semiqlassical into a sized bubble (it has no comparable capital figure yet). It's a
  **position**: high precision × physics. The whitespace around it carries the argument.
- If asked to "tidy" the figures into one clean basis: don't fabricate. Label estimates as
  estimates. The pattern (two orders of magnitude of capital sitting at low precision) holds even
  with wide error bars — say that out loud rather than faking precision.

---

## 8. Sources (for the tooltip "source" line and your own due diligence)

- **AI data-center capex $5.2T by 2030** — McKinsey, *The cost of compute* (2025).
- **Low-precision hardware roadmap (FP4/FP8/FP6)** — NVIDIA Blackwell NVFP4; OCP microscaling
  (AMD/Arm/Intel/NVIDIA/Qualcomm).
- **Physics AI ~$16B** — PhysicsX $300M Series C @ $2.4B (Jun 2026); Prometheus $12B Series B;
  ~$15.8B raised across three "physics AI" firms in one week (TechTimes, Jun 2026).
- **Quantum computing ~$12B (2025)** — ResearchAndMarkets / SpinQ (quantum-computing share of
  ~$33B total quantum-tech investment).
- **AI drug discovery ~$11B (2025)** — DealForma 2025 review (348 rounds).
- **Photonic compute** — Lightmatter ~$850M (Sacra), Ayar Labs ~$375M, Celestial AI ~$339M (Contrary).
- **Neuromorphic ~$1.1B VC (2025)** — marketintelo / GlobeNewswire; $5B+ into non-GPU AI hardware 2024–26.
- **HPC market ~$57B (2025)** — Grand View / multiple industry reports (range $55–60B).
- **LLM / foundation models** — aggregate of disclosed mega-rounds (OpenAI, Anthropic, xAI); order-of-magnitude estimate.
- Analog/in-memory, AI-for-science, materials informatics, comp-chem — aggregated company rounds; **estimates**, flagged as such.

Replace any estimate with a firmer number if the team has better data — but keep the basis honest.
