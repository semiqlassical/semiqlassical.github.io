/* =========================================================================
   Corner chaotic attractor (Aizawa, coupled swarms) — WebGL2
   Adapted from the site-wide background on the main page (js/main.js) to run
   scoped to its own canvas box (top-right corner motif) instead of the window.
   Brand-recolored to the collateral teal/violet. Respects reduced motion.
   ========================================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("chaos-corner");
  if (!canvas) return;

  var gl = canvas.getContext("webgl2", { antialias: true, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return; // no WebGL2 → silently skip (page still fine)

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- sizing: scoped to the canvas CSS box ----
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function boxW() { return canvas.clientWidth || 480; }
  function boxH() { return canvas.clientHeight || 480; }
  var centerX = boxW() / 2, centerY = boxH() / 2;
  function sizeCanvas() {
    var w = boxW(), h = boxH();
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    centerX = w / 2; centerY = h / 2;
  }
  sizeCanvas();
  window.addEventListener("resize", function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas();
  }, { passive: true });

  // ================= Simulation (CPU) — Aizawa =================
  var A = 0.95, B = 0.70, C = 0.60, D = 3.50, E = 0.25;
  var BASE_DT = 0.006, SUB_STEPS = 2, SIM_SPEED = 1.2, TIME_OFFSET_S = 0.3;
  var ROT_SPEED = 0.25, Y_WOBBLE_AMP = 0.6, Y_WOBBLE_FREQ = 0.15;
  var BOUND_R = 2.4, BOUND_R2 = BOUND_R * BOUND_R;
  var CONTAIN_START = 0.7 * BOUND_R, CONTAIN_K = 0.30;
  var FORCE_AMP_X = 0.45, FORCE_AMP_Y = 0.27, FORCE_FREQ = 0.8, FORCE_PHASE = Math.PI / 3;

  var N = 460;
  var pts1 = new Float32Array(3 * N);
  var pts2 = new Float32Array(3 * N);

  function initAizawaArray(arr) {
    for (var i = 0; i < N; i++) {
      var idx = i * 3;
      var r = 0.05 + 0.05 * Math.random();
      var th = Math.random() * Math.PI * 2;
      arr[idx] = r * Math.cos(th);
      arr[idx + 1] = r * Math.sin(th);
      arr[idx + 2] = (Math.random() - 0.5) * 0.1;
    }
  }
  initAizawaArray(pts1);
  initAizawaArray(pts2);

  // ---- inter-attractor repulsion (spatial hash) ----
  var INTER_RADIUS = 0.25, INTER_RADIUS2 = INTER_RADIUS * INTER_RADIUS;
  var REPULSE_K = 4.0, CELL = INTER_RADIUS;

  function buildSpatialHash(arr) {
    var map = new Map();
    for (var i = 0; i < N; i++) {
      var idx = i * 3;
      var key = Math.floor(arr[idx] / CELL) + "|" + Math.floor(arr[idx + 1] / CELL) + "|" + Math.floor(arr[idx + 2] / CELL);
      var bucket = map.get(key);
      if (!bucket) { bucket = []; map.set(key, bucket); }
      bucket.push(idx);
    }
    return map;
  }

  function accumulateRepulsion(x, y, z, otherArr, hash) {
    var ix = Math.floor(x / CELL), iy = Math.floor(y / CELL), iz = Math.floor(z / CELL);
    var rx = 0, ry = 0, rz = 0;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) for (var dz = -1; dz <= 1; dz++) {
      var bucket = hash.get((ix + dx) + "|" + (iy + dy) + "|" + (iz + dz));
      if (!bucket) continue;
      for (var k = 0; k < bucket.length; k++) {
        var j = bucket[k];
        var dxv = x - otherArr[j], dyv = y - otherArr[j + 1], dzv = z - otherArr[j + 2];
        var r2 = dxv * dxv + dyv * dyv + dzv * dzv;
        if (r2 > 1e-9 && r2 <= INTER_RADIUS2) {
          var r = Math.sqrt(r2);
          var q = 1 - (r / INTER_RADIUS);
          var mag = REPULSE_K * (q * q * q * q) / (r + 1e-6);
          rx += dxv * mag; ry += dyv * mag; rz += dzv * mag;
        }
      }
    }
    return [rx, ry, rz];
  }

  function integrate(arr, snapOther, hashOther, dt, fx, fy) {
    for (var i = 0; i < N; i++) {
      var idx = i * 3;
      var x = arr[idx], y = arr[idx + 1], z = arr[idx + 2];
      var dx = (z - B) * x - D * y;
      var dy = D * x + (z - B) * y;
      var dz = C + A * z - (z * z * z) / 3 - (x * x) + E * z * (x * x * x);
      dx += fx; dy += fy;
      var rep = accumulateRepulsion(x, y, z, snapOther, hashOther);
      dx += rep[0]; dy += rep[1]; dz += rep[2];
      var r0 = Math.sqrt(x * x + y * y + z * z) + 1e-6;
      if (r0 > CONTAIN_START) {
        var k = CONTAIN_K * ((r0 - CONTAIN_START) / (BOUND_R - CONTAIN_START));
        var invr = 1.0 / r0;
        dx += -k * x * invr; dy += -k * y * invr; dz += -k * z * invr;
      }
      x += dt * dx; y += dt * dy; var zNew = z + dt * dz;
      var r2b = x * x + y * y + zNew * zNew;
      if (r2b > BOUND_R2) { var sP = BOUND_R / Math.sqrt(r2b); x *= sP; y *= sP; zNew *= sP; }
      arr[idx] = x; arr[idx + 1] = y; arr[idx + 2] = zNew;
    }
  }

  function stepCoupled(dt, subSteps, t) {
    for (var s = 0; s < subSteps; s++) {
      var tt = t + s * dt;
      var fx = FORCE_AMP_X * Math.sin(FORCE_FREQ * tt);
      var fy = FORCE_AMP_Y * Math.sin(FORCE_FREQ * tt + FORCE_PHASE);
      var snap1 = pts1.slice(), snap2 = pts2.slice();
      var hash1 = buildSpatialHash(snap1), hash2 = buildSpatialHash(snap2);
      integrate(pts1, snap2, hash2, dt, fx, fy);
      integrate(pts2, snap1, hash1, dt, fx, fy);
    }
  }

  // ================= WebGL =================
  function compileShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  function createProgram(vsSrc, fsSrc) {
    var vs = compileShader(gl.VERTEX_SHADER, vsSrc), fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return null; }
    return prog;
  }

  var fadeVS = "#version 300 es\nprecision mediump float;\nlayout(location=0) in vec2 a_pos;\nvoid main(){ gl_Position = vec4(a_pos,0.0,1.0); }";
  var fadeFS = "#version 300 es\nprecision mediump float;\nuniform float u_fade;\nout vec4 fragColor;\nvoid main(){ fragColor = vec4(0.0,0.0,0.0,u_fade); }";
  var fadeProg = createProgram(fadeVS, fadeFS);
  var fade_u_fade = gl.getUniformLocation(fadeProg, "u_fade");
  var fadeQuad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fadeQuad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  var pointVS = "#version 300 es\nprecision mediump float;\nlayout(location=0) in vec3 a_pos;\nuniform mat3 u_rot;\nuniform vec2 u_resolution;\nuniform vec2 u_centerPx;\nuniform float u_scalePx;\nuniform float u_dotBase;\nuniform float u_dotGain;\nout float v_depthNorm;\nvoid main(){\n vec3 p = u_rot * a_pos;\n float depth = clamp(p.z, -3.0, 3.0);\n v_depthNorm = (depth + 3.0) / 6.0;\n vec2 px = u_centerPx + p.xy * u_scalePx;\n vec2 clip = vec2((px.x/u_resolution.x)*2.0-1.0, 1.0-(px.y/u_resolution.y)*2.0);\n gl_Position = vec4(clip,0.0,1.0);\n gl_PointSize = u_dotBase + v_depthNorm * u_dotGain;\n}";
  var pointFS = "#version 300 es\nprecision mediump float;\nuniform vec3 u_color;\nuniform float u_alphaBase;\nuniform float u_alphaGain;\nin float v_depthNorm;\nout vec4 fragColor;\nvoid main(){\n vec2 d = gl_PointCoord - vec2(0.5);\n float m = smoothstep(0.5,0.45,length(d));\n float alpha = clamp(u_alphaBase + u_alphaGain*v_depthNorm,0.0,1.0);\n fragColor = vec4(u_color/255.0, alpha*m);\n}";
  var pointProg = createProgram(pointVS, pointFS);
  var loc_a_pos = 0;
  var u_rot = gl.getUniformLocation(pointProg, "u_rot");
  var u_resolution = gl.getUniformLocation(pointProg, "u_resolution");
  var u_centerPx = gl.getUniformLocation(pointProg, "u_centerPx");
  var u_scalePx = gl.getUniformLocation(pointProg, "u_scalePx");
  var u_dotBase = gl.getUniformLocation(pointProg, "u_dotBase");
  var u_dotGain = gl.getUniformLocation(pointProg, "u_dotGain");
  var u_color = gl.getUniformLocation(pointProg, "u_color");
  var u_alphaBase = gl.getUniformLocation(pointProg, "u_alphaBase");
  var u_alphaGain = gl.getUniformLocation(pointProg, "u_alphaGain");

  var buf1 = gl.createBuffer(), buf2 = gl.createBuffer();
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);

  // brand colors (rgb 0-255): teal + violet
  var COL1 = [63, 224, 206], COL2 = [157, 140, 255];

  function drawFrame(t) {
    var baseScale = Math.min(boxW(), boxH()) / 4.6;

    var theta = ROT_SPEED * t;
    var c = Math.cos(theta), s = Math.sin(theta), ic = 1 - c;
    var ay = Y_WOBBLE_AMP * Math.sin(Y_WOBBLE_FREQ * t);
    var ax = 1.0, az = 1.0;
    var invLen = 1.0 / Math.hypot(ax, ay, az);
    ax *= invLen; ay *= invLen; az *= invLen;
    var m = new Float32Array([
      c + ax * ax * ic, ax * ay * ic - az * s, ax * az * ic + ay * s,
      ay * ax * ic + az * s, c + ay * ay * ic, ay * az * ic - ax * s,
      az * ax * ic - ay * s, az * ay * ic + ax * s, c + az * az * ic
    ]);

    gl.useProgram(pointProg);
    gl.uniformMatrix3fv(u_rot, false, m);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform2f(u_centerPx, centerX * dpr, centerY * dpr);
    gl.uniform1f(u_scalePx, baseScale * dpr);
    gl.uniform1f(u_dotBase, 1.0);
    gl.uniform1f(u_dotGain, 4.0);

    // fade previous frame (trail)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(fadeProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, fadeQuad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(fade_u_fade, 0.06);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // additive points
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(pointProg);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf1);
    gl.bufferData(gl.ARRAY_BUFFER, pts1, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc_a_pos);
    gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(u_color, COL1[0], COL1[1], COL1[2]);
    gl.uniform1f(u_alphaBase, 0.5); gl.uniform1f(u_alphaGain, 0.75);
    gl.drawArrays(gl.POINTS, 0, N);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf2);
    gl.bufferData(gl.ARRAY_BUFFER, pts2, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc_a_pos);
    gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(u_color, COL2[0], COL2[1], COL2[2]);
    gl.uniform1f(u_alphaBase, 0.45); gl.uniform1f(u_alphaGain, 0.75);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  // pre-warm so the first frame already shows the attractor shape
  (function prewarm() {
    var t0 = 0, dt = BASE_DT, subSteps = 4;
    while (t0 < TIME_OFFSET_S) { stepCoupled(dt, subSteps, t0); t0 += dt * subSteps; }
  })();

  if (reduce) {
    // static fallback: accumulate ~90 frames of trails into the preserved
    // buffer for a rich still image, then stop (no animation loop).
    var tt = TIME_OFFSET_S;
    for (var w = 0; w < 90; w++) {
      tt += BASE_DT * SIM_SPEED * SUB_STEPS;
      stepCoupled(BASE_DT * SIM_SPEED, SUB_STEPS, tt);
      drawFrame(tt);
    }
    return;
  }

  var running = true;
  document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(render); });

  function render() {
    if (!running) return;
    var t = performance.now() * 0.001 * SIM_SPEED + TIME_OFFSET_S;
    stepCoupled(BASE_DT * SIM_SPEED, SUB_STEPS, t);
    drawFrame(t);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
