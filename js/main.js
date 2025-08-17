(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();

    // Initiate the wowjs
    new WOW().init();

    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('bg-primary shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('bg-primary shadow-sm').css('top', '-150px');
        }
    });

    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });

    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });

    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        items: 1,
        autoplay: true,
        smartSpeed: 1000,
        dots: true,
        loop: true,
        nav: true,
        navText: [
            '<i class="bi bi-chevron-left"></i>',
            '<i class="bi bi-chevron-right"></i>'
        ]
    });

    // ========== Chaotic Attractor (WebGL) ==========
    const canvas = document.getElementById('chaosCanvas');
    if (!canvas) return;

    // Initialize WebGL (prefer WebGL2)
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) {
        console.warn('WebGL2 not supported; rendering disabled.');
        return;
    }

    // DPR and sizing
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    function sizeCanvas() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    sizeCanvas();
    window.addEventListener('resize', () => { dpr = Math.min(window.devicePixelRatio || 1, 2); sizeCanvas(); updateCenter(); }, { passive: true });

    // Center point in CSS pixels
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    function updateCenter() {
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
    }

    // Parallax scroll state (zoom + subtle vertical shift)
    let scrollZoom = 1.0, scrollZoomTarget = 1.0;
    let parallaxShiftY = 0.0, parallaxShiftYTarget = 0.0; // in CSS px
    window.addEventListener('scroll', () => {
        const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
        const p = docH > 0 ? Math.min(Math.max(window.scrollY / docH, 0), 1) : 0; // 0..1 across page
        scrollZoomTarget = 1.0 + p * 1.0;      // up to +100% zoom at bottom
        parallaxShiftYTarget = p * 120;          // up to 120px downward shift (background moves slower)
    }, { passive: true });

    // ================= Simulation (CPU) =================
    // Aizawa parameters
    const A = 0.95, B = 0.70, C = 0.60, D = 3.50, E = 0.25;

    // Integration and timing
    const BASE_DT = 0.006;
    const SUB_STEPS = 2;
    const SIM_SPEED = 1.2;
    const TIME_OFFSET_S = 0.3;

    // Rotation and wobble
    const ROT_SPEED = 0.25;           // rad/s
    const Y_WOBBLE_AMP = 0.6;         // axis Y component amplitude
    const Y_WOBBLE_FREQ = 0.15;       // Hz (in rad/s domain we multiply by time directly)

    // Bounding and containment
    const BOUND_R = 2.4;
    const BOUND_R2 = BOUND_R * BOUND_R;
    const CONTAIN_START = 0.7 * BOUND_R;
    const CONTAIN_K = 0.30;

    // Periodic forcing
    const FORCE_AMP_X = 0.45;
    const FORCE_AMP_Y = 0.27;
    const FORCE_FREQ = 0.8;           // rad/s
    const FORCE_PHASE = Math.PI / 3;

    // Swarms
    const N = 500;
    const pts1 = new Float32Array(3 * N);
    const pts2 = new Float32Array(3 * N);

    function initAizawaArray(arr) {
        for (let i = 0; i < N; i++) {
            const idx = i * 3;
            // seed near origin with small random scatter
            const r = 0.05 + 0.05 * Math.random();
            const th = Math.random() * Math.PI * 2;
            arr[idx] = r * Math.cos(th);
            arr[idx + 1] = r * Math.sin(th);
            arr[idx + 2] = (Math.random() - 0.5) * 0.1;
        }
    }
    initAizawaArray(pts1);
    initAizawaArray(pts2);

    // ========= Inter-attractor repulsion =========
    const INTER_RADIUS = 0.25;        // interaction radius in state space
    const INTER_RADIUS2 = INTER_RADIUS * INTER_RADIUS;
    const REPULSE_K = 4.0;            // strong repulsion
    const CELL = INTER_RADIUS;        // spatial hash cell size ~ interaction radius

    function buildSpatialHash(arr) {
        const map = new Map();
        for (let i = 0; i < N; i++) {
            const idx = i * 3;
            const x = arr[idx], y = arr[idx + 1], z = arr[idx + 2];
            const ix = Math.floor(x / CELL);
            const iy = Math.floor(y / CELL);
            const iz = Math.floor(z / CELL);
            const key = ix + '|' + iy + '|' + iz;
            let bucket = map.get(key);
            if (!bucket) { bucket = []; map.set(key, bucket); }
            bucket.push(idx);
        }
        return map;
    }

    function accumulateRepulsion(x, y, z, otherArr, hash) {
        const ix = Math.floor(x / CELL);
        const iy = Math.floor(y / CELL);
        const iz = Math.floor(z / CELL);
        let rx = 0, ry = 0, rz = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = (ix + dx) + '|' + (iy + dy) + '|' + (iz + dz);
                    const bucket = hash.get(key);
                    if (!bucket) continue;
                    for (let k = 0; k < bucket.length; k++) {
                        const j = bucket[k];
                        const ox = otherArr[j], oy = otherArr[j + 1], oz = otherArr[j + 2];
                        const dxv = x - ox, dyv = y - oy, dzv = z - oz;
                        const r2 = dxv * dxv + dyv * dyv + dzv * dzv;
                        if (r2 > 1e-9 && r2 <= INTER_RADIUS2) {
                            const r = Math.sqrt(r2);
                            const q = 1 - (r / INTER_RADIUS);  // 0..1
                            // very sharp falloff: q^4 and 1/r normalization
                            const mag = REPULSE_K * (q * q * q * q) / (r + 1e-6);
                            rx += dxv * mag;
                            ry += dyv * mag;
                            rz += dzv * mag;
                        }
                    }
                }
            }
        }
        return [rx, ry, rz];
    }

    function stepCoupled(dt, subSteps, t) {
        for (let s = 0; s < subSteps; s++) {
            const tt = t + s * dt;
            const fx = FORCE_AMP_X * Math.sin(FORCE_FREQ * tt);
            const fy = FORCE_AMP_Y * Math.sin(FORCE_FREQ * tt + FORCE_PHASE);

            // Snapshots for symmetric interaction this substep
            const snap1 = pts1.slice();
            const snap2 = pts2.slice();
            const hash1 = buildSpatialHash(snap1);
            const hash2 = buildSpatialHash(snap2);

            // Update pts1 influenced by pts2
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                let x = pts1[idx];
                let y = pts1[idx + 1];
                let z = pts1[idx + 2];

                let dx = (z - B) * x - D * y;
                let dy = D * x + (z - B) * y;
                let dz = C + A * z - (z * z * z) / 3 - (x * x) + E * z * (x * x * x);

                // periodic forcing
                dx += fx; dy += fy;

                // inter-attractor repulsion from pts2 snapshot
                const [rx, ry, rz] = accumulateRepulsion(x, y, z, snap2, hash2);
                dx += rx; dy += ry; dz += rz;

                // soft containment
                const r0 = Math.sqrt(x * x + y * y + z * z) + 1e-6;
                if (r0 > CONTAIN_START) {
                    const excess = r0 - CONTAIN_START;
                    const k = CONTAIN_K * (excess / (BOUND_R - CONTAIN_START));
                    const invr = 1.0 / r0;
                    dx += -k * x * invr;
                    dy += -k * y * invr;
                    dz += -k * z * invr;
                }

                x += dt * dx;
                y += dt * dy;
                let zNew = z + dt * dz;

                // hard projection
                const r2b = x * x + y * y + zNew * zNew;
                if (r2b > BOUND_R2) {
                    const r = Math.sqrt(r2b);
                    const sProj = BOUND_R / r;
                    x *= sProj; y *= sProj; zNew *= sProj;
                }

                pts1[idx] = x; pts1[idx + 1] = y; pts1[idx + 2] = zNew;
            }

            // Update pts2 influenced by pts1
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                let x = pts2[idx];
                let y = pts2[idx + 1];
                let z = pts2[idx + 2];

                let dx = (z - B) * x - D * y;
                let dy = D * x + (z - B) * y;
                let dz = C + A * z - (z * z * z) / 3 - (x * x) + E * z * (x * x * x);

                // periodic forcing
                dx += fx; dy += fy;

                // inter-attractor repulsion from pts1 snapshot
                const [rx, ry, rz] = accumulateRepulsion(x, y, z, snap1, hash1);
                dx += rx; dy += ry; dz += rz;

                // soft containment
                const r0 = Math.sqrt(x * x + y * y + z * z) + 1e-6;
                if (r0 > CONTAIN_START) {
                    const excess = r0 - CONTAIN_START;
                    const k = CONTAIN_K * (excess / (BOUND_R - CONTAIN_START));
                    const invr = 1.0 / r0;
                    dx += -k * x * invr;
                    dy += -k * y * invr;
                    dz += -k * z * invr;
                }

                x += dt * dx;
                y += dt * dy;
                let zNew = z + dt * dz;

                // hard projection
                const r2b = x * x + y * y + zNew * zNew;
                if (r2b > BOUND_R2) {
                    const r = Math.sqrt(r2b);
                    const sProj = BOUND_R / r;
                    x *= sProj; y *= sProj; zNew *= sProj;
                }

                pts2[idx] = x; pts2[idx + 1] = y; pts2[idx + 2] = zNew;
            }
        }
    }

    // Periodic jitter to central band (prevent clustering) — apply to any array
    const JITTER_PERIOD_MS = 30;
    const JITTER_BAND_X = 0.25;
    const JITTER_PUSH = 0.1;
    let lastJitterMs = performance.now();
    function jitterCentralBand(nowMs, arr) {
        if (nowMs - lastJitterMs < JITTER_PERIOD_MS) return;
        lastJitterMs = nowMs;
        for (let i = 0; i < N; i++) {
            const idx = i * 3;
            const x = arr[idx];
            if (Math.abs(x) <= JITTER_BAND_X) {
                const w = (JITTER_PUSH - Math.abs(x));
                if (w > 0) {
                    const f = 1.0 * (w * w);
                    arr[idx + 1] += 2.0 * (Math.random() * 2 - 1) * f;
                    arr[idx + 2] += 2.0 * (Math.random() * 2 - 1) * f;
                }
                const x1 = arr[idx], y1 = arr[idx + 1], z1 = arr[idx + 2];
                const r2 = x1 * x1 + y1 * y1 + z1 * z1;
                if (r2 > BOUND_R2) {
                    const r = Math.sqrt(r2);
                    const sProj = BOUND_R / r;
                    arr[idx] = x1 * sProj;
                    arr[idx + 1] = y1 * sProj;
                    arr[idx + 2] = z1 * sProj;
                }
            }
        }
    }

    // ================= WebGL Programs =================
    function compileShader(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(sh));
            gl.deleteShader(sh);
            return null;
        }
        return sh;
    }
    function createProgram(vsSrc, fsSrc) {
        const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
        if (!vs || !fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog);
            return null;
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return prog;
    }

    // Fade pass (fullscreen quad)
    const fadeVS = `#version 300 es
    precision mediump float;
    layout(location=0) in vec2 a_pos;
    void main(){
        gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;
    const fadeFS = `#version 300 es
    precision mediump float;
    uniform float u_fade;
    out vec4 fragColor;
    void main(){
        fragColor = vec4(0.0, 0.0, 0.0, u_fade);
    }`;
    const fadeProg = createProgram(fadeVS, fadeFS);
    const fade_u_fade = gl.getUniformLocation(fadeProg, 'u_fade');
    const fadeQuad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fadeQuad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);

    // Points pass
    const pointVS = `#version 300 es
    precision mediump float;
    layout(location=0) in vec3 a_pos;
    uniform mat3 u_rot;
    uniform vec2 u_resolution;
    uniform vec2 u_centerPx;
    uniform float u_scalePx;
    uniform float u_dotBase;
    uniform float u_dotGain;
    out float v_depthNorm;
    void main(){
        vec3 p = u_rot * a_pos;
        float depth = clamp(p.z, -3.0, 3.0);
        v_depthNorm = (depth + 3.0) / 6.0;
        vec2 px = u_centerPx + p.xy * u_scalePx;
        vec2 clip = vec2((px.x / u_resolution.x) * 2.0 - 1.0,
                         1.0 - (px.y / u_resolution.y) * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = u_dotBase + v_depthNorm * u_dotGain;
    }`;
    const pointFS = `#version 300 es
    precision mediump float;
    uniform vec3 u_color;
    uniform float u_alphaBase;
    uniform float u_alphaGain;
    in float v_depthNorm;
    out vec4 fragColor;
    void main(){
        vec2 d = gl_PointCoord - vec2(0.5);
        float m = smoothstep(0.5, 0.45, length(d));
        float alpha = clamp(u_alphaBase + u_alphaGain * v_depthNorm, 0.0, 1.0);
        fragColor = vec4(u_color/255.0, alpha * m);
    }`;
    const pointProg = createProgram(pointVS, pointFS);
    const loc_a_pos = 0;
    const u_rot = gl.getUniformLocation(pointProg, 'u_rot');
    const u_resolution = gl.getUniformLocation(pointProg, 'u_resolution');
    const u_centerPx = gl.getUniformLocation(pointProg, 'u_centerPx');
    const u_scalePx = gl.getUniformLocation(pointProg, 'u_scalePx');
    const u_dotBase = gl.getUniformLocation(pointProg, 'u_dotBase');
    const u_dotGain = gl.getUniformLocation(pointProg, 'u_dotGain');
    const u_color = gl.getUniformLocation(pointProg, 'u_color');
    const u_alphaBase = gl.getUniformLocation(pointProg, 'u_alphaBase');
    const u_alphaGain = gl.getUniformLocation(pointProg, 'u_alphaGain');

    // Buffers for two swarms
    const buf1 = gl.createBuffer();
    const buf2 = gl.createBuffer();

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    // Mouse position (optional; currently unused)
    let mousePX = centerX, mousePY = centerY;
    window.addEventListener('mousemove', (e) => { mousePX = e.clientX; mousePY = e.clientY; }, { passive: true });

    function render() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const t = performance.now() * 0.001 * SIM_SPEED + TIME_OFFSET_S;
        const nowMs = performance.now();

        // Ensure canvas matches DPR
        const targetW = Math.floor(w * dpr);
        const targetH = Math.floor(h * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
            sizeCanvas();
        }

        // Projection scale
        const baseScale = Math.min(w, h) / 5; // slightly larger figure

        // Smooth parallax responses
        scrollZoom += (scrollZoomTarget - scrollZoom) * 0.08;
        parallaxShiftY += (parallaxShiftYTarget - parallaxShiftY) * 0.08;

        // Advance dynamics (coupled)
        stepCoupled(BASE_DT * SIM_SPEED, SUB_STEPS, t);

        // Optional jitter
        jitterCentralBand(nowMs, pts1);
        jitterCentralBand(nowMs, pts2);

        // Rotation matrix (axis-angle with Y wobble)
        const theta = ROT_SPEED * t;
        const c = Math.cos(theta), s = Math.sin(theta), ic = 1 - c;
        const ayDyn = Y_WOBBLE_AMP * Math.sin(Y_WOBBLE_FREQ * t);
        let ax = 1.0, ay = ayDyn, az = 1.0;
        const invLen = 1.0 / Math.hypot(ax, ay, az);
        ax *= invLen; ay *= invLen; az *= invLen;
        const m00 = c + ax * ax * ic;
        const m01 = ax * ay * ic - az * s;
        const m02 = ax * az * ic + ay * s;
        const m10 = ay * ax * ic + az * s;
        const m11 = c + ay * ay * ic;
        const m12 = ay * az * ic - ax * s;
        const m20 = az * ax * ic - ay * s;
        const m21 = az * ay * ic + ax * s;
        const m22 = c + az * az * ic;

        // Upload common uniforms
        gl.useProgram(pointProg);
        gl.uniformMatrix3fv(u_rot, false, new Float32Array([
            m00, m01, m02,
            m10, m11, m12,
            m20, m21, m22
        ]));
        gl.uniform2f(u_resolution, canvas.width, canvas.height);
        gl.uniform2f(u_centerPx, centerX * dpr, (centerY + parallaxShiftY) * dpr);
        gl.uniform1f(u_scalePx, baseScale * scrollZoom * dpr);
        gl.uniform1f(u_dotBase, 1.0);
        gl.uniform1f(u_dotGain, 4.0);

        // Fade previous frame with translucent black quad
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(fadeProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, fadeQuad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(fade_u_fade, 0.06); // trail fade
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Additive blending for points
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(pointProg);

        // Draw swarm 1 (cool)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf1);
        gl.bufferData(gl.ARRAY_BUFFER, pts1, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(loc_a_pos);
        gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform3f(u_color, 0.0, 130.0, 200.0);
        gl.uniform1f(u_alphaBase, 0.5);
        gl.uniform1f(u_alphaGain, 0.75);
        gl.drawArrays(gl.POINTS, 0, N);

        // Draw swarm 2 (warm)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf2);
        gl.bufferData(gl.ARRAY_BUFFER, pts2, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(loc_a_pos);
        gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 0, 0);
        gl.uniform3f(u_color, 255.0, 100.0, 60.0);
        gl.uniform1f(u_alphaBase, 0.45);
        gl.uniform1f(u_alphaGain, 0.75);
        gl.drawArrays(gl.POINTS, 0, N);

        requestAnimationFrame(render);
    }

    // Pre-warm simulation so first frame reflects t = TIME_OFFSET_S
    (function prewarmSimulation() {
        let t0 = 0;
        const target = TIME_OFFSET_S;
        const dt = BASE_DT;
        const subSteps = 4; // modest substeps to keep prewarm quick but stable
        while (t0 < target) {
            stepCoupled(dt, subSteps, t0);
            t0 += dt * subSteps;
        }
    })();

    requestAnimationFrame(render);

})(jQuery);
