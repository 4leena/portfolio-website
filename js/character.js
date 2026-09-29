(function () {
  const hero = document.querySelector('.hero');
  const figure = document.querySelector('.figure');
  const canvas = figure.querySelector('canvas.gl');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const IMG_W = 924, IMG_H = 1152;
  const FITS = {"L": {"lr": [380.0, 456.7], "top": [323.6849380302812, -140.8802604241165, 373.1844492495884, -481.9267838574381, 250.9688067493543], "bot": [332.2329076714661, 117.53690767283923, -296.6855595413073, 364.90239841949284, -179.406860742515], "c": [420.8, 327.7]}, "R": {"lr": [518.3, 588.0], "top": [341.4219194717384, -174.87070997901836, 419.41980939877845, -491.4468376894362, 234.76246527861647], "bot": [345.16713364259294, 99.67459504171335, -267.0409594513561, 331.1406480912881, -167.75309981531743], "c": [544.2, 335.0]}};
  const SRC = {
    waveBody: 'assets/character/wave-body.webp', waveArm: 'assets/character/wave-arm.webp',
    base: 'assets/character/base.webp', orig: 'assets/character/orig.webp', mask: 'assets/character/eye-mask.png'
  };

  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return;   // the still image stays visible

  // ---------- shaders ----------
  // Vertex shader: bends the picture. Points on the face get a rough depth (an ellipsoid plus the nose
  // and lips), so when the head turns, nearer features slide further than the edges: that reads as 3D.
  const VS = `
  attribute vec2 aPos;
  uniform vec4 uFit;
  uniform float uYaw, uPitch, uRoll, uSmile, uBreath, uSway, uShrug, uTilt, uBodyYaw, uLean, uArm, uArmA, uHandA;
  uniform vec2 uElbow, uWrist, uShift;
  varying vec2 vPx;
  float g(vec2 p, vec2 c, float s) { vec2 d = p - c; return exp(-dot(d, d) / (2.0 * s * s)); }
  void main() {
    vec2 p = aPos;
    float headW = 1.0 - smoothstep(470.0, 650.0, p.y);
    vec2 q = (p - vec2(472.0, 345.0)) / vec2(140.0, 170.0);
    float z = sqrt(max(0.0, 1.0 - dot(q, q))) + 0.7 * g(p, vec2(490.0, 392.0), 22.0) + 0.3 * g(p, vec2(482.0, 435.0), 26.0);
    vec2 d = vec2(headW * uYaw * 14.0 + z * uYaw * 20.0, headW * uPitch * 6.0 + z * uPitch * 14.0);
    float a = uRoll * headW; vec2 r = p - vec2(478.0, 600.0);
    d += vec2(cos(a) * r.x - sin(a) * r.y, sin(a) * r.x + cos(a) * r.y) - r;
    float cl = g(p, vec2(420.0, 422.0), 13.0), cr = g(p, vec2(545.0, 425.0), 13.0);
    d += uSmile * (vec2(-2.5, -4.0) * cl + vec2(2.5, -4.0) * cr);
    d.y -= uSmile * 2.2 * (g(p, vec2(395.0, 390.0), 28.0) + g(p, vec2(575.0, 382.0), 28.0));
    d.y += uSmile * g(p, vec2(482.0, 447.0), 12.0);
    float chest = smoothstep(520.0, 680.0, p.y) * (1.0 - smoothstep(880.0, 1152.0, p.y));
    d.y -= uBreath * (2.2 * chest + 1.2 * headW);
    d.x += uSway * (g(p, vec2(255.0, 1010.0), 110.0) + 0.8 * g(p, vec2(675.0, 990.0), 110.0)) * 3.0;
    // shoulders (and the arms and hair resting on them): shrug, rock side to side, rise with breath
    float shV = smoothstep(560.0, 670.0, p.y) * (1.0 - smoothstep(980.0, 1152.0, p.y));
    float sL = 1.0 - smoothstep(300.0, 440.0, p.x), sR = smoothstep(520.0, 660.0, p.x);
    d.y -= shV * (sL * (uShrug * 16.0 + uTilt * 5.0 + uBreath * 1.5) + sR * (uShrug * 16.0 - uTilt * 5.0 + uBreath * 1.5));
    d.x += shV * uShrug * 3.5 * (sL - sR);
    // upper body turns a little with the head: chest is nearer than the sides, so it slides further
    float bw = smoothstep(540.0, 700.0, p.y) * (1.0 - smoothstep(980.0, 1152.0, p.y));
    vec2 q2 = (p - vec2(478.0, 820.0)) / vec2(270.0, 320.0);
    float cz = sqrt(max(0.0, 1.0 - dot(q2, q2)));
    d.x += uBodyYaw * (bw * (5.0 + cz * 8.0) + headW * 5.0);
    vPx = p;
    vec2 w = p + d + uShift;
    // waving arm: the hand rocks at the wrist while the forearm swings from the elbow
    if (uArm > 0.5) {
      float hw = 1.0 - smoothstep(uWrist.y - 30.0, uWrist.y + 25.0, p.y);
      vec2 h = p - uWrist; float b = uHandA * hw;
      vec2 ap = uWrist + vec2(cos(b) * h.x - sin(b) * h.y, sin(b) * h.x + cos(b) * h.y);
      vec2 e = ap - uElbow;
      ap = uElbow + vec2(cos(uArmA) * e.x - sin(uArmA) * e.y, sin(uArmA) * e.x + cos(uArmA) * e.y);
      w += ap - p;
    }
    // slow weight shift: everything above the hips leans from a point just below the frame
    float lw = 1.0 - smoothstep(880.0, 1152.0, p.y);
    float la = uLean * lw; vec2 lr = w - vec2(478.0, 1180.0);
    w = vec2(478.0, 1180.0) + vec2(cos(la) * lr.x - sin(la) * lr.y, sin(la) * lr.x + cos(la) * lr.y);
    gl_Position = vec4(w.x * uFit.x + uFit.z, w.y * uFit.y + uFit.w, 0.0, 1.0);
  }`;
  // Fragment shader: paints the moving irises inside the eye openings, and the eyelids when she blinks.
  const FS = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform sampler2D tBase, tOrig, tMask;
  uniform vec2 uImg, uGaze, uC0, uC1, uLR0, uLR1;
  uniform vec4 uT0, uT1, uB0, uB1;
  uniform float uT0e, uT1e, uB0e, uB1e, uClose, uR, uAlpha, uEyes;
  varying vec2 vPx;
  float poly(vec4 c, float e, float t) { return c.x + t * (c.y + t * (c.z + t * (c.w + t * e))); }
  void main() {
    vec2 uv = vPx / uImg;
    vec4 col = texture2D(tBase, uv);
    float m = texture2D(tMask, uv).r * uEyes;
    if (m > 0.0) {
      bool left = vPx.x < 482.0;
      vec2 C = left ? uC0 : uC1;
      vec2 ip = vPx - uGaze;
      float ia = 1.0 - smoothstep(uR - 0.8, uR + 0.8, distance(ip, C));
      col = mix(col, texture2D(tOrig, ip / uImg), ia * m);
      if (uClose > 0.01) {
        vec2 lr = left ? uLR0 : uLR1;
        float t = clamp((vPx.x - lr.x) / (lr.y - lr.x), 0.0, 1.0);
        float top = left ? poly(uT0, uT0e, t) : poly(uT1, uT1e, t);
        float bot = left ? poly(uB0, uB0e, t) : poly(uB1, uB1e, t);
        float ly = mix(top - 3.0, bot + 2.5, uClose);
        float cover = 1.0 - smoothstep(ly - 0.8, ly + 0.8, vPx.y);
        float edge = 1.0 - smoothstep(0.9, 2.3, abs(vPx.y - ly));
        float k = clamp((vPx.y - top) / max(ly - top, 1.0), 0.0, 1.0);
        vec3 skin = mix(vec3(0.925, 0.725, 0.62), vec3(0.80, 0.54, 0.44), k * k);
        vec3 lc = mix(skin, vec3(0.16, 0.09, 0.07), edge);
        col = mix(col, vec4(lc, 1.0), max(cover, edge) * m);
      }
    }
    gl_FragColor = col * uAlpha;
  }`;
  function sh(type, src) { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; }
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); } catch (err) { console.warn(err); return; }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  const U = new Proxy({}, { get: (c, n) => c[n] || (c[n] = gl.getUniformLocation(prog, n)) });

  // ---------- mesh: a fine grid over the picture ----------
  const NX = 64, NY = 80, verts = [], idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) verts.push(i / NX * IMG_W, j / NY * IMG_H);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const COUNT = idx.length;

  // ---------- textures ----------
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function tex(unit, im) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // ---------- static uniforms ----------
  gl.uniform2f(U.uImg, IMG_W, IMG_H); gl.uniform1f(U.uR, 22.5);
  [['L', 0], ['R', 1]].forEach(([n, k]) => {
    const f = FITS[n];
    gl.uniform2f(U['uC' + k], f.c[0], f.c[1]);
    gl.uniform2f(U['uLR' + k], f.lr[0], f.lr[1]);
    gl.uniform4f(U['uT' + k], f.top[0], f.top[1], f.top[2], f.top[3]); gl.uniform1f(U['uT' + k + 'e'], f.top[4]);
    gl.uniform4f(U['uB' + k], f.bot[0], f.bot[1], f.bot[2], f.bot[3]); gl.uniform1f(U['uB' + k + 'e'], f.bot[4]);
  });
  gl.uniform1i(U.tBase, 0); gl.uniform1i(U.tOrig, 1); gl.uniform1i(U.tMask, 2);
  gl.uniform2f(U.uElbow, 235, 1060); gl.uniform2f(U.uWrist, 205, 748);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform4f(U.uFit, 2 / IMG_W, -2 / IMG_H, -1, 1);
  }
  new ResizeObserver(resize).observe(canvas);

  // ---------- behaviour ----------
  const EYE_X = 482, EYE_Y = 331;
  const s = {
    gx: 0, gy: 0, egx: 0, egy: 0,          // where she's looking (-1..1) and eased eye position
    yaw: 0, pitch: 0, roll: 0, smile: 0, smileT: 0, shrug: 0, tilt: 0, shrugAt: -1e9,
    last: -1e9, idleNext: 0, blinkAt: performance.now() + 1600, blinkT: -1, double: false, hover: false, happyUntil: 0
  };
  function lookAt(x, y) {
    const r = canvas.getBoundingClientRect();
    const ex = r.left + EYE_X / IMG_W * r.width, ey = r.top + EYE_Y / IMG_H * r.height;
    const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 280);
    s.gx = dx / d * k; s.gy = dy / d * k; s.last = performance.now();
  }
  window.addEventListener('pointermove', (e) => {
    lookAt(e.clientX, e.clientY);
    s.px = (e.clientX / innerWidth) * 2 - 1;
    hero.style.setProperty('--px', s.px.toFixed(3));
    hero.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  }, { passive: true });
  figure.addEventListener('pointerenter', () => { s.hover = true; });
  figure.addEventListener('pointerleave', () => { s.hover = false; });
  document.querySelectorAll('.icon').forEach(a => {
    const on = () => { const r = a.getBoundingClientRect(); lookAt(r.left + r.width / 2, r.top + r.height / 2); s.happyUntil = performance.now() + 900; };
    a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
  });
  // ---------- the wave ----------
  const bubble = document.querySelector('.bubble');
  let bubbleTimer;
  function say(html, ms) {
    bubble.innerHTML = html; bubble.classList.add('show');
    clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }
  const W = { start: -1, fadeIn: false };
  const RAISE = 380, WAVE = 2100, LOWER = 420;
  function wave(fadeIn) {
    if (W.start >= 0) return;
    W.start = performance.now(); W.fadeIn = fadeIn;
    say(fadeIn ? 'Hi again! 👋' : 'Hi! 👋 <span>I\'m Aleena</span>', (fadeIn ? RAISE : 0) + WAVE + 200);
  }
  // returns how visible the waving picture is, and the arm and hand angles
  function waveState(t) {
    if (W.start < 0) return { mix: 0, arm: 0, hand: 0 };
    let p = t - W.start;
    const easeIO = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    if (W.fadeIn) {
      if (p < RAISE) { const k = easeIO(p / RAISE); return { mix: k, arm: -.55 * (1 - k), hand: 0 }; }
      p -= RAISE;
    }
    if (p < WAVE) {
      const ph = p / 1000 * Math.PI * 2 * 1.7, env = Math.min(1, p / 250) * Math.min(1, (WAVE - p) / 300);
      return { mix: 1, arm: .045 * Math.sin(ph) * env, hand: .17 * Math.sin(ph + .5) * env };
    }
    p -= WAVE;
    if (p < LOWER) { const k = easeIO(p / LOWER); return { mix: 1 - k, arm: -.55 * k, hand: 0 }; }
    W.start = -1; return { mix: 0, arm: 0, hand: 0 };
  }
  figure.addEventListener('click', () => {
    s.happyUntil = performance.now() + 1400;
    if (reduce) { say('Hi! 👋', 1800); return; }
    wave(true);
  });

  const ease = (cur, tgt, k) => cur + (tgt - cur) * k;
  // only animate while the hero is on screen, to save battery once visitors scroll down
  let onScreen = true, running = false;
  function frame(t) {
    if (!onScreen) { running = false; return; }
    const sec = t / 1000, calm = reduce ? 0.35 : 1;
    // idle: glance around on her own
    if (t - s.last > 2400 && t > s.idleNext) {
      const a = rand(0, Math.PI * 2), m = rand(.15, .8);
      s.gx = Math.cos(a) * m; s.gy = Math.sin(a) * m * .6;
      s.idleNext = t + rand(1400, 3200);
    }
    // eyes lead, the head follows a moment later and only partway
    s.egx = ease(s.egx, s.gx, .22); s.egy = ease(s.egy, s.gy, .22);
    const drift = Math.sin(sec * .7) * .08 + Math.sin(sec * 1.9) * .03;       // tiny living sway
    s.yaw = ease(s.yaw, (s.gx * .85 + drift) * calm, .06);
    s.pitch = ease(s.pitch, (s.gy * .7 + Math.sin(sec * .9) * .05) * calm, .06);
    s.roll = ease(s.roll, (-s.gx * .035 + Math.sin(sec * .6) * .012) * calm, .05);
    const happy = t < s.happyUntil;
    s.smileT = happy ? 1 : s.hover ? .7 : .12 + .12 * Math.max(0, Math.sin(sec * .35));
    s.smile = ease(s.smile, s.smileT * calm, .08);
    const breath = Math.sin(sec * 1.5) * calm;
    const sway = (Math.sin(sec * .8) * .6 + s.yaw * .5) * calm;
    // shrug: up quickly, hold a beat, settle down
    const sp = (t - s.shrugAt) / 900;
    const shrugT = sp < 0 || sp > 1 ? 0 : sp < .25 ? sp / .25 : sp < .5 ? 1 : 1 - (sp - .5) / .5;
    s.shrug = ease(s.shrug, shrugT, .25);
    // weight shifts from one shoulder to the other as she sways and turns
    s.tilt = ease(s.tilt, (Math.sin(sec * .8 + .6) * .5 + s.yaw * .6) * calm, .05);
    // the body follows the head a beat later, and sways gently from the hips
    s.bodyYaw = ease(s.bodyYaw || 0, s.yaw * .45 * calm, .035);
    // she leans toward the side the cursor is on, easing over slowly like a real weight shift
    s.lean = ease(s.lean || 0, (s.px || 0) * .022 * calm, .035);
    const lean = s.lean + (Math.sin(sec * .42) * .007 + Math.sin(sec * 1.1) * .002) * calm;

    // blinking (sometimes twice)
    if (s.blinkT < 0 && t > s.blinkAt) { s.blinkT = t; s.double = Math.random() < .2; }
    let close = 0;
    if (s.blinkT >= 0 && t >= s.blinkT) {
      const p = (t - s.blinkT) / 170;
      if (p >= 1) { if (s.double) { s.double = false; s.blinkT = t + 90; } else { s.blinkT = -1; s.blinkAt = t + rand(2400, 5600); } }
      else close = p < .4 ? p / .4 : 1 - (p - .4) / .6;
    }
    // smiling squints the eyes a touch
    close = Math.max(close, s.smile * .12);

    gl.uniform1f(U.uYaw, s.yaw); gl.uniform1f(U.uPitch, s.pitch); gl.uniform1f(U.uRoll, s.roll);
    gl.uniform1f(U.uSmile, s.smile); gl.uniform1f(U.uBreath, breath); gl.uniform1f(U.uSway, sway);
    gl.uniform1f(U.uShrug, s.shrug); gl.uniform1f(U.uTilt, s.tilt);
    gl.uniform1f(U.uBodyYaw, s.bodyYaw); gl.uniform1f(U.uLean, lean);
    gl.uniform2f(U.uGaze, s.egx * 6.5, s.egy * 4 + close * 2);
    gl.uniform1f(U.uClose, close);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const wv = waveState(t);
    if (wv.mix < 1) {
      gl.uniform1i(U.tBase, 0); gl.uniform1f(U.uEyes, 1); gl.uniform1f(U.uArm, 0); gl.uniform1f(U.uAlpha, 1); gl.uniform2f(U.uShift, 0, 0);
      gl.drawElements(gl.TRIANGLES, COUNT, gl.UNSIGNED_SHORT, 0);
    }
    if (wv.mix > 0) {
      // the waving picture keeps her breathing and gentle lean, but not the face rig
      gl.uniform1f(U.uYaw, 0); gl.uniform1f(U.uPitch, 0); gl.uniform1f(U.uRoll, 0); gl.uniform1f(U.uSmile, 0);
      gl.uniform1f(U.uShrug, 0); gl.uniform1f(U.uTilt, 0); gl.uniform1f(U.uBodyYaw, 0); gl.uniform1f(U.uClose, 0);
      gl.uniform1f(U.uEyes, 0); gl.uniform1f(U.uAlpha, wv.mix); gl.uniform2f(U.uShift, -1.7, 2.5);
      gl.uniform1i(U.tBase, 3); gl.uniform1f(U.uArm, 0);
      gl.drawElements(gl.TRIANGLES, COUNT, gl.UNSIGNED_SHORT, 0);
      gl.uniform1f(U.uAlpha, wv.mix * wv.mix);   // the arm clears a little ahead of the body
      gl.uniform1i(U.tBase, 4); gl.uniform1f(U.uArm, 1); gl.uniform1f(U.uArmA, wv.arm); gl.uniform1f(U.uHandA, wv.hand);
      gl.drawElements(gl.TRIANGLES, COUNT, gl.UNSIGNED_SHORT, 0);
    }
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
  // pause once she's off screen, or covered by the page that slides over the home page
  let inView = true;
  const cover = document.querySelector('main > .block');
  const check = () => {
    onScreen = inView && !(cover && cover.getBoundingClientRect().top <= 0);
    if (onScreen && figure.classList.contains('live')) start();
  };
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; check(); }).observe(hero);
  window.addEventListener('scroll', check, { passive: true });

  Promise.all([load(SRC.base), load(SRC.orig), load(SRC.mask), load(SRC.waveBody), load(SRC.waveArm)]).then(([b, o, m, wb, wa]) => {
    tex(0, b); tex(1, o); tex(2, m); tex(3, wb); tex(4, wa);
    resize();
    // she opens by waving hello, then settles into the calm pose
    if (!reduce) wave(false); else say('Hi! 👋 <span>I\'m Aleena</span>', 2600);
    figure.classList.add('live');
    start();
  }).catch(err => console.warn(err));
})();
