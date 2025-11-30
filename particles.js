// Multi-theme Visual Effects
(function() {
  'use strict';

  // Available themes: particles, paint, aurora, lava, ocean, nebula, fireflies
  let currentMode = 'particles';
  let animationId;
  let canvas, ctx, gl;
  let particles = [];
  let mouse = { x: null, y: null };
  let smoothMouse = { x: 0, y: 0 }; // smoothly follows real mouse
  let nebulaMouse = { x: 0, y: 0 }; // even slower for nebula black hole
  let shaderProgram, timeUniform, resolutionUniform, mouseUniform;
  let startTime;

  const themes = [
    { id: 'particles', name: 'Particles', icon: '✨' },
    { id: 'paint', name: 'Paint', icon: '🎨' },
    { id: 'aurora', name: 'Aurora', icon: '🌌' },
    { id: 'lava', name: 'Lava', icon: '🌋' },
    { id: 'ocean', name: 'Ocean', icon: '🌊' },
    { id: 'nebula', name: 'Nebula', icon: '🔮' },
    { id: 'fireflies', name: 'Fireflies', icon: '🌙' },
    { id: 'grid', name: 'Grid', icon: '⚡' }
  ];

  const particleConfig = {
    particleCount: 100,
    minSize: 2,
    maxSize: 6,
    minSpeed: 0.3,
    maxSpeed: 1.5,
    colors: [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894', '#e17055',
      '#fdcb6e', '#81ecec', '#74b9ff', '#ff7675', '#55efc4'
    ],
    glowIntensity: 20,
    connectionDistance: 120,
    mouseRadius: 150
  };

  // ============ PARTICLES MODE ============
  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * (particleConfig.maxSize - particleConfig.minSize) + particleConfig.minSize;
      this.baseSize = this.size;
      this.speedX = (Math.random() - 0.5) * particleConfig.maxSpeed;
      this.speedY = (Math.random() - 0.5) * particleConfig.maxSpeed;
      this.color = particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)];
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
    }

    update() {
      this.pulse += this.pulseSpeed;
      this.size = this.baseSize * (0.8 + Math.sin(this.pulse) * 0.3);

      if (mouse.x !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < particleConfig.mouseRadius) {
          const force = (particleConfig.mouseRadius - distance) / particleConfig.mouseRadius;
          const angle = Math.atan2(dy, dx);
          this.speedX -= Math.cos(angle) * force * 0.8;
          this.speedY -= Math.sin(angle) * force * 0.8;
        }
      }

      this.x += this.speedX;
      this.y += this.speedY;
      this.speedX *= 0.99;
      this.speedY *= 0.99;
      this.speedX += (Math.random() - 0.5) * 0.05;
      this.speedY += (Math.random() - 0.5) * 0.05;

      const speed = Math.sqrt(this.speedX ** 2 + this.speedY ** 2);
      if (speed > particleConfig.maxSpeed) {
        this.speedX = (this.speedX / speed) * particleConfig.maxSpeed;
        this.speedY = (this.speedY / speed) * particleConfig.maxSpeed;
      }
      if (speed < particleConfig.minSpeed) {
        const angle = Math.random() * Math.PI * 2;
        this.speedX += Math.cos(angle) * 0.1;
        this.speedY += Math.sin(angle) * 0.1;
      }

      if (this.x < -50) this.x = canvas.width + 50;
      if (this.x > canvas.width + 50) this.x = -50;
      if (this.y < -50) this.y = canvas.height + 50;
      if (this.y > canvas.height + 50) this.y = -50;
    }

    draw() {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
      gradient.addColorStop(0, this.color + 'CC');
      gradient.addColorStop(0.5, this.color + '40');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = particleConfig.glowIntensity;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < particleConfig.connectionDistance) {
          const opacity = (1 - distance / particleConfig.connectionDistance) * 0.4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);

          const gradient = ctx.createLinearGradient(particles[i].x, particles[i].y, particles[j].x, particles[j].y);
          gradient.addColorStop(0, particles[i].color + Math.floor(opacity * 255).toString(16).padStart(2, '0'));
          gradient.addColorStop(1, particles[j].color + Math.floor(opacity * 255).toString(16).padStart(2, '0'));

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  function animateParticles() {
    if (currentMode !== 'particles') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawConnections();
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    animationId = requestAnimationFrame(animateParticles);
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < particleConfig.particleCount; i++) {
      particles.push(new Particle());
    }
  }

  // ============ FIREFLIES MODE ============
  let fireflies = [];

  class Firefly {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 2;
      this.speedX = (Math.random() - 0.5) * 0.8;
      this.speedY = (Math.random() - 0.5) * 0.8;
      this.glowPhase = Math.random() * Math.PI * 2;
      this.glowSpeed = Math.random() * 0.03 + 0.01;
      this.maxGlow = Math.random() * 0.5 + 0.5;
      this.color = Math.random() > 0.3 ? '#ffff88' : (Math.random() > 0.5 ? '#88ffaa' : '#aaffff');
      this.trail = [];
      this.trailLength = Math.floor(Math.random() * 10) + 5;
    }

    update() {
      this.glowPhase += this.glowSpeed;

      // Wandering movement
      this.speedX += (Math.random() - 0.5) * 0.1;
      this.speedY += (Math.random() - 0.5) * 0.1;
      this.speedX *= 0.98;
      this.speedY *= 0.98;

      // Mouse attraction
      if (mouse.x !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 50) {
          this.speedX += (dx / dist) * 0.05;
          this.speedY += (dy / dist) * 0.05;
        }
      }

      this.x += this.speedX;
      this.y += this.speedY;

      // Trail
      this.trail.unshift({ x: this.x, y: this.y, glow: this.getGlow() });
      if (this.trail.length > this.trailLength) this.trail.pop();

      // Wrap
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }

    getGlow() {
      return (Math.sin(this.glowPhase) * 0.5 + 0.5) * this.maxGlow;
    }

    draw() {
      const glow = this.getGlow();

      // Draw trail
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const alpha = (1 - i / this.trail.length) * 0.3 * t.glow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Draw glow
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 8 * glow);
      gradient.addColorStop(0, this.color + Math.floor(glow * 200).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.5, this.color + Math.floor(glow * 80).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 8 * glow, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * glow, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  // ============ GRID MODE ============
  let gridDots = [];
  let gridTime = 0;

  const gridConfig = {
    spacing: 30,
    dotSize: 1.5,
    mouseRadius: 120,
    returnSpeed: 0.08
  };

  class GridDot {
    constructor(x, y) {
      this.originX = x;
      this.originY = y;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.displaced = 0;
    }

    update() {
      const dx = mouse.x - this.originX;
      const dy = mouse.y - this.originY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (mouse.x !== null && dist < gridConfig.mouseRadius) {
        const force = (gridConfig.mouseRadius - dist) / gridConfig.mouseRadius;
        const angle = Math.atan2(dy, dx);

        // Push away with ripple
        const ripple = Math.sin(dist * 0.1 - gridTime * 3) * 0.3 + 0.7;
        this.vx -= Math.cos(angle) * force * 4 * ripple;
        this.vy -= Math.sin(angle) * force * 4 * ripple;

        // Turbulence
        this.vx += (Math.random() - 0.5) * force * 2;
        this.vy += (Math.random() - 0.5) * force * 2;

        this.displaced = Math.min(1, this.displaced + 0.1);
      }

      // Return to origin
      this.vx += (this.originX - this.x) * gridConfig.returnSpeed;
      this.vy += (this.originY - this.y) * gridConfig.returnSpeed;

      // Damping
      this.vx *= 0.9;
      this.vy *= 0.9;

      this.x += this.vx;
      this.y += this.vy;

      this.displaced *= 0.97;
    }

    draw() {
      const distFromOrigin = Math.sqrt(
        Math.pow(this.x - this.originX, 2) +
        Math.pow(this.y - this.originY, 2)
      );

      const t = Math.min(1, distFromOrigin / 50);

      if (distFromOrigin < 1) {
        // At rest - dim gray dot
        ctx.beginPath();
        ctx.arc(this.x, this.y, gridConfig.dotSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 120, 180, 0.3)';
        ctx.fill();
      } else {
        // Displaced - rainbow color based on distance
        const hue = distFromOrigin * 4 % 360;
        const saturation = 80;
        const lightness = 50 + t * 20;
        const alpha = 0.5 + t * 0.5;

        ctx.beginPath();
        ctx.arc(this.x, this.y, gridConfig.dotSize + t * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.fill();
      }
    }
  }

  function initGrid() {
    gridDots = [];
    const cols = Math.ceil(canvas.width / gridConfig.spacing) + 1;
    const rows = Math.ceil(canvas.height / gridConfig.spacing) + 1;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        gridDots.push(new GridDot(i * gridConfig.spacing, j * gridConfig.spacing));
      }
    }
  }

  function animateGrid() {
    if (currentMode !== 'grid') return;
    gridTime += 0.05;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    gridDots.forEach(dot => {
      dot.update();
      dot.draw();
    });

    animationId = requestAnimationFrame(animateGrid);
  }

  function animateFireflies() {
    if (currentMode !== 'fireflies') return;

    // Dark forest background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0a12');
    bgGradient.addColorStop(0.5, '#0d1a0d');
    bgGradient.addColorStop(1, '#050a05');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fireflies.forEach(f => {
      f.update();
      f.draw();
    });

    animationId = requestAnimationFrame(animateFireflies);
  }

  function initFireflies() {
    fireflies = [];
    for (let i = 0; i < 80; i++) {
      fireflies.push(new Firefly());
    }
  }

  // ============ LAVA LAMP MODE (WebGL) ============
  // Moved to shaders object below

  // ============ SHADER THEMES ============
  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Common shader functions
  const shaderCommon = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 6; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }
  `;

  const shaders = {
    paint: shaderCommon + `
      vec3 palette(float t) {
        vec3 a = vec3(0.15, 0.1, 0.2);
        vec3 b = vec3(0.2, 0.15, 0.25);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.0, 0.33, 0.67);
        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float t = u_time * 0.2;

        vec2 mouseNorm = u_mouse / u_resolution;
        mouseNorm = mouseNorm * 2.0 - 1.0;
        mouseNorm.x *= u_resolution.x / u_resolution.y;
        float mouseDist = length(p - mouseNorm);
        float mouseInfluence = smoothstep(1.2, 0.0, mouseDist) * 0.4;

        vec2 q = vec2(fbm(p * 0.8 + t * 0.08), fbm(p * 0.8 + vec2(1.0)));
        vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + 0.12 * t), fbm(p + q + vec2(8.3, 2.8) + 0.1 * t));
        float f = fbm(p + r + mouseInfluence);

        vec3 color1 = vec3(0.08, 0.12, 0.22);
        vec3 color2 = vec3(0.18, 0.08, 0.28);
        vec3 color3 = vec3(0.05, 0.18, 0.22);
        vec3 color4 = vec3(0.22, 0.12, 0.32);

        vec3 color = mix(color1, color2, clamp((f*f)*4.0, 0.0, 1.0));
        color = mix(color, color3, clamp(length(q) * 0.8, 0.0, 1.0));
        color = mix(color, color4, clamp(length(r.x) * 0.7, 0.0, 1.0));

        vec3 accent = palette(f + t * 0.1 + mouseInfluence);
        color = mix(color, accent, 0.4);

        float highlight = smoothstep(0.2, 0.7, f) * 0.25;
        color += vec3(0.3, 0.5, 0.6) * highlight;

        float vignette = 1.0 - smoothstep(0.5, 2.0, length(p * 0.5));
        color *= vignette * 0.25 + 0.75;
        color = clamp(color, vec3(0.06, 0.06, 0.1), vec3(0.45, 0.45, 0.55));

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    aurora: shaderCommon + `
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float t = u_time * 0.15;

        // Dark sky background
        vec3 skyColor = mix(vec3(0.02, 0.02, 0.06), vec3(0.05, 0.02, 0.08), uv.y);

        // Stars
        float stars = 0.0;
        for (float i = 0.0; i < 3.0; i++) {
          vec2 starUV = p * (10.0 + i * 20.0);
          float star = snoise(starUV + i * 100.0);
          star = smoothstep(0.85, 0.95, star);
          stars += star * (0.5 + 0.5 * sin(t * 2.0 + i));
        }
        skyColor += vec3(0.8, 0.9, 1.0) * stars * 0.3;

        // Aurora layers
        float aurora = 0.0;
        vec3 auroraColor = vec3(0.0);

        for (float i = 0.0; i < 5.0; i++) {
          float offset = i * 0.2;
          float wave = sin(p.x * 2.0 + t + offset + fbm(vec2(p.x * 0.5, t * 0.3 + i))) * 0.3;
          float y = p.y - wave + 0.3 - i * 0.15;

          float band = smoothstep(0.4, 0.0, abs(y)) * smoothstep(-0.5, 0.2, y);
          band *= 0.5 + 0.5 * fbm(vec2(p.x * 3.0 + t, i));

          vec3 col;
          if (i < 2.0) col = vec3(0.2, 0.8, 0.3); // Green
          else if (i < 3.5) col = vec3(0.3, 0.5, 0.9); // Blue
          else col = vec3(0.7, 0.2, 0.6); // Purple/Pink

          auroraColor += col * band * (0.4 - i * 0.05);
          aurora += band;
        }

        // Mouse interaction - ripple effect
        vec2 mouseNorm = u_mouse / u_resolution * 2.0 - 1.0;
        mouseNorm.x *= u_resolution.x / u_resolution.y;
        float mouseDist = length(p - mouseNorm);
        float ripple = sin(mouseDist * 10.0 - t * 3.0) * smoothstep(1.0, 0.0, mouseDist) * 0.1;
        auroraColor += vec3(0.3, 0.6, 0.4) * ripple;

        vec3 color = skyColor + auroraColor;
        color = clamp(color, vec3(0.02), vec3(0.5, 0.6, 0.5));

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    lava: shaderCommon + `
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float t = u_time * 1.2;

        // Metaball field
        float m = 0.0;

        // Base pool - wide ellipse at bottom
        vec2 pool = vec2(0.0, 0.9);
        vec2 dp = p - pool;
        dp.x *= 0.4;
        m += 0.12 / (dot(dp, dp) + 0.01);

        // Wobbling pool surface
        float wobble = snoise(vec2(p.x * 2.0 + t * 0.3, t * 0.2)) * 0.08;
        vec2 pool2 = vec2(wobble, 0.75 + sin(t * 0.15) * 0.03);
        m += 0.06 / (length(p - pool2) + 0.01);

        // Blob 1 - random pulsating ellipse
        float y1 = sin(t * 0.13) * 0.6;
        float x1 = sin(t * 0.09) * 0.15;
        vec2 b1 = vec2(x1, y1);
        vec2 d1 = p - b1;
        float sx1 = 1.0 + snoise(vec2(t * 0.1, 1.0)) * 0.45;
        float sy1 = 1.0 + snoise(vec2(t * 0.1, 10.0)) * 0.45;
        d1 *= vec2(sx1, sy1);
        m += 0.035 / (dot(d1, d1) + 0.001);

        // Blob 2 - random pulsating ellipse
        float y2 = sin(t * 0.11 + 2.0) * 0.55;
        float x2 = sin(t * 0.08 + 1.0) * 0.12;
        vec2 b2 = vec2(x2, y2);
        vec2 d2 = p - b2;
        float sx2 = 1.0 + snoise(vec2(t * 0.09, 20.0)) * 0.4;
        float sy2 = 1.0 + snoise(vec2(t * 0.09, 30.0)) * 0.4;
        d2 *= vec2(sx2, sy2);
        m += 0.028 / (dot(d2, d2) + 0.001);

        // Blob 3 - random pulsating ellipse
        float y3 = sin(t * 0.09 + 4.0) * 0.5;
        float x3 = sin(t * 0.07 + 3.0) * 0.1;
        vec2 b3 = vec2(x3, y3);
        vec2 d3 = p - b3;
        float sx3 = 1.0 + snoise(vec2(t * 0.095, 40.0)) * 0.5;
        float sy3 = 1.0 + snoise(vec2(t * 0.095, 50.0)) * 0.5;
        d3 *= vec2(sx3, sy3);
        m += 0.024 / (dot(d3, d3) + 0.001);

        // Blob 4 - random pulsating ellipse
        float y4 = sin(t * 0.14 + 1.5) * 0.5;
        float x4 = sin(t * 0.1 + 5.0) * 0.18;
        vec2 b4 = vec2(x4, y4);
        vec2 d4 = p - b4;
        float sx4 = 1.0 + snoise(vec2(t * 0.105, 60.0)) * 0.42;
        float sy4 = 1.0 + snoise(vec2(t * 0.105, 70.0)) * 0.42;
        d4 *= vec2(sx4, sy4);
        m += 0.02 / (dot(d4, d4) + 0.001);

        // Blob 5 - random pulsating ellipse
        float y5 = sin(t * 0.1 + 3.5) * 0.45;
        float x5 = sin(t * 0.12 + 2.5) * 0.08;
        vec2 b5 = vec2(x5, y5);
        vec2 d5 = p - b5;
        float sx5 = 1.0 + snoise(vec2(t * 0.11, 80.0)) * 0.48;
        float sy5 = 1.0 + snoise(vec2(t * 0.11, 90.0)) * 0.48;
        d5 *= vec2(sx5, sy5);
        m += 0.018 / (dot(d5, d5) + 0.001);

        // Top pool - collects blobs at top
        vec2 top = vec2(sin(t * 0.07) * 0.1, -0.82 + sin(t * 0.09) * 0.05);
        vec2 dt = p - top;
        dt.x *= 0.5;
        m += 0.05 / (dot(dt, dt) + 0.01);

        // Mouse interaction - smoothed position comes from JS
        vec2 mousePos = u_mouse / u_resolution * 2.0 - 1.0;
        mousePos.x *= u_resolution.x / u_resolution.y;
        vec2 dm = p - mousePos;
        float sxm = 1.0 + snoise(vec2(t * 0.125, 100.0)) * 0.45;
        float sym = 1.0 + snoise(vec2(t * 0.125, 110.0)) * 0.45;
        dm *= vec2(sxm, sym);
        m += 0.04 / (dot(dm, dm) + 0.01);

        // Colors
        vec3 bg = vec3(0.03, 0.01, 0.02);
        vec3 glow1 = vec3(0.15, 0.03, 0.02);
        vec3 deep = vec3(0.35, 0.06, 0.02);
        vec3 mid = vec3(0.6, 0.15, 0.03);
        vec3 hot = vec3(0.9, 0.45, 0.08);
        vec3 core = vec3(1.0, 0.8, 0.35);

        // Smooth color transitions based on field intensity
        vec3 color = bg;
        color = mix(color, glow1, smoothstep(0.2, 0.5, m));
        color = mix(color, deep, smoothstep(0.4, 0.8, m));
        color = mix(color, mid, smoothstep(0.7, 1.2, m));
        color = mix(color, hot, smoothstep(1.0, 1.8, m));
        color = mix(color, core, smoothstep(1.6, 3.0, m));

        // Heat from bottom
        color += vec3(0.06, 0.015, 0.01) * uv.y * 0.5;

        color = clamp(color, vec3(0.02), vec3(0.62, 0.52, 0.38));

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    ocean: shaderCommon + `
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float t = u_time * 0.3;

        // Deep ocean gradient
        vec3 deepColor = vec3(0.0, 0.02, 0.08);
        vec3 midColor = vec3(0.0, 0.05, 0.15);
        vec3 shallowColor = vec3(0.0, 0.1, 0.2);

        vec3 baseColor = mix(deepColor, midColor, uv.y);
        baseColor = mix(baseColor, shallowColor, pow(uv.y, 2.0));

        // Caustics (light patterns)
        float caustic1 = snoise(p * 3.0 + vec2(t * 0.5, t * 0.3));
        float caustic2 = snoise(p * 4.0 - vec2(t * 0.4, t * 0.6));
        float caustic3 = snoise(p * 5.0 + vec2(t * 0.3, -t * 0.4));

        float caustics = (caustic1 + caustic2 + caustic3) / 3.0;
        caustics = smoothstep(-0.2, 0.5, caustics) * 0.3;
        caustics *= (0.5 + uv.y * 0.5); // Stronger at top

        vec3 causticColor = vec3(0.1, 0.3, 0.4) * caustics;

        // Light rays from surface
        float rays = 0.0;
        for (float i = 0.0; i < 5.0; i++) {
          float rayX = sin(i * 2.5 + t * 0.2) * 0.5;
          float rayWidth = 0.1 + sin(t * 0.5 + i) * 0.05;
          float ray = smoothstep(rayWidth, 0.0, abs(p.x - rayX));
          ray *= smoothstep(-1.0, 1.0, p.y);
          ray *= 0.1 + 0.1 * sin(p.y * 5.0 + t + i);
          rays += ray * 0.15;
        }
        vec3 rayColor = vec3(0.1, 0.2, 0.25) * rays;

        // Floating particles (plankton)
        float particles = 0.0;
        for (float i = 0.0; i < 4.0; i++) {
          vec2 particleUV = p * (5.0 + i * 3.0);
          particleUV.y += t * (0.2 + i * 0.1);
          float particle = snoise(particleUV);
          particle = smoothstep(0.7, 0.9, particle);
          particles += particle * 0.1;
        }
        vec3 particleColor = vec3(0.15, 0.25, 0.3) * particles;

        // Mouse creates bubble ripple
        vec2 mouseNorm = u_mouse / u_resolution * 2.0 - 1.0;
        mouseNorm.x *= u_resolution.x / u_resolution.y;
        float mouseDist = length(p - mouseNorm);
        float bubble = sin(mouseDist * 15.0 - t * 4.0) * smoothstep(0.8, 0.0, mouseDist) * 0.08;
        vec3 bubbleColor = vec3(0.1, 0.2, 0.25) * bubble;

        vec3 color = baseColor + causticColor + rayColor + particleColor + bubbleColor;

        // Vignette
        float vignette = 1.0 - smoothstep(0.5, 1.8, length(p * 0.6));
        color *= vignette * 0.3 + 0.7;

        color = clamp(color, vec3(0.0, 0.02, 0.05), vec3(0.2, 0.35, 0.45));

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    nebula: shaderCommon + `
      // Lighter fbm - 4 octaves instead of 6
      float fbmLight(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
          value += amplitude * snoise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= u_resolution.x / u_resolution.y;
        float t = u_time * 0.15;

        // Rotate the sky slowly around center (like Earth rotation)
        float rotSpeed = t * 0.03;
        float cosR = cos(rotSpeed);
        float sinR = sin(rotSpeed);
        vec2 rotP = vec2(p.x * cosR - p.y * sinR, p.x * sinR + p.y * cosR);

        // Deep space black background
        vec3 color = vec3(0.0, 0.0, 0.02);

        // Slowly drifting gas clouds (use lighter fbm)
        float gas1 = fbmLight(rotP * 1.5 + vec2(t * 0.05, t * 0.03));
        float gas2 = fbmLight(rotP * 2.0 + vec2(100.0 - t * 0.04, t * 0.02));
        float gas3 = fbmLight(rotP * 0.8 + vec2(t * 0.02, 50.0 + t * 0.03));

        // Nebula structure - slowly morphing pillars
        float pillars = fbmLight(vec2(rotP.x * 3.0, rotP.y * 1.0) + t * 0.04);
        pillars = pow(pillars * 0.5 + 0.5, 2.0);

        // Color the gas clouds
        vec3 purple = vec3(0.3, 0.1, 0.4);
        vec3 pink = vec3(0.5, 0.15, 0.3);
        vec3 blue = vec3(0.1, 0.2, 0.5);
        vec3 teal = vec3(0.1, 0.4, 0.4);
        vec3 orange = vec3(0.5, 0.2, 0.05);

        // Layer the colors with depth
        float density1 = smoothstep(0.1, 0.6, gas1) * 0.6;
        float density2 = smoothstep(0.2, 0.7, gas2) * 0.5;
        float density3 = smoothstep(0.0, 0.5, gas3) * 0.4;

        // Mix nebula colors
        color += purple * density1 * pillars;
        color += pink * density2 * (1.0 - pillars * 0.5);
        color += blue * density3;
        color += teal * smoothstep(0.3, 0.8, gas1 * gas2) * 0.3;
        color += orange * smoothstep(0.5, 0.9, pillars * gas1) * 0.2;

        // Pulsing emission regions
        float emission = smoothstep(0.6, 0.9, gas1 * gas2 + gas3 * 0.5);
        float pulse = sin(t * 0.5) * 0.15 + 0.85;
        color += vec3(0.4, 0.3, 0.5) * emission * 0.4 * pulse;

        // Dark dust lanes - slowly shifting
        float dust = snoise(rotP * 3.0 + vec2(30.0 + t * 0.02, 20.0));
        dust = smoothstep(0.2, 0.5, dust);
        color *= 1.0 - dust * 0.4;

        // Stars with twinkling (use rotated coordinates)
        float stars = 0.0;

        // Dim background stars
        float s1 = snoise(rotP * 50.0);
        float twinkle1 = sin(t * 3.0 + s1 * 50.0) * 0.3 + 0.7;
        stars += smoothstep(0.92, 0.95, s1) * 0.3 * twinkle1;

        // Medium stars
        float s2 = snoise(rotP * 30.0 + vec2(200.0, 100.0));
        float twinkle2 = sin(t * 4.0 + s2 * 40.0) * 0.25 + 0.75;
        stars += smoothstep(0.9, 0.95, s2) * 0.5 * twinkle2;

        // Bright stars with strong twinkle
        float s3 = snoise(rotP * 15.0 + vec2(50.0, 150.0));
        float twinkle3 = sin(t * 5.0 + s3 * 30.0) * 0.4 + 0.6;
        stars += smoothstep(0.88, 0.92, s3) * twinkle3;

        // Colored stars
        vec3 starColor = vec3(1.0, 1.0, 1.0);
        float colorVar = snoise(rotP * 20.0);
        if (colorVar > 0.3) starColor = vec3(1.0, 0.9, 0.8);
        if (colorVar < -0.3) starColor = vec3(0.8, 0.9, 1.0);

        color += starColor * stars;

        // Shooting stars / meteors
        for (float i = 0.0; i < 3.0; i++) {
          float period = 4.0 + i * 1.5;
          float shootTime = t * 1.2 + i * 5.0;
          float cycle = mod(shootTime, period);

          if (cycle < 1.0) {
            float progress = cycle;
            float seed = floor(shootTime / period);
            vec2 startPos = vec2(
              snoise(vec2(seed, i * 50.0)) * 1.8,
              0.85 + snoise(vec2(seed + 100.0, i * 50.0)) * 0.2
            );
            vec2 dir = normalize(vec2(0.6, -0.8));
            vec2 meteorPos = startPos + dir * progress * 2.0;

            float meteorDist = length(p - meteorPos);
            float meteor = 0.008 / (meteorDist + 0.005);
            color += vec3(1.0, 0.95, 0.85) * meteor * (1.0 - progress * 0.6);

            // Simpler tail - just 5 segments
            for (float j = 1.0; j < 6.0; j++) {
              vec2 tailPos = meteorPos - dir * j * 0.06;
              float tailDist = length(p - tailPos);
              float tail = 0.003 / (tailDist + 0.003);
              float fade = (1.0 - j / 6.0) * (1.0 - progress);
              color += vec3(0.5, 0.6, 1.0) * tail * fade * 0.5;
            }
          }
        }

        // Wandering bright star
        vec2 brightStar = vec2(
          sin(t * 0.1) * 0.8,
          cos(t * 0.08) * 0.5
        );
        float starGlow = 0.02 / (length(p - brightStar) + 0.02);
        float starPulse = sin(t * 2.0) * 0.3 + 0.7;
        color += vec3(0.8, 0.85, 1.0) * starGlow * 0.2 * starPulse;

        // Black hole at mouse - distorts space
        vec2 mouseNorm = u_mouse / u_resolution * 2.0 - 1.0;
        mouseNorm.x *= u_resolution.x / u_resolution.y;
        vec2 toMouse = p - mouseNorm;
        float mouseDist = length(toMouse);

        // Gravitational lensing - sample distorted position
        float lensStrength = 0.15 / (mouseDist + 0.1);
        vec2 lensOffset = normalize(toMouse) * lensStrength * 0.3;
        vec2 lensedP = p + lensOffset;

        // Re-sample stars at distorted position for lensing effect (with rotation)
        vec2 lensedRotP = vec2(lensedP.x * cosR - lensedP.y * sinR, lensedP.x * sinR + lensedP.y * cosR);
        float lensedStars = 0.0;
        float ls1 = snoise(lensedRotP * 50.0);
        lensedStars += smoothstep(0.92, 0.95, ls1) * 0.4;
        float ls2 = snoise(lensedRotP * 30.0 + vec2(200.0, 100.0));
        lensedStars += smoothstep(0.9, 0.95, ls2) * 0.6;
        float ls3 = snoise(lensedRotP * 15.0 + vec2(50.0, 150.0));
        lensedStars += smoothstep(0.88, 0.92, ls3) * 0.8;

        // Add lensed stars (brighter near black hole = Einstein ring effect)
        float ringEffect = smoothstep(0.3, 0.1, mouseDist) * smoothstep(0.05, 0.12, mouseDist);
        color += vec3(0.9, 0.95, 1.0) * lensedStars * ringEffect * 1.5;

        // Event horizon glow
        float horizon = 0.03 / (abs(mouseDist - 0.1) + 0.015);
        color += vec3(0.5, 0.25, 0.1) * horizon * 0.4;

        // Accretion disk
        float disk = smoothstep(0.18, 0.1, mouseDist) * smoothstep(0.04, 0.08, mouseDist);
        float diskAngle = atan(toMouse.y, toMouse.x) + t * 2.0;
        float diskPattern = sin(diskAngle * 4.0) * 0.5 + 0.5;
        color += vec3(1.0, 0.6, 0.2) * disk * diskPattern * 0.6;
        color += vec3(0.4, 0.5, 1.0) * disk * (1.0 - diskPattern) * 0.4;

        // Photon sphere - bright ring just outside event horizon
        float photonSphere = 0.02 / (abs(mouseDist - 0.06) + 0.008);
        color += vec3(1.0, 0.9, 0.7) * photonSphere * 0.2;

        // Dark center - event horizon
        float blackHole = smoothstep(0.06, 0.01, mouseDist);
        color *= 1.0 - blackHole;

        // Vignette
        float vig = 1.0 - length(p) * 0.3;
        color *= vig;

        color = clamp(color, vec3(0.0), vec3(0.55, 0.5, 0.6));

        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initWebGL(shaderSource) {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSource);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(shaderProgram));
      return false;
    }

    gl.useProgram(shaderProgram);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    timeUniform = gl.getUniformLocation(shaderProgram, 'u_time');
    resolutionUniform = gl.getUniformLocation(shaderProgram, 'u_resolution');
    mouseUniform = gl.getUniformLocation(shaderProgram, 'u_mouse');

    startTime = Date.now();
    return true;
  }

  function animateShader() {
    if (!['paint', 'aurora', 'lava', 'ocean', 'nebula'].includes(currentMode)) return;

    // Smoothly interpolate mouse position
    const targetX = mouse.x !== null ? mouse.x : canvas.width / 2;
    const targetY = mouse.y !== null ? mouse.y : canvas.height / 2;

    // Different smoothing for different modes
    const smoothing = currentMode === 'nebula' ? 0.008 : 0.003;
    smoothMouse.x += (targetX - smoothMouse.x) * smoothing;
    smoothMouse.y += (targetY - smoothMouse.y) * smoothing;

    const time = (Date.now() - startTime) / 1000;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(timeUniform, time);
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
    gl.uniform2f(mouseUniform, smoothMouse.x, canvas.height - smoothMouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animationId = requestAnimationFrame(animateShader);
  }

  // ============ MODE SWITCHING ============
  function switchMode(mode) {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    currentMode = mode;
    chrome.storage.local.set({ visualMode: mode });

    // Recreate canvas
    const oldCanvas = document.getElementById('particles-canvas');
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'particles-canvas';
    newCanvas.style.cssText = oldCanvas.style.cssText || `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    `;
    oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
    canvas = newCanvas;
    resizeCanvas();

    if (mode === 'particles') {
      ctx = canvas.getContext('2d');
      initParticles();
      animateParticles();
    } else if (mode === 'fireflies') {
      ctx = canvas.getContext('2d');
      initFireflies();
      animateFireflies();
    } else if (mode === 'grid') {
      ctx = canvas.getContext('2d');
      initGrid();
      animateGrid();
    } else if (shaders[mode]) {
      if (initWebGL(shaders[mode])) {
        animateShader();
      }
    }

    updateThemeSelector();
  }

  function updateThemeSelector() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentMode);
    });
  }

  // ============ UI ============
  function createThemeSelector() {
    const container = document.createElement('div');
    container.id = 'theme-selector';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 8px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    themes.forEach(theme => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn';
      btn.dataset.theme = theme.id;
      btn.title = theme.name;
      btn.innerHTML = theme.icon;
      btn.style.cssText = `
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = 'rgba(255, 255, 255, 0.2)';
          btn.style.transform = 'scale(1.1)';
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
          btn.style.transform = 'scale(1)';
        }
      });

      btn.addEventListener('click', () => switchMode(theme.id));

      container.appendChild(btn);
    });

    // Add styles for active state
    const style = document.createElement('style');
    style.textContent = `
      .theme-btn.active {
        background: rgba(255, 255, 255, 0.3) !important;
        transform: scale(1.1);
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(container);
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    createThemeSelector();

    window.addEventListener('resize', () => {
      resizeCanvas();
      if (currentMode === 'particles') initParticles();
      if (currentMode === 'fireflies') initFireflies();
      if (currentMode === 'grid') initGrid();
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    // Pause rendering when tab is not visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else {
        // Resume current mode
        switchMode(currentMode);
      }
    });

    chrome.storage.local.get(['visualMode'], (result) => {
      const savedMode = result.visualMode || 'particles';
      switchMode(savedMode);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.switchVisualMode = switchMode;
})();
