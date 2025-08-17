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
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
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
        navText : [
            '<i class="bi bi-chevron-left"></i>',
            '<i class="bi bi-chevron-right"></i>'
        ]
    });

    // ========== Chaotic Attractor Canvas ==========
    const canvas = document.getElementById('chaosCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: true });
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        function sizeCanvas() {
            const w = window.innerWidth;
            const h = window.innerHeight; // full viewport
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        }
        sizeCanvas();
        window.addEventListener('resize', sizeCanvas, { passive: true });

        let centerX = window.innerWidth / 2;
        let centerY = window.innerHeight / 2;
        function updateCenter() {
            centerX = window.innerWidth / 2;
            centerY = window.innerHeight / 2;
        }
        window.addEventListener('resize', updateCenter, { passive: true });

        // Pointer tracking for attraction (remove view rotation)
        // Keep current time offset value
        const TIME_OFFSET_S = 10.0;
        let mousePX = centerX, mousePY = centerY; // pointer in pixels
        window.addEventListener('mousemove', (e) => { mousePX = e.clientX; mousePY = e.clientY; }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length) { mousePX = e.touches[0].clientX; mousePY = e.touches[0].clientY; }
        }, { passive: true });

        // --- Aizawa Attractor ---
        // dx/dt = (z - b) x - d y
        // dy/dt = d x + (z - b) y
        // dz/dt = c + a z - z^3/3 - x^2 + e z x^3
        const A = 0.95, B = 0.70, C = 0.60, D = 3.50, E = 0.25;
        const N = 750; // number of simultaneous trajectories PER attractor
        const pts1 = new Float32Array(N * 3); // attr-1 (cool color)
        const pts2 = new Float32Array(N * 3); // attr-2 (warm color)

        // Bounding sphere params
        const BOUND_R =2.4;            // radius of containment sphere (state space units)
        const BOUND_R2 = BOUND_R * BOUND_R;
        const CONTAIN_K = 0.30;         // strength of soft centripetal force when near boundary
        const CONTAIN_START = BOUND_R * 0.7; // start applying soft force before the wall

        function initAizawaArray(arr) {
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                // Small random cloud near origin
                arr[idx]     = (Math.random() - 0.5) * 0.5; // x
                arr[idx + 1] = (Math.random() - 0.5) * 0.5; // y
                arr[idx + 2] = (Math.random() - 0.5) * 0.5; // z
            }
        }
        initAizawaArray(pts1);
        initAizawaArray(pts2);

        // Periodic forcing parameters
        const FORCE_AMP_X = 0.45;     // amplitude for dx forcing (derivative units)
        const FORCE_AMP_Y = 0.27;     // amplitude for dy forcing (softer)
        const FORCE_FREQ  = 0.8;      // radians per second
        const FORCE_PHASE = Math.PI/3; // phase shift for y forcing

        // Simulation speed controls
        const BASE_DT = 0.006;       // base integration step
        const SUB_STEPS = 2;         // micro-steps per frame
        const SIM_SPEED = 1.2;       // >1.0 = faster, <1.0 = slower

        // View rotation (around 45° axis in XZ plane: axis = normalize([1,0,1]))
        const ROT_AX = Math.SQRT1_2; // 1/sqrt(2)
        // const ROT_AY = 0.0;
        const ROT_AZ = Math.SQRT1_2; // 1/sqrt(2)
        const ROT_SPEED = 0.25;      // radians per second (slow, smooth)
        // Time-dependent Y-axis wobble for the rotation axis
        const Y_WOBBLE_AMP = 0.6;    // amplitude of Y component in axis (relative before normalization)
        const Y_WOBBLE_FREQ = 0.15;  // radians per second

        // ========= Inter-attractor repulsion =========
        const INTER_RADIUS = 0.25;        // interaction radius in state space
        const INTER_RADIUS2 = INTER_RADIUS * INTER_RADIUS;
        const REPULSE_K = 4.0;            // strong repulsion
        const CELL = INTER_RADIUS;        // spatial hash cell size ~ interaction radius

        function buildSpatialHash(arr) {
            const map = new Map();
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = arr[idx], y = arr[idx+1], z = arr[idx+2];
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
                        const key = (ix+dx) + '|' + (iy+dy) + '|' + (iz+dz);
                        const bucket = hash.get(key);
                        if (!bucket) continue;
                        for (let k = 0; k < bucket.length; k++) {
                            const j = bucket[k];
                            const ox = otherArr[j], oy = otherArr[j+1], oz = otherArr[j+2];
                            const dxv = x - ox, dyv = y - oy, dzv = z - oz;
                            const r2 = dxv*dxv + dyv*dyv + dzv*dzv;
                            if (r2 > 1e-9 && r2 <= INTER_RADIUS2) {
                                const r = Math.sqrt(r2);
                                const q = 1 - (r / INTER_RADIUS);  // 0..1
                                // very sharp falloff: q^4 and 1/r normalization
                                const mag = REPULSE_K * (q*q*q*q) / (r + 1e-6);
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
                    const r0 = Math.sqrt(x*x + y*y + z*z) + 1e-6;
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
                    const r2b = x*x + y*y + zNew*zNew;
                    if (r2b > BOUND_R2) {
                        const r = Math.sqrt(r2b);
                        const sProj = BOUND_R / r;
                        x *= sProj; y *= sProj; zNew *= sProj;
                    }

                    pts1[idx] = x; pts1[idx+1] = y; pts1[idx+2] = zNew;
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
                    const r0 = Math.sqrt(x*x + y*y + z*z) + 1e-6;
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
                    const r2b = x*x + y*y + zNew*zNew;
                    if (r2b > BOUND_R2) {
                        const r = Math.sqrt(r2b);
                        const sProj = BOUND_R / r;
                        x *= sProj; y *= sProj; zNew *= sProj;
                    }

                    pts2[idx] = x; pts2[idx+1] = y; pts2[idx+2] = zNew;
                }
            }
        }

        // Periodic jitter to central band (prevent clustering) — apply to any array
        const JITTER_PERIOD_MS = 30;
        const JITTER_BAND_X = 0.25;
        const JITTER_PUSH = 0.2;
        let lastJitterMs = performance.now();
        function jitterCentralBand(nowMs, arr) {
            if (nowMs - lastJitterMs < JITTER_PERIOD_MS) return;
            lastJitterMs = nowMs;
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = arr[idx];
                if (Math.abs(x) <= JITTER_BAND_X) {
                    arr[idx + 1] += 2.0*(Math.random() * 2 - 1) * ((JITTER_PUSH-Math.abs(x))**2);
                    arr[idx + 2] += 2.0*(Math.random() * 2 - 1) * ((JITTER_PUSH-Math.abs(x))**2);

                    const x1 = arr[idx], y1 = arr[idx + 1], z1 = arr[idx + 2];
                    const r2 = x1*x1 + y1*y1 + z1*z1;
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

        function render() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const t = performance.now() * 0.001 * SIM_SPEED + TIME_OFFSET_S;
            const nowMs = performance.now();

            // Fade trail
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, w, h);

            // Projection scale and mouse target in state space (x-y plane)
            const scale = Math.min(w, h) / 5; // slightly larger figure
            const attractX = (mousePX - centerX) / scale;
            const attractY = (mousePY - centerY) / scale;

            // Advance dynamics (coupled) a few micro steps per frame for smoother traces
            stepCoupled(BASE_DT * SIM_SPEED, SUB_STEPS, t);

            // Periodic jitter on both sets
            // jitterCentralBand(nowMs, pts1);
            // jitterCentralBand(nowMs, pts2);

            // Precompute rotation matrix for this frame (axis-angle -> 3x3)
            const theta = ROT_SPEED * t; // smooth rotation angle
            const c = Math.cos(theta), s = Math.sin(theta), ic = 1 - c;
            // Time-varying rotation axis: start from (1, 0, 1), add Y wobble, then normalize
            const ayDyn = Y_WOBBLE_AMP * Math.sin(Y_WOBBLE_FREQ * t);
            let ax = 1.0, ay = ayDyn, az = 1.0;
            const invLen = 1.0 / Math.hypot(ax, ay, az);
            ax *= invLen; ay *= invLen; az *= invLen;
            const m00 = c + ax*ax*ic;
            const m01 = ax*ay*ic - az*s;
            const m02 = ax*az*ic + ay*s;
            const m10 = ay*ax*ic + az*s;
            const m11 = c + ay*ay*ic;
            const m12 = ay*az*ic - ax*s;
            const m20 = az*ax*ic - ay*s;
            const m21 = az*ay*ic + ax*s;
            const m22 = c + az*az*ic;

            // Draw attr-1 (cool)
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = pts1[idx];
                const y = pts1[idx + 1];
                const z = pts1[idx + 2];

                const xr = m00*x + m01*y + m02*z;
                const yr = m10*x + m11*y + m12*z;
                const zr = m20*x + m21*y + m22*z;

                const xp = centerX + xr * scale;
                const yp = centerY + yr * scale;

                const depth = Math.max(-3, Math.min(3, zr));
                const depthNorm = (depth + 3) / 6;
                const dot = 1.0 + depthNorm * 2.0;

                ctx.fillStyle = 'rgba(0, 100, 200, ' + (0.5 + 0.75 * depthNorm) + ')';
                ctx.fillRect(xp, yp, dot, dot);
            }

            // Draw attr-2 (warm)
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = pts2[idx];
                const y = pts2[idx + 1];
                const z = pts2[idx + 2];

                const xr = m00*x + m01*y + m02*z;
                const yr = m10*x + m11*y + m12*z;
                const zr = m20*x + m21*y + m22*z;

                const xp = centerX + xr * scale;
                const yp = centerY + yr * scale;

                const depth = Math.max(-3, Math.min(3, zr));
                const depthNorm = (depth + 3) / 6;
                const dot = 1.0 + depthNorm * 2.0;

                ctx.fillStyle = 'rgba(255, 120, 60, ' + (0.45 + 0.75 * depthNorm) + ')';
                ctx.fillRect(xp, yp, dot, dot);
            }

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
    }

})(jQuery);
