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

        const P = 700; // particle count
        const particles = new Float32Array(P * 4);
        function initParticles() {
            for (let i = 0; i < P; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 40 + Math.random() * 140;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                const idx = i * 4;
                particles[idx] = x;
                particles[idx + 1] = y;
                particles[idx + 2] = (Math.random() - 0.5) * 0.2;
                particles[idx + 3] = (Math.random() - 0.5) * 0.2;
            }
        }
        initParticles();

        let phase = 1;
        let lastSwitch = performance.now();
        const switchEvery = 3500;

        function step() {
            const t = performance.now() * 0.001;
            const targetX = centerX + Math.sin(t * 0.7) * 160;
            const targetY = centerY + Math.cos(t * 0.9) * 110;

            const now = performance.now();
            if (now - lastSwitch > switchEvery) {
                phase *= -1;
                lastSwitch = now;
            }

            const k = phase > 0 ? 0.06 : -0.04;
            const damping = 0.985;
            const noise = 0.15;

            for (let i = 0; i < P; i++) {
                const idx = i * 4;
                const x = particles[idx];
                const y = particles[idx + 1];
                let vx = particles[idx + 2];
                let vy = particles[idx + 3];

                let dx = targetX - x;
                let dy = targetY - y;
                const dist = Math.hypot(dx, dy) + 1e-3;
                dx /= dist; dy /= dist;
                const force = k * Math.min(2, 140 / dist);
                const curl = 0.02;
                const fx = dx * force - dy * curl;
                const fy = dy * force + dx * curl;

                vx = vx * damping + fx + (Math.random() - 0.5) * noise;
                vy = vy * damping + fy + (Math.random() - 0.5) * noise;

                let nx = x + vx;
                let ny = y + vy;

                // Bounds: wrap toward center if far outside viewport
                if (nx < -50 || nx > window.innerWidth + 50) nx = centerX + (Math.random() - 0.5) * 20;
                if (ny < -50 || ny > window.innerHeight + 50) ny = centerY + (Math.random() - 0.5) * 20;

                particles[idx] = nx;
                particles[idx + 1] = ny;
                particles[idx + 2] = vx;
                particles[idx + 3] = vy;
            }
        }

        function render() {
            // Fade trail (lighter to reveal motion more clearly)
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            // Brighter particle dots
            ctx.globalCompositeOperation = 'lighter';
            const dotSize = 1.2; // CSS pixels
            ctx.fillStyle = 'rgba(115, 2, 100, 0.85)';
            for (let i = 0; i < P; i++) {
                const idx = i * 4;
                const x = particles[idx];
                const y = particles[idx + 1];
                ctx.fillRect(x, y, dotSize, dotSize);
            }

            // Filaments
            ctx.beginPath();
            for (let i = 0; i < P; i += 7) {
                const i2 = (i + 53) % P;
                const x1 = particles[i * 4];
                const y1 = particles[i * 4 + 1];
                const x2 = particles[i2 * 4];
                const y2 = particles[i2 * 4 + 1];
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = 'rgba(84, 46, 129, 0.5)';
            ctx.stroke();

            step();
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    }

})(jQuery);

