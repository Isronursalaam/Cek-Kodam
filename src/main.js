// Interactive Grey Smoke / Fog Trail following Mouse Cursor
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('smokeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Resize canvas smoothly on window resize
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Pre-generate soft grey fog puff textures (no bright white blowouts)
  function createGreySmokeTexture(colorStopCenter, colorStopMid, colorStopOuter) {
    const puffCanvas = document.createElement('canvas');
    puffCanvas.width = 160;
    puffCanvas.height = 160;
    const pCtx = puffCanvas.getContext('2d');

    const grad = pCtx.createRadialGradient(80, 80, 0, 80, 80, 80);
    grad.addColorStop(0, colorStopCenter);
    grad.addColorStop(0.38, colorStopMid);
    grad.addColorStop(0.72, colorStopOuter);
    grad.addColorStop(1, 'rgba(12, 14, 17, 0)');

    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 160, 160);
    return puffCanvas;
  }

  // True grey fog palettes (slate grey, ash grey, charcoal mist)
  const greySmokeTextures = [
    // Medium Ash Grey Fog
    createGreySmokeTexture(
      'rgba(105, 110, 120, 0.50)',
      'rgba(72, 76, 84, 0.30)',
      'rgba(42, 45, 50, 0.12)'
    ),
    // Cool Slate Grey Fog
    createGreySmokeTexture(
      'rgba(118, 125, 136, 0.44)',
      'rgba(82, 88, 98, 0.26)',
      'rgba(48, 52, 60, 0.10)'
    ),
    // Deep Charcoal Mist
    createGreySmokeTexture(
      'rgba(90, 95, 105, 0.55)',
      'rgba(60, 64, 72, 0.34)',
      'rgba(34, 37, 42, 0.14)'
    )
  ];

  // Particle pool for lingering grey fog
  const particles = [];
  const MAX_PARTICLES = 1400;

  class GreySmokeParticle {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      // Thick plume size
      this.size = 58 + Math.random() * 52;
      this.maxSize = this.size * (2.8 + Math.random() * 1.5); // Billows into wide clouds
      this.growth = 0.4 + Math.random() * 0.45;
      // Controlled opacity for soft, authentic grey fog
      this.alpha = 0.60 + Math.random() * 0.25;
      // Slow decay rate so the fog lingers ~8-12 seconds
      this.decay = 0.0013 + Math.random() * 0.0008;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.007;
      this.texture = greySmokeTextures[Math.floor(Math.random() * greySmokeTextures.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      // Air drag & lazy subtle upward thermal float
      this.vx *= 0.992;
      this.vy = this.vy * 0.992 - 0.02;

      if (this.size < this.maxSize) {
        this.size += this.growth;
      }
      this.rotation += this.rotationSpeed;

      // Accelerate decay as smoke climbs higher up towards the top
      const altitudeRatio = Math.max(0, (height * 0.6 - this.y) / (height * 0.6));
      const altitudeDecayMultiplier = 1 + altitudeRatio * 1.5;
      this.alpha -= this.decay * altitudeDecayMultiplier;
    }

    draw(context) {
      if (this.alpha <= 0) return;

      // Vertical fading: higher up (smaller y) = much more faded
      // Smooth gradient from dense at bottom/mid to completely faded near top
      const verticalFade = Math.max(0, Math.min(1, (this.y - 30) / (height * 0.72)));
      const renderAlpha = this.alpha * Math.pow(verticalFade, 0.9);

      if (renderAlpha <= 0.005) return;

      context.save();
      context.globalAlpha = renderAlpha;
      context.translate(this.x, this.y);
      context.rotate(this.rotation);
      context.drawImage(
        this.texture,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
      context.restore();
    }
  }

  let lastX = null;
  let lastY = null;

  // Spawn grey fog particles along cursor trajectory
  function spawnSmoke(x, y, dx, dy) {
    const speed = Math.hypot(dx, dy);
    // Number of fog puffs proportional to movement speed
    const count = Math.min(8, Math.max(3, Math.floor(speed * 0.35)));

    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) {
        particles.shift();
      }

      // Organic dispersion cloud around cursor
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 22;
      const px = x + Math.cos(angle) * spread;
      const py = y + Math.sin(angle) * spread;

      // Soft momentum + billow dispersion
      const vx = dx * 0.07 + (Math.random() - 0.5) * 1.0;
      const vy = dy * 0.07 + (Math.random() - 0.5) * 1.0 - 0.2;

      particles.push(new GreySmokeParticle(px, py, vx, vy));
    }
  }

  // Mouse move listener with interpolation for seamless, continuous grey fog
  window.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const currentY = e.clientY;

    if (lastX !== null && lastY !== null) {
      const dist = Math.hypot(currentX - lastX, currentY - lastY);
      const steps = Math.max(1, Math.floor(dist / 6));

      for (let s = 1; s <= steps; s++) {
        const interpX = lastX + (currentX - lastX) * (s / steps);
        const interpY = lastY + (currentY - lastY) * (s / steps);
        const dx = (currentX - lastX) / steps;
        const dy = (currentY - lastY) / steps;
        spawnSmoke(interpX, interpY, dx, dy);
      }
    } else {
      spawnSmoke(currentX, currentY, 0, 0);
    }

    lastX = currentX;
    lastY = currentY;
  });

  // Reset last pos when mouse leaves window
  window.addEventListener('mouseleave', () => {
    lastX = null;
    lastY = null;
  });

  // Touch support for mobile devices
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;

      if (lastX !== null && lastY !== null) {
        spawnSmoke(currentX, currentY, currentX - lastX, currentY - lastY);
      }
      lastX = currentX;
      lastY = currentY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    lastX = null;
    lastY = null;
  });

  // Main Animation Loop
  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Use standard source-over blending so colors remain true dark/ash grey without glowing white
    ctx.globalCompositeOperation = 'source-over';

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      } else {
        p.draw(ctx);
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
});
