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
        const N = 2000; // number of simultaneous trajectories
        const pts = new Float32Array(N * 3); // x, y, z per point

        // Bounding sphere params
        const BOUND_R = 2.5;            // radius of containment sphere (state space units)
        const BOUND_R2 = BOUND_R * BOUND_R;
        const CONTAIN_K = 0.30;         // strength of soft centripetal force when near boundary
        const CONTAIN_START = BOUND_R * 0.8; // start applying soft force before the wall

        function initAizawa() {
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                // Small random cloud near origin
                pts[idx]     = (Math.random() - 0.5) * 0.5; // x
                pts[idx + 1] = (Math.random() - 0.5) * 0.5; // y
                pts[idx + 2] = (Math.random() - 0.5) * 0.5; // z
            }
        }
        initAizawa();

        // Periodic forcing parameters
        const FORCE_AMP_X = 0.45;     // amplitude for dx forcing (derivative units)
        const FORCE_AMP_Y = 0.27;     // amplitude for dy forcing (softer)
        const FORCE_FREQ  = 0.8;      // radians per second
        const FORCE_PHASE = Math.PI/3; // phase shift for y forcing

        // Simulation speed controls
        const BASE_DT = 0.006;       // base integration step
        const SUB_STEPS = 2;         // micro-steps per frame
        const SIM_SPEED = 1.6;       // >1.0 = faster, <1.0 = slower

        // Mouse attraction parameters (state space units)
        const ATTRACT_K = 0.0;          // base attraction gain
        const ATTRACT_FALLOFF = 1.0;    // higher = faster falloff with distance

        function stepAizawa(dt, subSteps, t, attractX, attractY) {
            const noiseAmp = 0.005; // tiny noise to prevent clumping
            for (let s = 0; s < subSteps; s++) {
                const tt = t + s * dt; // advance time within substeps for smooth forcing
                const fx = FORCE_AMP_X * Math.sin(FORCE_FREQ * tt);
                const fy = FORCE_AMP_Y * Math.sin(FORCE_FREQ * tt + FORCE_PHASE);

                for (let i = 0; i < N; i++) {
                    const idx = i * 3;
                    let x = pts[idx];
                    let y = pts[idx + 1];
                    let z = pts[idx + 2];

                    let dx = (z - B) * x - D * y;
                    let dy = D * x + (z - B) * y;
                    let dz = C + A * z - (z * z * z) / 3 - (x * x) + E * z * (x * x * x);

                    // Apply small periodic forcing to x and y dynamics
                    dx += fx;
                    dy += fy;

                    // Soft containment force (radial towards origin) as we approach boundary
                    const r0 = Math.sqrt(x * x + y * y + z * z) + 1e-6;
                    if (r0 > CONTAIN_START) {
                        const excess = r0 - CONTAIN_START; // how far beyond start radius
                        const k = CONTAIN_K * (excess / (BOUND_R - CONTAIN_START));
                        const invr = 1.0 / r0;
                        dx += -k * x * invr;
                        dy += -k * y * invr;
                        dz += -k * z * invr;
                    }

                    x += dt * dx + (Math.random() - 0.5) * noiseAmp;
                    y += dt * dy + (Math.random() - 0.5) * noiseAmp;
                    let zNew = z + dt * dz + (Math.random() - 0.5) * noiseAmp;

                    // Hard projection back inside the bounding sphere (prevents long-term scatter)
                    const r2b = x * x + y * y + zNew * zNew;
                    if (r2b > BOUND_R2) {
                        const r = Math.sqrt(r2b);
                        const sProj = BOUND_R / r;
                        x *= sProj; y *= sProj; zNew *= sProj;
                    }

                    pts[idx]     = x;
                    pts[idx + 1] = y;
                    pts[idx + 2] = zNew;
                }
            }
        }

        // Periodic jitter to central band (prevent clustering)
        const JITTER_PERIOD_MS = 5000;     // every 5s
        const JITTER_BAND_X = 0.25;        // apply to particles with |x| <= this
        const JITTER_PUSH = 0.2;          // max displacement applied to y/z per jitter
        let lastJitterMs = performance.now();
        function jitterCentralBand(nowMs) {
            if (nowMs - lastJitterMs < JITTER_PERIOD_MS) return;
            lastJitterMs = nowMs;
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = pts[idx];
                if (Math.abs(x) <= JITTER_BAND_X) {
                    // push y and z slightly in random directions
                    pts[idx + 1] += 7.0*(Math.random() * 2 - 1) * ((JITTER_PUSH-Math.abs(x))**2);
                    pts[idx + 2] += 7.0*(Math.random() * 2 - 1) * ((JITTER_PUSH-Math.abs(x))**2);

                    // project back inside bounding sphere if necessary
                    const x1 = pts[idx], y1 = pts[idx + 1], z1 = pts[idx + 2];
                    const r2 = x1 * x1 + y1 * y1 + z1 * z1;
                    if (r2 > BOUND_R2) {
                        const r = Math.sqrt(r2);
                        const sProj = BOUND_R / r;
                        pts[idx] = x1 * sProj;
                        pts[idx + 1] = y1 * sProj;
                        pts[idx + 2] = z1 * sProj;
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
            ctx.fillRect(0, 0, w, h);

            // Projection scale and mouse target in state space (x-y plane)
            const scale = Math.min(w, h) / 6; // fits ~[-4,4] comfortably
            const attractX = (mousePX - centerX) / scale;
            const attractY = (mousePY - centerY) / scale;

            // Advance dynamics a few micro steps per frame for smoother traces
            stepAizawa(BASE_DT * SIM_SPEED, SUB_STEPS, t, attractX, attractY);

            // Periodic jitter
            jitterCentralBand(nowMs);

            // Draw points (no view rotation)
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < N; i++) {
                const idx = i * 3;
                const x = pts[idx];
                const y = pts[idx + 1];
                const z = pts[idx + 2];

                const xp = centerX + x * scale;
                const yp = centerY + y * scale;

                // Depth-based sizing (use z)
                const depth = Math.max(-3, Math.min(3, z));
                const depthNorm = (depth + 3) / 6; // 0..1
                const dot = 0.6 + depthNorm * 2.4;

                ctx.fillStyle = 'rgba(50, 2, 100, ' + (0.5 + 0.75 * depthNorm) + ')';
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
                stepAizawa(dt, subSteps, t0, 0, 0);
                t0 += dt * subSteps;
            }
        })();

        requestAnimationFrame(render);
    }

})(jQuery);

