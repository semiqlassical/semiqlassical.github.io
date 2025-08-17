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

    // ========== Chaos Canvas: Hexagonal Game of Life ==========
    const canvas = document.getElementById('chaosCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    const sqrt3 = Math.sqrt(3);

    // DPR-aware canvas sizing
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    function sizeCanvas() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    function updateCenter() {
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
    }

    // Hex grid settings
    let hexSize = 20; // pixel radius of hexagon
    let cols = 0, rows = 0;
    let qMin = 0, rMin = 0, N = 0;
    let cx = new Float32Array(0), cy = new Float32Array(0); // centers
    let neighbors = new Int32Array(0); // 6 neighbors per cell
    let state = new Uint8Array(0), next = new Uint8Array(0);
    let vis = new Float32Array(0); // visual alpha [0..1] for smooth transitions
    let age = new Uint16Array(0);  // steps the cell has been alive

    // Rules for Hex Life (B2/S34 works well on hex grids)
    const STEP_MS = 300;              // CA update interval
    const PREWARM_SECONDS = 2.0;     // evolve before first paint
    const INIT_FILL = 0.25;          // initial alive fraction
    const SPAWN_RATE = 0.0005;       // random births fraction per step
    const FADE_SPEED = 10.0;         // 1/s, higher = faster visual easing
    const AGE_GAIN = 0.62;            // brightness falloff per alive step

    function axialToPixel(q, r) {
        // Pointy-topped axial -> pixel
        const x = hexSize * (sqrt3 * (q + r / 2));
        const y = hexSize * (1.5 * r);
        return [centerX + x, centerY + y];
    }

    function mod(a, m) { return ((a % m) + m) % m; }

    function toIndex(q, r) {
        const qi = mod(q - qMin, cols);
        const ri = mod(r - rMin, rows);
        return ri * cols + qi;
    }

    function rebuildGrid() {
        sizeCanvas();
        updateCenter();

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Number of axial columns/rows to cover viewport with margin
        cols = Math.ceil(w / (sqrt3 * hexSize)) + 4;
        rows = Math.ceil(h / (1.5 * hexSize)) + 4;
        qMin = -Math.floor(cols / 2);
        rMin = -Math.floor(rows / 2);
        N = cols * rows;

        cx = new Float32Array(N);
        cy = new Float32Array(N);
        neighbors = new Int32Array(N * 6);
        state = new Uint8Array(N);
        next = new Uint8Array(N);
        vis = new Float32Array(N);
        age = new Uint16Array(N);

        // Precompute centers and neighbors
        let idx = 0;
        const dirs = [
            [ +1,  0],
            [ +1, -1],
            [  0, -1],
            [ -1,  0],
            [ -1, +1],
            [  0, +1]
        ];
        for (let r = 0; r < rows; r++) {
            const rr = rMin + r;
            for (let c = 0; c < cols; c++) {
                const qq = qMin + c;
                const [px, py] = axialToPixel(qq, rr);
                cx[idx] = px; cy[idx] = py;
                const base = idx * 6;
                for (let k = 0; k < 6; k++) {
                    const nq = qq + dirs[k][0];
                    const nr = rr + dirs[k][1];
                    neighbors[base + k] = toIndex(nq, nr);
                }
                idx++;
            }
        }

        // Initialize random state and starting visuals/ages
        for (let i = 0; i < N; i++) {
            state[i] = Math.random() < INIT_FILL ? 1 : 0;
            vis[i] = state[i];
            age[i] = state[i] ? 1 : 0;
        }
    }

    function drawHex(x, y) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const ang = Math.PI / 3 * i + Math.PI / 6; // pointy-top
            const xi = x + hexSize * Math.cos(ang);
            const yi = y + hexSize * Math.sin(ang);
            if (i === 0) ctx.moveTo(xi, yi); else ctx.lineTo(xi, yi);
        }
        ctx.closePath();
        ctx.fill();
    }

    function step() {
        // Hex Life rule: B2/S12
        for (let i = 0; i < N; i++) {
            const base = i * 6;
            let n = 0;
            n += state[neighbors[base + 0]];
            n += state[neighbors[base + 1]];
            n += state[neighbors[base + 2]];
            n += state[neighbors[base + 3]];
            n += state[neighbors[base + 4]];
            n += state[neighbors[base + 5]];

            if (state[i]) {
                next[i] = (n === 1 || n === 2) ? 1 : 0; // survive with 1 or 2
            } else {
                next[i] = (n === 2) ? 1 : 0;            // birth with exactly 2
            }
        }
        // Occasional random births to sustain motion
        if (SPAWN_RATE > 0) {
            const births = Math.floor(N * SPAWN_RATE);
            for (let k = 0; k < births; k++) next[(Math.random() * N) | 0] = 1;
        }
        // Swap buffers
        const tmp = state; state = next; next = tmp;

        // Update ages based on new state
        for (let i = 0; i < N; i++) {
            age[i] = state[i] ? Math.min(age[i] + 1, 65535) : 0;
        }
    }


    // Initial grid setup
    rebuildGrid();

    // Update + draw loop with smoothing
    let lastStepTime = 0;
    let lastFrameTime = performance.now();
    function update(t) {
        const dt = t - lastFrameTime; lastFrameTime = t;
        const dtSec = dt * 0.001;
        const smooth = 1 - Math.exp(-FADE_SPEED * dtSec);

        // Step CA at fixed cadence
        if (t - lastStepTime >= STEP_MS) {
            step();
            lastStepTime = t;
        }

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Clear background
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // Draw living cells with smoothed alpha inversely scaled by age
        ctx.fillStyle = 'rgb(115, 2, 100)';
        for (let i = 0; i < N; i++) {
            vis[i] += (state[i] - vis[i]) * smooth;
            if (vis[i] <= 0.01) continue;
            const bright = 1 / (1 + AGE_GAIN * age[i]);
            ctx.globalAlpha = (0.15 + 0.85 * vis[i]) * bright;
            drawHex(cx[i], cy[i]);
        }
        ctx.globalAlpha = 1.0;

        requestAnimationFrame(update);
    }
    requestAnimationFrame(update);


    // Resize handling
    let lastResizeTime = 0;
    window.addEventListener('resize', () => {
        const now = Date.now();
        if (now - lastResizeTime > 500) {
            lastResizeTime = now;
            rebuildGrid();
        }
    });


    // Pause/resume on visibility change
    let isPaused = false;
    function setPause(pause) {
        isPaused = pause;
        if (pause) {
            canvas.style.visibility = 'hidden';
        } else {
            canvas.style.visibility = 'visible';
            rebuildGrid();
        }
    }
    document.addEventListener('visibilitychange', () => {
        setPause(document.hidden);
    });
    setPause(false);

})(jQuery);

