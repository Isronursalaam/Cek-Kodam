import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

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
     2. Three.js 3D Kodam Stage (Dr. Doom, Si Gendut, Hacker)
     ========================================================================== */
  const threeCanvas = document.getElementById('threeCanvas');
  const inputSection = document.getElementById('inputSection');
  const kodamContainer = document.getElementById('kodamContainer');
  const kodamTitleBig = document.getElementById('kodamTitleBig');
  const nameInput = document.getElementById('nameInput');
  const enterBtn = document.getElementById('enterBtn');
  const backBtn = document.getElementById('backBtn');
  const userNameLabel = document.getElementById('userNameLabel');
  const kodamRarityBadge = document.getElementById('kodamRarityBadge');
  const rarityTier = document.getElementById('rarityTier');
  const rarityRate = document.getElementById('rarityRate');

  const KODAMS = [
    {
      id: 'sigendut',
      name: 'SI GENDUT',
      tier: 'COMMON',
      percentage: 40,
      cumulative: 40, // 0 - 39 (40% drop chance)
      tierStyle: {
        border: '#7f8c8d',
        glow: 'rgba(127, 140, 141, 0.4)',
        color: '#dcdde1'
      },
      modelUrl: '/Si Gendut.glb',
      scale: 3.5,
      rotationY: -Math.PI / 2,
      headBoneName: null,
      neckBoneName: null,
      theme: {
        glow: 'rgba(255, 159, 67, 0.55)',
        glowBright: 'rgba(254, 202, 87, 0.35)',
        rim1: 0xff9f43,
        rim2: 0xfeca57,
        bottom: 0xee5253,
        rune: 0xff9f43,
        outerRing: 0xffd32a
      }
    },
    {
      id: 'daiciboba',
      name: 'DAICIBOBA',
      tier: 'RARE',
      percentage: 28,
      cumulative: 68, // 40 - 67 (28% drop chance)
      tierStyle: {
        border: '#0984e3',
        glow: 'rgba(9, 132, 227, 0.55)',
        color: '#74b9ff'
      },
      modelUrl: '/Daiciboba.glb',
      scale: 3.5,
      rotationY: -Math.PI / 2,
      headBoneName: null,
      neckBoneName: null,
      theme: {
        glow: 'rgba(52, 152, 219, 0.55)',
        glowBright: 'rgba(72, 219, 251, 0.35)',
        rim1: 0x3498db,
        rim2: 0x48dbfb,
        bottom: 0x0abde3,
        rune: 0x3498db,
        outerRing: 0x00d2d3
      }
    },
    {
      id: 'hacker',
      name: 'HACKER',
      tier: 'EPIC',
      percentage: 18,
      cumulative: 86, // 68 - 85 (18% drop chance)
      tierStyle: {
        border: '#00b894',
        glow: 'rgba(0, 184, 148, 0.55)',
        color: '#55efc4'
      },
      modelUrl: '/Hacker.glb',
      scale: 3.4,
      rotationY: -Math.PI / 2,
      headBoneName: null,
      neckBoneName: null,
      theme: {
        glow: 'rgba(0, 210, 211, 0.55)',
        glowBright: 'rgba(16, 172, 132, 0.35)',
        rim1: 0x00d2d3,
        rim2: 0x1dd1a1,
        bottom: 0x54a0ff,
        rune: 0x00f2fe,
        outerRing: 0x10ac84
      }
    },
    {
      id: 'drdoom',
      name: 'DR. DOOM',
      tier: 'LEGENDARY',
      percentage: 10,
      cumulative: 96, // 86 - 95 (10% drop chance)
      tierStyle: {
        border: '#fdcb6e',
        glow: 'rgba(253, 203, 110, 0.6)',
        color: '#ffeaa7'
      },
      modelUrl: '/DrDoom.glb',
      scale: 3.5,
      rotationY: -Math.PI / 2 + 0.38,
      headBoneName: 'Bip01 Head_07',
      neckBoneName: 'Bip01 Neck_06',
      theme: {
        glow: 'rgba(46, 204, 113, 0.45)',
        glowBright: 'rgba(0, 255, 136, 0.25)',
        rim1: 0x2ecc71,
        rim2: 0x00ff88,
        bottom: 0x1abc9c,
        rune: 0x2ecc71,
        outerRing: 0xd4af37
      }
    },
    {
      id: 'fufufafa',
      name: 'FUFUFAFA',
      tier: 'DIVINE',
      percentage: 4,
      cumulative: 100, // 96 - 99 (4% drop chance)
      tierStyle: {
        border: '#e056fd',
        glow: 'rgba(224, 86, 253, 0.65)',
        color: '#f8a5c2'
      },
      modelUrl: '/Fufufafa.glb',
      scale: 3.5,
      rotationY: -Math.PI / 2,
      headBoneName: null,
      neckBoneName: null,
      theme: {
        glow: 'rgba(155, 89, 182, 0.55)',
        glowBright: 'rgba(224, 86, 253, 0.35)',
        rim1: 0x9b59b6,
        rim2: 0xe056fd,
        bottom: 0x8854d0,
        rune: 0xbe2edd,
        outerRing: 0x686de0
      }
    }
  ];

  function getKodamForName(name) {
    const clean = name.trim().toLowerCase();

    // Direct keyword match for instant verification
    if (clean.includes('gendut') || clean.includes('gemuk') || clean.includes('fat') || clean.includes('gembrot')) {
      return KODAMS.find((k) => k.id === 'sigendut') || KODAMS[0];
    }
    if (clean.includes('daiciboba') || clean.includes('daici') || clean.includes('boba')) {
      return KODAMS.find((k) => k.id === 'daiciboba') || KODAMS[0];
    }
    if (clean.includes('hacker') || clean.includes('hekel') || clean.includes('cyber') || clean.includes('retas')) {
      return KODAMS.find((k) => k.id === 'hacker') || KODAMS[0];
    }
    if (clean.includes('fufufafa') || clean.includes('fufu') || clean.includes('fafa') || clean.includes('gibran') || clean.includes('samsul')) {
      return KODAMS.find((k) => k.id === 'fufufafa') || KODAMS[0];
    }
    if (clean.includes('doom') || clean.includes('dr doom') || clean.includes('doctor')) {
      return KODAMS.find((k) => k.id === 'drdoom') || KODAMS[0];
    }

    // Percentage drop roll (0 - 99) using consistent FNV-1a distribution
    let h = 0x811c9dc5;
    for (let i = 0; i < clean.length; i++) {
      h ^= clean.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const roll = Math.abs(h >>> 0) % 100;

    for (const kodam of KODAMS) {
      if (roll < kodam.cumulative) {
        return kodam;
      }
    }
    return KODAMS[0];
  }

  let scene, camera, renderer, characterGroup, platformGroup;
  let greenRimLight1, greenRimLight2, bottomGlow, runeRing, outerRing;
  let currentMixer = null;
  let currentActions = {};
  let currentHeadBone = null;
  let currentNeckBone = null;
  let targetHeadYaw = 0;
  let targetHeadPitch = 0;
  let animPhase = 'OFF'; // 'WALKING', 'TURNING', 'IDLE', 'OFF'
  let animStartTime = 0;
  const WALK_DURATION = 2.2; // seconds walking in from side
  const TURN_DURATION = 0.8; // seconds turning to face camera

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  const loadedModels = {};

  function loadKodamModel(kodam) {
    if (loadedModels[kodam.id]) {
      return Promise.resolve(loadedModels[kodam.id]);
    }

    return new Promise((resolve, reject) => {
      gltfLoader.load(
        kodam.modelUrl,
        (gltf) => {
          const model = gltf.scene;

          // Auto-center mesh inside model container
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          model.position.x = -center.x;
          model.position.y = -center.y;
          model.position.z = -center.z;
          model.rotation.y = kodam.rotationY;

          // Normalize height to optimal framing scale
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseScale = kodam.scale / maxDim;

          const modelGroup = new THREE.Group();
          modelGroup.scale.setScalar(baseScale);
          modelGroup.add(model);

          // Find head and neck bones if available
          const headBone = kodam.headBoneName ? model.getObjectByName(kodam.headBoneName) : null;
          const neckBone = kodam.neckBoneName ? model.getObjectByName(kodam.neckBoneName) : null;

          // Skeletal animation clips if available
          let mixer = null;
          const actions = {};
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
              actions[clip.name] = mixer.clipAction(clip);
            });
          }

          const data = {
            modelGroup,
            mixer,
            actions,
            headBone,
            neckBone
          };
          loadedModels[kodam.id] = data;
          resolve(data);
        },
        undefined,
        (err) => {
          console.error(`Error loading model ${kodam.modelUrl}:`, err);
          reject(err);
        }
      );
    });
  }

  function applyKodamTheme(kodam) {
    if (kodamTitleBig) {
      kodamTitleBig.textContent = kodam.name;
    }
    if (rarityTier) {
      rarityTier.textContent = kodam.tier;
    }
    if (rarityRate) {
      rarityRate.textContent = `${kodam.percentage}% DROP CHANCE`;
    }
    if (kodamRarityBadge && kodam.tierStyle) {
      kodamRarityBadge.style.setProperty('--rarity-border', kodam.tierStyle.border);
      kodamRarityBadge.style.setProperty('--rarity-glow', kodam.tierStyle.glow);
      kodamRarityBadge.style.setProperty('--rarity-color', kodam.tierStyle.color);
    }
    if (kodamContainer) {
      kodamContainer.style.setProperty('--glow-color', kodam.theme.glow);
      kodamContainer.style.setProperty('--glow-color-bright', kodam.theme.glowBright);
    }
    if (greenRimLight1) greenRimLight1.color.setHex(kodam.theme.rim1);
    if (greenRimLight2) greenRimLight2.color.setHex(kodam.theme.rim2);
    if (bottomGlow) bottomGlow.color.setHex(kodam.theme.bottom);
    if (runeRing) runeRing.material.color.setHex(kodam.theme.rune);
    if (outerRing) outerRing.material.color.setHex(kodam.theme.outerRing);
  }

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

    // Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 3.0);
    dirLight.position.set(2, 6, 5);
    scene.add(dirLight);

    greenRimLight1 = new THREE.PointLight(0x2ecc71, 6.0, 18);
    greenRimLight1.position.set(-3.5, 1.5, 3);
    scene.add(greenRimLight1);

    greenRimLight2 = new THREE.PointLight(0x00ff88, 5.0, 18);
    greenRimLight2.position.set(3.5, 1.0, 2);
    scene.add(greenRimLight2);

    bottomGlow = new THREE.PointLight(0x1abc9c, 3.5, 12);
    bottomGlow.position.set(0, -3.5, 2);
    scene.add(bottomGlow);

    // -------------------------------------------------------------
    // Floor Platform (Pedestal under Kodam)
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

    // Glowing Runic Ring
    const ringGeo = new THREE.RingGeometry(1.65, 1.85, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    runeRing = new THREE.Mesh(ringGeo, ringMat);
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
    outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
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

    // Preload all Kodam 3D models for instant reveal
    KODAMS.forEach((kodam) => {
      loadKodamModel(kodam).catch((err) => {
        console.warn(`Preload error for ${kodam.name}:`, err);
      });
    });
  }

  initThree();

  const clock = new THREE.Clock();
  let hasCrossfadedToIdle = false;

  function animateThree() {
    requestAnimationFrame(animateThree);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (currentMixer) currentMixer.update(delta);

    if (characterGroup && characterGroup.visible && animPhase !== 'OFF') {
      const elapsed = elapsedTime - animStartTime;

      if (elapsed < WALK_DURATION) {
        // -----------------------------------------------------------
        // PHASE 1: WALKING / GLIDING FORWARD FROM THE SIDE
        // -----------------------------------------------------------
        animPhase = 'WALKING';
        const walkProgress = elapsed / WALK_DURATION;
        const walkEase = 1 - Math.pow(1 - walkProgress, 1.4);

        // Travels from side (-5.8) to center (0.0)
        characterGroup.position.x = -5.8 + 5.8 * walkEase;
        // Subtle bobbing for static models without walking clip
        const bob = currentActions['walk'] ? 0 : Math.sin(walkProgress * Math.PI * 6) * 0.08;
        characterGroup.position.y = -0.65 + bob;
        characterGroup.position.z = 0.6 + 1.1 * walkEase;

        // Facing forward in the direction of motion
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
        if (!hasCrossfadedToIdle && currentActions['walk'] && currentActions['idle']) {
          currentActions['walk'].crossFadeTo(currentActions['idle'], 0.5, false);
          currentActions['idle'].reset().play();
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
        if (currentNeckBone || currentHeadBone) {
          targetHeadYaw = THREE.MathUtils.lerp(targetHeadYaw, -mouseNormX * 0.55, 0.08);
          targetHeadPitch = THREE.MathUtils.lerp(targetHeadPitch, mouseNormY * 0.28, 0.08);

          if (currentNeckBone) {
            currentNeckBone.rotateOnAxis(new THREE.Vector3(1, 0, 0), targetHeadYaw * 0.35);
            currentNeckBone.rotateOnAxis(new THREE.Vector3(0, 1, 0), targetHeadPitch * 0.35);
          }
          if (currentHeadBone) {
            currentHeadBone.rotateOnAxis(new THREE.Vector3(1, 0, 0), targetHeadPitch * 0.65);
            currentHeadBone.rotateOnAxis(new THREE.Vector3(0, 1, 0), targetHeadYaw * 0.65);
          }
        } else {
          // Interactive pitch tilting for static characters
          characterGroup.rotation.x = THREE.MathUtils.lerp(characterGroup.rotation.x, -mouseNormY * 0.08, 0.05);
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

    const selectedKodam = getKodamForName(name);
    userNameLabel.textContent = `KODAM DARI "${name.toUpperCase()}"`;
    applyKodamTheme(selectedKodam);

    // Clear any previous character in characterGroup
    while (characterGroup.children.length > 0) {
      characterGroup.remove(characterGroup.children[0]);
    }
    if (currentMixer) {
      currentMixer.stopAllAction();
    }

    // 1. Fade out the input UI
    inputSection.classList.add('fade-out');

    // 2. Activate the 3D Kodam display stage and floor platform
    kodamContainer.classList.remove('hidden');
    void kodamContainer.offsetWidth; // Force reflow
    kodamContainer.classList.add('active');

    if (platformGroup) {
      platformGroup.visible = true;
    }

    loadKodamModel(selectedKodam).then((data) => {
      currentMixer = data.mixer;
      currentActions = data.actions;
      currentHeadBone = data.headBone;
      currentNeckBone = data.neckBone;

      characterGroup.add(data.modelGroup);

      // 3. Trigger 3D Kodam walking / gliding in from side sequence
      characterGroup.visible = true;
      characterGroup.position.set(-5.8, -0.65, 0.6);
      characterGroup.rotation.set(0, Math.PI / 2, 0);

      hasCrossfadedToIdle = false;
      animStartTime = clock.getElapsedTime();
      animPhase = 'WALKING';

      // Start playing walk animation if available
      if (currentActions['idle']) currentActions['idle'].stop();
      if (currentActions['walk']) {
        currentActions['walk'].reset().play();
      }
    }).catch((err) => {
      console.error('Error revealing Kodam:', err);
    });
  }

  // Reset back to input screen
  function resetKodam() {
    kodamContainer.classList.remove('active');
    setTimeout(() => {
      kodamContainer.classList.add('hidden');
      inputSection.classList.remove('fade-out');
      animPhase = 'OFF';
      if (characterGroup) {
        characterGroup.visible = false;
        while (characterGroup.children.length > 0) {
          characterGroup.remove(characterGroup.children[0]);
        }
      }
      if (platformGroup) platformGroup.visible = false;
      if (currentActions['walk']) currentActions['walk'].stop();
      if (currentActions['idle']) currentActions['idle'].stop();
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

