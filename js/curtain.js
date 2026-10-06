/* ============================================================
   CURTAIN — JS Controller
   Starts 10% open (shows site's M), click opens 100%.
   2 big swag valance with folds · Speed locked at 3s.
   ============================================================ */
(function () {
    'use strict';

    /* ══════════════════════════════════════════════════════════
       🔊  SOUND
    ══════════════════════════════════════════════════════════ */
    var SOUND_PATH   = 'assets/24th century fox_[cut_6sec].mp3';
    var SOUND_VOLUME = 0.8;

    /* ══════════════════════════════════════════════════════════
       INITIAL SCALE
       scaleX(1.0) → completely closed curtains.
    ══════════════════════════════════════════════════════════ */
    var INIT_SCALE = 1.0;

    /* ══════════════════════════════════════════════════════════
       OPENING DURATION — read from audio file at load time.
       Falls back to 6 s if metadata isn't ready yet.
    ══════════════════════════════════════════════════════════ */
    var soundDuration = 6.0;   /* updated once audio metadata loads */

    /* ══════════════════════════════════════════════════════════
       PHYSICS
    ══════════════════════════════════════════════════════════ */
    var FOLD_COUNT  = 18;
    var RINGS       = 10;
    var STRIP_DELAY = 38;
    var MAX_AMP     = 26;
    var MIN_AMP     = 5;

    /* ══════════════════════════════════════════════════════════
       IDLE
    ══════════════════════════════════════════════════════════ */
    var IDLE_DUR       = 7.5;
    var IDLE_HEM_DUR   = 5.8;
    var IDLE_STRIP_DUR = 6.2;

    /* ══════════════════════════════════════════════════════════
       STATE
    ══════════════════════════════════════════════════════════ */
    var isOpen     = false;
    var audio      = null;
    var cpLeft     = null;
    var cpRight    = null;
    var valanceSvg = null;
    var allFolds   = [];
    var allHems    = [];

    /* ══════════════════════════════════════════════════════════
       AUDIO
    ══════════════════════════════════════════════════════════ */
    function preloadAudio() {
        if (!SOUND_PATH) return;
        try {
            audio = new Audio(SOUND_PATH);
            audio.volume = SOUND_VOLUME;
            audio.preload = 'auto';
            /* Capture the real duration as soon as browser has the metadata */
            audio.addEventListener('loadedmetadata', function () {
                if (!isNaN(audio.duration) && audio.duration > 0) {
                    soundDuration = audio.duration;
                }
            });
        } catch (e) { audio = null; }
    }
    function playSound() {
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(function () {});
    }

    /* ══════════════════════════════════════════════════════════
       SVG VALANCE — 2 large swags with pleated folds
    ══════════════════════════════════════════════════════════ */
    function buildValance() {
        var wrap = document.createElement('div');
        wrap.id  = 'c-valance';

        var NS  = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('xmlns', NS);
        svg.setAttribute('viewBox', '0 0 1000 220');
        svg.setAttribute('preserveAspectRatio', 'none');
        valanceSvg = svg;

        /* ── Defs ── */
        var defs = document.createElementNS(NS, 'defs');

        /* Velvet vertical gradient (top-to-bottom on swag face) */
        var vg = document.createElementNS(NS, 'linearGradient');
        vg.setAttribute('id','vg'); vg.setAttribute('x1','0'); vg.setAttribute('y1','0');
        vg.setAttribute('x2','0'); vg.setAttribute('y2','1');
        [['0%','#5a0000'],['25%','#8b0010'],['55%','#7a0008'],['100%','#150000']]
            .forEach(function(s){
                var st = document.createElementNS(NS,'stop');
                st.setAttribute('offset',s[0]);
                st.setAttribute('stop-color',s[1]);
                vg.appendChild(st);
            });

        /* Gold gradient for trim & tassels */
        var gg = document.createElementNS(NS, 'linearGradient');
        gg.setAttribute('id','gg'); gg.setAttribute('x1','0'); gg.setAttribute('y1','0');
        gg.setAttribute('x2','0'); gg.setAttribute('y2','1');
        [['0%','#ffd700'],['50%','#c8a000'],['100%','#8b6200']]
            .forEach(function(s){
                var st = document.createElementNS(NS,'stop');
                st.setAttribute('offset',s[0]);
                st.setAttribute('stop-color',s[1]);
                gg.appendChild(st);
            });

        /* Darker velvet for shadow fold faces */
        var vd = document.createElementNS(NS, 'linearGradient');
        vd.setAttribute('id','vd'); vd.setAttribute('x1','0'); vd.setAttribute('y1','0');
        vd.setAttribute('x2','0'); vd.setAttribute('y2','1');
        [['0%','#1a0000'],['50%','#2d0000'],['100%','#050000']]
            .forEach(function(s){
                var st = document.createElementNS(NS,'stop');
                st.setAttribute('offset',s[0]);
                st.setAttribute('stop-color',s[1]);
                vd.appendChild(st);
            });

        defs.appendChild(vg);
        defs.appendChild(gg);
        defs.appendChild(vd);

        /* ── Helper: cubic bezier point ── */
        function bez(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
            var u = 1 - t;
            return {
                x: u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x,
                y: u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y
            };
        }

        svg.appendChild(defs);

        /* ── Draw 2 large swags ── */
        var SWAGS  = 2;
        var W      = 1000;
        var swagW  = W / SWAGS;   /* 500 units each */
        var CTRL_Y = 260;         /* deep control point for dramatic drape */
        var NUM_FOLD_STRIPS = 9;  /* pleated fold strips per swag */

        for (var i = 0; i < SWAGS; i++) {
            var x0 = i * swagW;
            var x1 = x0 + swagW;
            var xm = x0 + swagW / 2;

            /* Bezier control points for this swag:
               top-left → curve deep down → top-right              */
            var cp1x = x0 + swagW * 0.08;
            var cp2x = x1 - swagW * 0.08;

            /* Build clipPath from the swag outline so fold lines
               are clipped cleanly to the swag shape               */
            var clipId = 'sc' + i;
            var clipPath = document.createElementNS(NS, 'clipPath');
            clipPath.setAttribute('id', clipId);
            var clipShape = document.createElementNS(NS, 'path');
            /* Closed swag shape: top-left → bezier → top-right → rect top */
            clipShape.setAttribute('d',
                'M ' + x0 + ' 0' +
                ' C ' + cp1x + ' ' + CTRL_Y + ',' +
                        cp2x + ' ' + CTRL_Y + ',' +
                        x1 + ' 0' +
                ' L ' + x1 + ' 0' +
                ' L ' + x0 + ' 0 Z'
            );
            clipPath.appendChild(clipShape);
            defs.appendChild(clipPath);

            /* Group clipped to swag shape */
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('clip-path', 'url(#' + clipId + ')');

            /* ── Fold strips inside the swag ──
               Sample N+1 bezier points to form N trapezoid strips.
               Odd strips = peak (brighter), even = valley (darker) */
            var pts = [];
            for (var k = 0; k <= NUM_FOLD_STRIPS; k++) {
                var t = k / NUM_FOLD_STRIPS;
                pts.push(bez(t, x0, 0, cp1x, CTRL_Y, cp2x, CTRL_Y, x1, 0));
            }

            for (var s = 0; s < NUM_FOLD_STRIPS; s++) {
                var tL = pts[s];
                var tR = pts[s + 1];
                var topLx = x0 + (s     / NUM_FOLD_STRIPS) * swagW;
                var topRx = x0 + ((s+1) / NUM_FOLD_STRIPS) * swagW;

                var strip = document.createElementNS(NS, 'path');
                /* Trapezoid: straight top → curved bottom (following bezier) */
                strip.setAttribute('d',
                    'M ' + topLx + ' 0' +
                    ' L ' + topRx + ' 0' +
                    ' L ' + tR.x  + ' ' + tR.y +
                    ' L ' + tL.x  + ' ' + tL.y +
                    ' Z'
                );
                strip.setAttribute('fill', (s % 2 === 0) ? 'url(#vg)' : 'url(#vd)');
                g.appendChild(strip);

                /* Fold crease line between strips */
                if (s < NUM_FOLD_STRIPS - 1) {
                    var crease = document.createElementNS(NS, 'line');
                    crease.setAttribute('x1', topRx);  crease.setAttribute('y1', '0');
                    crease.setAttribute('x2', tR.x);   crease.setAttribute('y2', String(tR.y));
                    crease.setAttribute('stroke', 'rgba(0,0,0,0.35)');
                    crease.setAttribute('stroke-width', '2');
                    g.appendChild(crease);

                    /* Highlight on the bright side of each crease */
                    var hl = document.createElementNS(NS, 'line');
                    hl.setAttribute('x1', topRx + 3);  hl.setAttribute('y1', '0');
                    hl.setAttribute('x2', tR.x  + 2);  hl.setAttribute('y2', String(tR.y));
                    hl.setAttribute('stroke', 'rgba(220,80,80,0.18)');
                    hl.setAttribute('stroke-width', '2');
                    g.appendChild(hl);
                }
            }

            svg.appendChild(g);

            /* ── Gold trim edge along the bottom of the swag ── */
            var edge = document.createElementNS(NS, 'path');
            edge.setAttribute('d',
                'M ' + x0 + ' 0' +
                ' C ' + cp1x + ' ' + CTRL_Y + ',' +
                        cp2x + ' ' + CTRL_Y + ',' +
                        x1 + ' 0'
            );
            edge.setAttribute('fill', 'none');
            edge.setAttribute('stroke', 'url(#gg)');
            edge.setAttribute('stroke-width', '5');
            svg.appendChild(edge);

            /* ── Tassel at the deepest point of the swag ── */
            /* Deepest point is at t=0.5 of the bezier */
            var dipPt = bez(0.5, x0, 0, cp1x, CTRL_Y, cp2x, CTRL_Y, x1, 0);
            var tx = dipPt.x, ty = dipPt.y;

            var cord = document.createElementNS(NS,'line');
            cord.setAttribute('x1', tx); cord.setAttribute('y1', String(ty - 5));
            cord.setAttribute('x2', tx); cord.setAttribute('y2', String(ty + 18));
            cord.setAttribute('stroke','#c8a000'); cord.setAttribute('stroke-width','3');
            svg.appendChild(cord);

            var bulb = document.createElementNS(NS,'ellipse');
            bulb.setAttribute('cx', tx);        bulb.setAttribute('cy', String(ty + 28));
            bulb.setAttribute('rx','11');        bulb.setAttribute('ry','16');
            bulb.setAttribute('fill','url(#gg)');
            svg.appendChild(bulb);

            /* Tassel fringe strands */
            for (var f = -4; f <= 4; f++) {
                var strand = document.createElementNS(NS,'line');
                strand.setAttribute('x1', tx + f * 3);
                strand.setAttribute('y1', String(ty + 40));
                strand.setAttribute('x2', tx + f * 4.5);
                strand.setAttribute('y2', String(ty + 60));
                strand.setAttribute('stroke', (f % 2 === 0) ? '#ffd700' : '#c8a000');
                strand.setAttribute('stroke-width','1.8');
                svg.appendChild(strand);
            }

            /* ── Ruching knot at the top join of each swag boundary ── */
            var knotX = (i === 0) ? x0 : x0;   /* left end of each swag */
            [x0, x1].forEach(function(kx, ki) {
                /* Only draw the center knot (x1 of swag 0 = x0 of swag 1) once */
                if (i === 1 && ki === 0) return;   /* skip, swag 0 drew it as x1 */
                var knot = document.createElementNS(NS,'circle');
                knot.setAttribute('cx', kx); knot.setAttribute('cy','10');
                knot.setAttribute('r','16');
                knot.setAttribute('fill','url(#gg)');
                svg.appendChild(knot);
                var kring = document.createElementNS(NS,'circle');
                kring.setAttribute('cx', kx); kring.setAttribute('cy','10');
                kring.setAttribute('r','9');
                kring.setAttribute('fill','none');
                kring.setAttribute('stroke','#ffe566');
                kring.setAttribute('stroke-width','1.5');
                svg.appendChild(kring);
            });
        }

        /* Center knot between the 2 swags */
        var ck = document.createElementNS(NS,'circle');
        ck.setAttribute('cx','500'); ck.setAttribute('cy','10');
        ck.setAttribute('r','20');
        ck.setAttribute('fill','url(#gg)');
        svg.appendChild(ck);
        var ckr = document.createElementNS(NS,'circle');
        ckr.setAttribute('cx','500'); ckr.setAttribute('cy','10');
        ckr.setAttribute('r','11');
        ckr.setAttribute('fill','none');
        ckr.setAttribute('stroke','#ffe566');
        ckr.setAttribute('stroke-width','2');
        svg.appendChild(ckr);

        wrap.appendChild(svg);
        return wrap;
    }

    /* ══════════════════════════════════════════════════════════
       DOM BUILDERS
    ══════════════════════════════════════════════════════════ */
    function makePanel(id) {
        var el = document.createElement('div');
        el.id = id; el.className = 'c-panel';
        return el;
    }

    function addRod(panel) {
        var rod = document.createElement('div'); rod.className = 'c-rod';
        for (var i = 0; i < RINGS; i++) {
            var ring = document.createElement('div'); ring.className = 'c-ring';
            ring.style.left = (2 + (i / (RINGS - 1)) * 96) + '%';
            rod.appendChild(ring);
        }
        panel.appendChild(rod);
    }

    function addFolds(panel, side) {
        var wrap = document.createElement('div'); wrap.className = 'c-folds';
        for (var i = 0; i < FOLD_COUNT; i++) {
            var strip = document.createElement('div'); strip.className = 'c-fold';
            var seamDist = (side === 'left') ? (FOLD_COUNT - 1 - i) : i;
            var delay    = seamDist * STRIP_DELAY;
            var amp      = MAX_AMP - (seamDist / (FOLD_COUNT - 1)) * (MAX_AMP - MIN_AMP);
            strip.style.setProperty('--fd',    delay + 'ms');
            strip.style.setProperty('--sa-up', '-' + amp.toFixed(1) + 'px');
            strip.style.setProperty('--sa-dn',      (amp * 0.80).toFixed(1) + 'px');
            strip.style.setProperty('--sa-d2', '-' + (amp * 0.22).toFixed(1) + 'px');
            wrap.appendChild(strip);
            allFolds.push(strip);
        }
        panel.appendChild(wrap);
        return wrap;
    }

    function addFringe(panel) {
        var f = document.createElement('div'); f.className = 'c-fringe';
        panel.appendChild(f);
    }

    function addHem(panel) {
        var hem = document.createElement('div'); hem.className = 'c-hem';
        panel.appendChild(hem); allHems.push(hem);
        return hem;
    }

    function buildHint() {
        var h = document.createElement('div'); h.className = 'curtain-hint';
        h.innerHTML =
            '<div class="curtain-hint-ring"><span class="curtain-hint-icon">✦</span></div>' +
            '<span class="curtain-hint-text">Tap to reveal</span>';
        return h;
    }

    function buildOverlay() {
        var ov = document.createElement('div'); ov.id = 'curtain-overlay';

        cpLeft  = makePanel('cp-left');
        cpRight = makePanel('cp-right');

        addRod(cpLeft);
        var foldsLeft = addFolds(cpLeft, 'left');
        addFringe(cpLeft);
        var hemLeft = addHem(cpLeft);

        addRod(cpRight);
        var foldsRight = addFolds(cpRight, 'right');
        addFringe(cpRight);
        var hemRight = addHem(cpRight);

        ov.appendChild(cpLeft);
        ov.appendChild(cpRight);
        ov.appendChild(buildHint());

        var pelmet = document.createElement('div'); pelmet.id = 'c-pelmet';
        ov.appendChild(pelmet);
        ov.appendChild(buildValance());

        document.body.appendChild(ov);

        /* Start at 10% open */
        cpLeft.style.transform  = 'scaleX(' + INIT_SCALE + ')';
        cpRight.style.transform = 'scaleX(' + INIT_SCALE + ')';

        ov._foldsLeft  = foldsLeft;
        ov._foldsRight = foldsRight;
        ov._hemLeft    = hemLeft;
        ov._hemRight   = hemRight;

        return ov;
    }

    /* ══════════════════════════════════════════════════════════
       IDLE SWAY
    ══════════════════════════════════════════════════════════ */
    function startIdle(ov) {
        ov._foldsLeft.style.animation =
            'folds-sway-left ' + IDLE_DUR + 's ease-in-out infinite';
        ov._foldsRight.style.animation =
            'folds-sway-right ' + IDLE_DUR + 's ease-in-out 1.4s infinite';
        ov._hemLeft.style.animation =
            'hem-sway-left ' + IDLE_HEM_DUR + 's ease-in-out 0.8s infinite';
        ov._hemRight.style.animation =
            'hem-sway-right ' + IDLE_HEM_DUR + 's ease-in-out 1.9s infinite';
        if (valanceSvg)
            valanceSvg.style.animation =
                'valance-sway ' + (IDLE_DUR * 1.1) + 's ease-in-out 0.4s infinite';
        allFolds.forEach(function (fold, idx) {
            fold.style.animation =
                'fold-idle-shimmer ' + IDLE_STRIP_DUR + 's ease-in-out ' +
                ((idx % FOLD_COUNT) * 0.28).toFixed(2) + 's infinite';
        });
    }

    function stopIdle(ov) {
        ov._foldsLeft.style.animation  = 'none';
        ov._foldsRight.style.animation = 'none';
        ov._hemLeft.style.animation    = 'none';
        ov._hemRight.style.animation   = 'none';
        if (valanceSvg) valanceSvg.style.animation = 'none';
        allFolds.forEach(function (f) { f.style.animation = 'none'; });
        /* Clear inline transform so keyframe 0% (scaleX 0.882) takes over */
        cpLeft.style.transform  = '';
        cpRight.style.transform = '';
        void ov.offsetWidth;
    }

    /* ══════════════════════════════════════════════════════════
       THANOS REVERSE SNAP — Date Button Assembly
       Gathers floating dust & ash particles from the air and
       fuses them back into the exact solid date pill button.
    ══════════════════════════════════════════════════════════ */
    function triggerReverseThanosSnap(el) {
        if (!el) return;

        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            el.classList.remove('snap-hidden');
            el.classList.add('snap-revealed');
            return;
        }

        var w = Math.round(rect.width);
        var h = Math.round(rect.height);
        var startX = rect.left;
        var startY = rect.top;

        /* Render accurate date button onto offscreen canvas */
        var off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        var offCtx = off.getContext('2d');

        /* Pill shape background */
        var r = h / 2;
        offCtx.beginPath();
        offCtx.moveTo(r, 0);
        offCtx.lineTo(w - r, 0);
        offCtx.arcTo(w, 0, w, r, r);
        offCtx.lineTo(w, h - r);
        offCtx.arcTo(w, h, w - r, h, r);
        offCtx.lineTo(r, h);
        offCtx.arcTo(0, h, 0, h - r, r);
        offCtx.lineTo(0, r);
        offCtx.arcTo(0, 0, r, 0, r);
        offCtx.closePath();

        offCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        offCtx.fill();
        offCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        offCtx.lineWidth = 1;
        offCtx.stroke();

        /* Text rendering */
        var text = (el.textContent || 'OCTOBER 30-31, 2026').trim().toUpperCase();
        var style = window.getComputedStyle(el);
        offCtx.font = (style.fontWeight || '500') + ' ' + (style.fontSize || '13.6px') + ' ' + (style.fontFamily || 'Montserrat, sans-serif');
        offCtx.fillStyle = '#FFFFFF';
        offCtx.textAlign = 'center';
        offCtx.textBaseline = 'middle';

        var letterSpacing = 3;
        var chars = text.split('');
        var totalWidth = 0;
        var charWidths = [];
        for (var ci = 0; ci < chars.length; ci++) {
            var cw = offCtx.measureText(chars[ci]).width;
            charWidths.push(cw);
            totalWidth += cw + (ci < chars.length - 1 ? letterSpacing : 0);
        }
        var curX = (w - totalWidth) / 2;
        var curY = h / 2;
        for (var cj = 0; cj < chars.length; cj++) {
            offCtx.fillText(chars[cj], curX + charWidths[cj] / 2, curY);
            curX += charWidths[cj] + letterSpacing;
        }

        /* Extract non-transparent pixels */
        var imgData = offCtx.getImageData(0, 0, w, h);
        var pixels = imgData.data;

        var particles = [];
        var step = 2; // high-density sampling
        for (var py = 0; py < h; py += step) {
            for (var px = 0; px < w; px += step) {
                var pidx = (py * w + px) * 4;
                var alpha = pixels[pidx + 3];
                if (alpha > 18) {
                    var tx = startX + px;
                    var ty = startY + py;

                    /* Dispersed starting points (blowing in from wind/sky like ash) */
                    var angle = (Math.random() - 0.5) * 0.9 + 0.35;
                    var dist = Math.random() * 260 + 80;
                    var sx = tx + Math.cos(angle) * dist + (Math.random() - 0.5) * 70;
                    var sy = ty - Math.sin(angle) * dist - Math.random() * 60;

                    var cx1 = (sx + tx) / 2 + (Math.random() - 0.5) * 110;
                    var cy1 = (sy + ty) / 2 + (Math.random() - 0.5) * 90;

                    var isEmber = Math.random() < 0.16;
                    var colorStr;
                    if (isEmber) {
                        colorStr = 'rgba(255, ' + Math.floor(170 + Math.random() * 60) + ', 70, ';
                    } else {
                        colorStr = 'rgba(' + pixels[pidx] + ',' + pixels[pidx + 1] + ',' + pixels[pidx + 2] + ', ';
                    }

                    particles.push({
                        sx: sx, sy: sy,
                        cx: cx1, cy: cy1,
                        tx: tx, ty: ty,
                        color: colorStr,
                        baseAlpha: alpha / 255,
                        size: Math.random() * 1.5 + 0.85,
                        delay: (px / w) * 0.42 + Math.random() * 0.32,
                        isEmber: isEmber
                    });
                }
            }
        }

        /* Fullscreen canvas for particle integration */
        var canvas = document.createElement('canvas');
        canvas.id = 'thanos-snap-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        var cvCtx = canvas.getContext('2d');

        var startTime = performance.now();
        var animDur = 1700; // ms

        function ease(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function render(now) {
            var elapsed = now - startTime;
            cvCtx.clearRect(0, 0, canvas.width, canvas.height);

            var allDone = true;

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                var pTime = (elapsed - p.delay * 1000) / animDur;
                if (pTime < 0) {
                    allDone = false;
                    continue;
                }
                var t = Math.min(1, Math.max(0, pTime));
                if (t < 1) allDone = false;

                var e = ease(t);

                var u = 1 - e;
                var curX = u * u * p.sx + 2 * u * e * p.cx + e * e * p.tx;
                var curY = u * u * p.sy + 2 * u * e * p.cy + e * e * p.ty;

                var currentAlpha = p.baseAlpha * Math.min(1, t * 1.6);
                var currentSize = p.size * (1.5 - e * 0.5);

                cvCtx.fillStyle = p.color + currentAlpha.toFixed(3) + ')';
                cvCtx.beginPath();
                cvCtx.arc(curX, curY, currentSize, 0, Math.PI * 2);
                cvCtx.fill();

                /* Sparkle trails */
                if (t > 0.1 && t < 0.85 && (i % 4 === 0)) {
                    cvCtx.fillStyle = 'rgba(255, 215, 110, ' + (currentAlpha * 0.35).toFixed(3) + ')';
                    cvCtx.beginPath();
                    cvCtx.arc(curX + (Math.random() - 0.5) * 4, curY + (Math.random() - 0.5) * 4, currentSize * 0.6, 0, Math.PI * 2);
                    cvCtx.fill();
                }
            }

            if (!allDone) {
                requestAnimationFrame(render);
            } else {
                /* Reveal button smoothly */
                el.classList.remove('snap-hidden');
                el.classList.add('snap-revealed');

                canvas.style.transition = 'opacity 0.25s ease';
                canvas.style.opacity = '0';
                setTimeout(function () {
                    if (canvas.parentNode) {
                        canvas.parentNode.removeChild(canvas);
                    }
                }, 300);
            }
        }

        requestAnimationFrame(render);
    }

    /* ══════════════════════════════════════════════════════════
       OPEN — duration matches the sound file exactly
    ══════════════════════════════════════════════════════════ */
    function openCurtain(ov) {
        if (isOpen) return;
        isOpen = true;

        playSound();
        stopIdle(ov);
        ov.classList.add('curtain-open');

        /* Use the real audio duration; fall back to soundDuration (6 s) */
        var dur = (audio && !isNaN(audio.duration) && audio.duration > 0)
                  ? audio.duration
                  : soundDuration;

        var ease = 'cubic-bezier(0.37, 0, 0.63, 1)';

        cpLeft.style.animation  = 'velvet-left  ' + dur + 's ' + ease + ' forwards';
        cpRight.style.animation = 'velvet-right ' + dur + 's ' + ease + ' forwards';

        var foldDur = (dur * 0.55).toFixed(2) + 's';
        allFolds.forEach(function (fold) {
            fold.style.animationName           = 'fold-sine';
            fold.style.animationDuration       = foldDur;
            fold.style.animationTimingFunction = ease;
            fold.style.animationFillMode       = 'both';
            fold.style.animationDelay          = fold.style.getPropertyValue('--fd');
        });

        /* Hide overlay and trigger reverse Thanos snap when curtain finishes */
        var done = false;
        function finish() {
            if (done) return;
            done = true;
            ov.classList.add('curtain-done');
            var dateBtn = document.querySelector('.hero-dates');
            if (dateBtn) {
                triggerReverseThanosSnap(dateBtn);
            }
        }

        if (audio) {
            audio.addEventListener('ended', finish, { once: true });
        }
        /* Safety fallback in case audio.ended never fires */
        setTimeout(finish, dur * 1000 + 600);
    }

    /* ══════════════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════════════ */
    function init() {
        /* Hide date button immediately while curtain is closed */
        var dateBtn = document.querySelector('.hero-dates');
        if (dateBtn) {
            dateBtn.classList.add('snap-hidden');
        }

        preloadAudio();
        var ov = buildOverlay();
        startIdle(ov);

        ov.addEventListener('click', function () { openCurtain(ov); });
        ov.addEventListener('touchstart', function (e) {
            e.preventDefault(); openCurtain(ov);
        }, { passive: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
