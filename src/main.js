import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================================
     1. Interactive Grey Smoke / Fog Trail following Mouse Cursor
     ========================================================================== */
  const smokeCanvas = document.getElementById('smokeCanvas');
  const sCtx = smokeCanvas ? smokeCanvas.getContext('2d') : null;
  let width = (smokeCanvas.width = window.innerWidth);
  let height = (smokeCanvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    if (!smokeCanvas) return;
    width = smokeCanvas.width = window.innerWidth;
    height = smokeCanvas.height = window.innerHeight;
  });

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

  const greySmokeTextures = [
    createGreySmokeTexture('rgba(105, 110, 120, 0.50)', 'rgba(72, 76, 84, 0.30)', 'rgba(42, 45, 50, 0.12)'),
    createGreySmokeTexture('rgba(118, 125, 136, 0.44)', 'rgba(82, 88, 98, 0.26)', 'rgba(48, 52, 60, 0.10)'),
    createGreySmokeTexture('rgba(90, 95, 105, 0.55)', 'rgba(60, 64, 72, 0.34)', 'rgba(34, 37, 42, 0.14)')
  ];

  const particles = [];
  const MAX_PARTICLES = 1400;

  class GreySmokeParticle {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.size = 58 + Math.random() * 52;
      this.maxSize = this.size * (2.8 + Math.random() * 1.5);
      this.growth = 0.4 + Math.random() * 0.45;
      this.alpha = 0.60 + Math.random() * 0.25;
      this.decay = 0.0013 + Math.random() * 0.0008;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.007;
      this.texture = greySmokeTextures[Math.floor(Math.random() * greySmokeTextures.length)];
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.992;
      this.vy = this.vy * 0.992 - 0.02;

      if (this.size < this.maxSize) {
        this.size += this.growth;
      }
      this.rotation += this.rotationSpeed;

      // Accelerated fade at high altitudes (makin ke atas makin pudar)
      const altitudeRatio = Math.max(0, (height * 0.6 - this.y) / (height * 0.6));
      const altitudeDecayMultiplier = 1 + altitudeRatio * 1.5;
      this.alpha -= this.decay * altitudeDecayMultiplier;
    }

    draw(context) {
      if (this.alpha <= 0) return;
      const verticalFade = Math.max(0, Math.min(1, (this.y - 30) / (height * 0.72)));
      const renderAlpha = this.alpha * Math.pow(verticalFade, 0.9);
      if (renderAlpha <= 0.005) return;

      context.save();
      context.globalAlpha = renderAlpha;
      context.translate(this.x, this.y);
      context.rotate(this.rotation);
      context.drawImage(this.texture, -this.size / 2, -this.size / 2, this.size, this.size);
      context.restore();
    }
  }

  let lastX = null;
  let lastY = null;
  let mouseNormX = 0;
  let mouseNormY = 0;

  function spawnSmoke(x, y, dx, dy) {
    const speed = Math.hypot(dx, dy);
    const count = Math.min(8, Math.max(3, Math.floor(speed * 0.35)));

    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * 22;
      const px = x + Math.cos(angle) * spread;
      const py = y + Math.sin(angle) * spread;
      const vx = dx * 0.07 + (Math.random() - 0.5) * 1.0;
      const vy = dy * 0.07 + (Math.random() - 0.5) * 1.0 - 0.2;
      particles.push(new GreySmokeParticle(px, py, vx, vy));
    }
  }

  window.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const currentY = e.clientY;

    mouseNormX = (currentX / window.innerWidth) * 2 - 1;
    mouseNormY = -(currentY / window.innerHeight) * 2 + 1;

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

  window.addEventListener('mouseleave', () => {
    lastX = null;
    lastY = null;
  });

  function animateSmoke() {
    if (sCtx) {
      sCtx.clearRect(0, 0, width, height);
      sCtx.globalCompositeOperation = 'source-over';
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          p.draw(sCtx);
        }
      }
    }
    requestAnimationFrame(animateSmoke);
  }
  animateSmoke();

  /* ==========================================================================
     2. Three.js 3D Kodam Stage (Dr. Doom - Burst Out Of Screen Effect)
     ========================================================================== */
  const threeCanvas = document.getElementById('threeCanvas');
  const inputSection = document.getElementById('inputSection');
  const kodamContainer = document.getElementById('kodamContainer');
  const nameInput = document.getElementById('nameInput');
  const enterBtn = document.getElementById('enterBtn');
  const backBtn = document.getElementById('backBtn');
  const userNameLabel = document.getElementById('userNameLabel');

  let scene, camera, renderer, characterGroup, platformGroup, mixer;
  let headBone = null;
  let neckBone = null;
  let targetHeadYaw = 0;
  let targetHeadPitch = 0;
  let actions = {};
  let baseScale = 1.0;
  let animPhase = 'OFF'; // 'WALKING', 'TURNING', 'IDLE', 'OFF'
  let animStartTime = 0;
  const WALK_DURATION = 2.2; // seconds walking in from side
  const TURN_DURATION = 0.8; // seconds turning to face camera

  function initThree() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // Atmospheric Lighting for Dr. Doom
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 3.0);
    dirLight.position.set(2, 6, 5);
    scene.add(dirLight);

    // Dr. Doom Emerald Sorcery Rim Lights
    const greenRimLight1 = new THREE.PointLight(0x2ecc71, 6.0, 18);
    greenRimLight1.position.set(-3.5, 1.5, 3);
    scene.add(greenRimLight1);

    const greenRimLight2 = new THREE.PointLight(0x00ff88, 5.0, 18);
    greenRimLight2.position.set(3.5, 1.0, 2);
    scene.add(greenRimLight2);

    const bottomGlow = new THREE.PointLight(0x1abc9c, 3.5, 12);
    bottomGlow.position.set(0, -3.5, 2);
    scene.add(bottomGlow);

    // -------------------------------------------------------------
    // Floor Platform (Pedestal under Dr. Doom)
    // -------------------------------------------------------------
    platformGroup = new THREE.Group();
    platformGroup.position.set(0, -2.38, 1.7);
    platformGroup.visible = false;
    scene.add(platformGroup);

    // Stone Pedestal base
    const cylGeo = new THREE.CylinderGeometry(2.1, 2.25, 0.28, 48);
    const cylMat = new THREE.MeshStandardMaterial({
      color: 0x131518,
      roughness: 0.75,
      metalness: 0.25
    });
    const platformBase = new THREE.Mesh(cylGeo, cylMat);
    platformGroup.add(platformBase);

    // Glowing Emerald Runic Ring
    const ringGeo = new THREE.RingGeometry(1.65, 1.85, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const runeRing = new THREE.Mesh(ringGeo, ringMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.145;
    platformGroup.add(runeRing);

    // Outer Antique Gold Ring
    const outerRingGeo = new THREE.RingGeometry(1.98, 2.06, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.145;
    platformGroup.add(outerRing);

    // Soft Ambient Contact Shadow
    const shadowGeo = new THREE.CircleGeometry(1.3, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050608,
      transparent: true,
      opacity: 0.6
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.146;
    platformGroup.add(shadow);

    // -------------------------------------------------------------
    // Character Group container
    // -------------------------------------------------------------
    characterGroup = new THREE.Group();
    characterGroup.visible = false;
    scene.add(characterGroup);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Load Dr. Doom 3D Model
    const loader = new GLTFLoader();
    loader.load(
      '/DrDoom.glb',
      (gltf) => {
        const model = gltf.scene;

        // Auto-center Dr. Doom mesh inside characterGroup
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // Turn Dr. Doom to face directly front-center towards the user
        model.rotation.y = -Math.PI / 2 + 0.38;

        // Normalize height to ~3.5 units for optimal framing
        const maxDim = Math.max(size.x, size.y, size.z);
        baseScale = 3.5 / maxDim;
        characterGroup.scale.setScalar(baseScale);
        characterGroup.add(model);

        // Find Head and Neck bones for realistic cursor tracking
        headBone = model.getObjectByName('Bip01 Head_07');
        neckBone = model.getObjectByName('Bip01 Neck_06');

        // Store all skeletal animation clips
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            actions[clip.name] = mixer.clipAction(clip);
          });
        }
      },
      undefined,
      (err) => {
        console.error('Error loading DrDoom.glb:', err);
      }
    );
  }

  initThree();

  const clock = new THREE.Clock();
  let hasCrossfadedToIdle = false;

  function animateThree() {
    requestAnimationFrame(animateThree);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (mixer) mixer.update(delta);

    if (characterGroup && characterGroup.visible && animPhase !== 'OFF') {
      const elapsed = elapsedTime - animStartTime;

      if (elapsed < WALK_DURATION) {
        // -----------------------------------------------------------
        // PHASE 1: WALKING FORWARD FROM THE SIDE
        // -----------------------------------------------------------
        animPhase = 'WALKING';
        const walkProgress = elapsed / WALK_DURATION;
        const walkEase = 1 - Math.pow(1 - walkProgress, 1.4);

        // Travels from side (-5.8) to center (0.0)
        characterGroup.position.x = -5.8 + 5.8 * walkEase;
        characterGroup.position.y = -0.65;
        characterGroup.position.z = 0.6 + 1.1 * walkEase;

        // Facing FORWARD in the direction of motion (Math.PI / 2 points him right!)
        characterGroup.rotation.y = Math.PI / 2;
        characterGroup.rotation.x = 0;

      } else if (elapsed < WALK_DURATION + TURN_DURATION) {
        // -----------------------------------------------------------
        // PHASE 2: TURNING TO FACE THE USER & CROSSFADING TO IDLE
        // -----------------------------------------------------------
        animPhase = 'TURNING';
        const turnElapsed = elapsed - WALK_DURATION;
        const turnProgress = Math.min(1, turnElapsed / TURN_DURATION);
        const turnEase = turnProgress * turnProgress * (3 - 2 * turnProgress);

        characterGroup.position.x = 0.0;
        characterGroup.position.y = -0.65;
        characterGroup.position.z = 1.7;

        // Smoothly rotates from side (+Math.PI / 2) to front (0.0)
        characterGroup.rotation.y = (Math.PI / 2) * (1 - turnEase);
        characterGroup.rotation.x = 0;

        // Crossfade from walk to idle smoothly
        if (!hasCrossfadedToIdle && actions['walk'] && actions['idle']) {
          actions['walk'].crossFadeTo(actions['idle'], 0.5, false);
          actions['idle'].reset().play();
          hasCrossfadedToIdle = true;
        }

      } else {
        // -----------------------------------------------------------
        // PHASE 3: STANDING IDLE & HEAD GAZE TRACKING CURSOR
        // -----------------------------------------------------------
        animPhase = 'IDLE';
        characterGroup.position.x = 0.0;
        characterGroup.position.z = 1.7;

        // Subtle breathing levitation
        const floatOffset = Math.sin((elapsed - WALK_DURATION - TURN_DURATION) * 1.5) * 0.04;
        characterGroup.position.y = -0.65 + floatOffset;

        // Subtle body shift
        characterGroup.rotation.y = THREE.MathUtils.lerp(characterGroup.rotation.y, mouseNormX * 0.12, 0.05);

        // Realistic Head & Neck Gaze Tracking following cursor
        targetHeadYaw = THREE.MathUtils.lerp(targetHeadYaw, -mouseNormX * 0.55, 0.08);
        targetHeadPitch = THREE.MathUtils.lerp(targetHeadPitch, mouseNormY * 0.28, 0.08);

        if (neckBone) {
          neckBone.rotateOnAxis(new THREE.Vector3(1, 0, 0), targetHeadYaw * 0.35);
          neckBone.rotateOnAxis(new THREE.Vector3(0, 1, 0), targetHeadPitch * 0.35);
        }
        if (headBone) {
          headBone.rotateOnAxis(new THREE.Vector3(1, 0, 0), targetHeadYaw * 0.65);
          headBone.rotateOnAxis(new THREE.Vector3(0, 1, 0), targetHeadPitch * 0.65);
        }
      }
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  animateThree();

  // Trigger Kodam Reveal
  function revealKodam() {
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      nameInput.focus();
      return;
    }

    userNameLabel.textContent = `KODAM DARI "${name.toUpperCase()}"`;

    // 1. Fade out the input UI
    inputSection.classList.add('fade-out');

    // 2. Activate the 3D Kodam display stage and floor platform
    kodamContainer.classList.remove('hidden');
    void kodamContainer.offsetWidth; // Force reflow
    kodamContainer.classList.add('active');

    if (platformGroup) {
      platformGroup.visible = true;
    }

    // 3. Trigger 3D Dr. Doom walking in from side sequence
    if (characterGroup) {
      characterGroup.visible = true;
      characterGroup.position.set(-5.8, -0.65, 0.6);
      characterGroup.rotation.set(0, Math.PI / 2, 0);

      hasCrossfadedToIdle = false;
      animStartTime = clock.getElapsedTime();
      animPhase = 'WALKING';

      // Start playing walk animation
      if (actions['idle']) actions['idle'].stop();
      if (actions['walk']) {
        actions['walk'].reset().play();
      }
    }
  }

  // Reset back to input screen
  function resetKodam() {
    kodamContainer.classList.remove('active');
    setTimeout(() => {
      kodamContainer.classList.add('hidden');
      inputSection.classList.remove('fade-out');
      animPhase = 'OFF';
      if (characterGroup) characterGroup.visible = false;
      if (platformGroup) platformGroup.visible = false;
      if (actions['walk']) actions['walk'].stop();
      if (actions['idle']) actions['idle'].stop();
      nameInput.value = '';
      nameInput.focus();
    }, 400);
  }

  // Event Listeners for submission
  if (enterBtn) {
    enterBtn.addEventListener('click', revealKodam);
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        revealKodam();
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', resetKodam);
  }
});

