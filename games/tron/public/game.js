(() => {
  const NEON_COLORS = [
    '#00f2fe',
    '#ff6a00',
    '#ff007f',
    '#00ff66',
    '#ffe600',
    '#a855f7',
    '#ff2a2a',
    '#38bdf8'
  ];

  const SVG_COPY = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const SVG_CHECK = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const SVG_BOLT = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const SVG_FLAME = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
  const SVG_SHIELD = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const SVG_VOL_ON = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const SVG_VOL_OFF = '<svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const lobbyOverlay = document.getElementById('lobbyOverlay');
  const gameHud = document.getElementById('gameHud');
  const playerNameInput = document.getElementById('playerNameInput');
  const colorPicker = document.getElementById('colorPicker');
  const btnQuickPlay = document.getElementById('btnQuickPlay');
  const btnCreateRoom = document.getElementById('btnCreateRoom');
  const roomCodeInput = document.getElementById('roomCodeInput');
  const btnJoinCode = document.getElementById('btnJoinCode');
  const lobbyError = document.getElementById('lobbyError');

  const roomBadge = document.getElementById('roomBadge');
  const roomCodeText = document.getElementById('roomCodeText');
  const copyHint = document.getElementById('copyHint');
  const btnCamToggle = document.getElementById('btnCamToggle');
  const btnAddBot = document.getElementById('btnAddBot');
  const btnRemoveBot = document.getElementById('btnRemoveBot');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const btnLeaveRoom = document.getElementById('btnLeaveRoom');

  const leaderboardList = document.getElementById('leaderboardList');
  const killFeed = document.getElementById('killFeed');
  const buffBanner = document.getElementById('buffBanner');
  const hudSpeedText = document.getElementById('hudSpeedText');
  const hudNitroText = document.getElementById('hudNitroText');
  const hudNitroFill = document.getElementById('hudNitroFill');
  const activePerks = document.getElementById('activePerks');

  const minimapCanvas = document.getElementById('minimapCanvas');
  const mCtx = minimapCanvas.getContext('2d');
  const container = document.getElementById('canvasContainer');

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================
  // WEB AUDIO SYNTHESIZER
  // ==========================================
  let soundEnabled = true;
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!soundEnabled) return;
    ensureAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'ramp' || type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.24);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'pickup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.18);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.38);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  }

  // ==========================================
  // CLIENT STATE & CUSTOMIZATION
  // ==========================================
  let selectedColor = localStorage.getItem('tron_color') || NEON_COLORS[0];
  playerNameInput.value = localStorage.getItem('tron_name') || '';

  function renderSwatches() {
    colorPicker.innerHTML = '';
    NEON_COLORS.forEach(c => {
      const el = document.createElement('div');
      el.className = 'color-swatch' + (c === selectedColor ? ' active' : '');
      el.style.backgroundColor = c;
      el.style.color = c;
      el.addEventListener('click', () => {
        selectedColor = c;
        localStorage.setItem('tron_color', c);
        renderSwatches();
      });
      colorPicker.appendChild(el);
    });
  }
  renderSwatches();

  // ==========================================
  // THREE.JS 3D SCENE SETUP
  // ==========================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030712);
  scene.fog = new THREE.FogExp2(0x030712, 0.0018);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 1400);
  camera.position.set(0, 55, 110);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.9);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
  dirLight.position.set(120, 220, 90);
  scene.add(dirLight);

  // Arena Floor, Grid & Boundary Walls Group
  let arenaSize = 680;
  const arenaGroup = new THREE.Group();
  scene.add(arenaGroup);

  function buildArena(size) {
    arenaSize = size;
    while (arenaGroup.children.length) arenaGroup.remove(arenaGroup.children[0]);

    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050b16,
      roughness: 0.3,
      metalness: 0.7
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.05;
    arenaGroup.add(floorMesh);

    const gridHelper = new THREE.GridHelper(size, 100, 0x00f2fe, 0x0f2942);
    gridHelper.position.y = 0.01;
    arenaGroup.add(gridHelper);

    const half = size / 2;
    const h = 8;
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00f2fe });

    const configs = [
      { x: 0, z: -half, w: size, ry: 0 },
      { x: 0, z: half, w: size, ry: 0 },
      { x: -half, z: 0, w: size, ry: Math.PI / 2 },
      { x: half, z: 0, w: size, ry: Math.PI / 2 }
    ];

    configs.forEach(cfg => {
      const g = new THREE.PlaneGeometry(cfg.w, h);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(cfg.x, h / 2, cfg.z);
      m.rotation.y = cfg.ry;
      arenaGroup.add(m);

      const edges = new THREE.EdgesGeometry(g);
      const line = new THREE.LineSegments(edges, edgeMat);
      line.position.copy(m.position);
      line.rotation.copy(m.rotation);
      arenaGroup.add(line);
    });
  }
  buildArena(arenaSize);

  // ==========================================
  // 3D SLOPED WEDGE & PYRAMID RAMPS BUILDER
  // ==========================================
  const rampsGroup = new THREE.Group();
  scene.add(rampsGroup);
  let rampsList = [];

  function createSlopedWedgeGeometry(length, height, width) {
    // 2D right-triangle profile in XY, extruded along Z (width)
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, height);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: width,
      bevelEnabled: false
    };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center along Z axis
    geo.translate(0, 0, -width / 2);
    return geo;
  }

  function buildRamps(ramps) {
    rampsList = ramps || [];
    while (rampsGroup.children.length) rampsGroup.remove(rampsGroup.children[0]);

    const slopeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide
    });
    const neonEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f2fe });
    const accentEdgeMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });

    rampsList.forEach(r => {
      const holder = new THREE.Group();
      holder.position.set(r.x, 0, r.z);

      const rampH = r.h || 4.2;

      if (r.omni) {
        // 4-Way 3D Pyramid Stunt Ramp (Accessible from any direction!)
        const radius = Math.max(r.w, r.d) * 0.68;
        const coneGeo = new THREE.ConeGeometry(radius, rampH, 4);
        coneGeo.rotateY(Math.PI / 4);
        const coneMesh = new THREE.Mesh(coneGeo, slopeMat);
        coneMesh.position.y = rampH / 2;
        holder.add(coneMesh);

        const edges = new THREE.EdgesGeometry(coneGeo);
        const line = new THREE.LineSegments(edges, accentEdgeMat);
        line.position.y = rampH / 2;
        holder.add(line);
      } else {
        // Directional 3D Sloped Wedge Ramp + Double-Sided Back Slope
        const length = Math.max(r.w, r.d);
        const width = Math.min(r.w, r.d);
        const wedgeGeo = createSlopedWedgeGeometry(length, rampH, width);
        const wedgeMesh = new THREE.Mesh(wedgeGeo, slopeMat);
        holder.rotation.y = -(r.dir || 0);
        holder.add(wedgeMesh);

        const edges = new THREE.EdgesGeometry(wedgeGeo);
        const line = new THREE.LineSegments(edges, neonEdgeMat);
        holder.add(line);
      }

      rampsGroup.add(holder);
    });
  }

  // ==========================================
  // 3D LIGHTCYCLE FACTORY
  // ==========================================
  function createLightcycleMesh(hexColor) {
    const group = new THREE.Group();
    const neonColor = new THREE.Color(hexColor);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.85
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 1.3), bodyMat);
    chassis.position.set(0, 1.1, 0);
    group.add(chassis);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 1.1), neonMat);
    canopy.position.set(0.2, 1.85, 0);
    group.add(canopy);

    const stripGeo = new THREE.BoxGeometry(4.5, 0.22, 1.42);
    const strip = new THREE.Mesh(stripGeo, neonMat);
    strip.position.set(0, 1.15, 0);
    group.add(strip);

    const wheelGeo = new THREE.TorusGeometry(0.95, 0.24, 10, 24);
    const frontWheel = new THREE.Mesh(wheelGeo, neonMat);
    frontWheel.position.set(1.75, 0.95, 0);
    group.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, neonMat);
    rearWheel.position.set(-1.75, 0.95, 0);
    group.add(rearWheel);

    const shieldGeo = new THREE.SphereGeometry(3.3, 14, 14);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(0, 1.4, 0);
    shieldMesh.visible = false;
    group.add(shieldMesh);

    return { group, shieldMesh };
  }

  // ==========================================
  // DYNAMIC 3D LIGHT WALL RIBBON BUILDER
  // ==========================================
  const WALL_HEIGHT = 3.4;

  function createTrailObjects(hexColor) {
    const color = new THREE.Color(hexColor);
    const wallMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const wallGeo = new THREE.BufferGeometry();
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    scene.add(wallMesh);

    const topLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const topLineGeo = new THREE.BufferGeometry();
    const topLine = new THREE.LineSegments(topLineGeo, topLineMat);
    scene.add(topLine);

    return { wallMesh, wallGeo, topLine, topLineGeo };
  }

  function updateTrailGeometry(trailObj, points, currentX, currentZ, currentY) {
    const allPts = [...(points || [])];
    if (allPts.length > 0) {
      allPts.push({ x: currentX, y: currentY, z: currentZ });
    }

    if (allPts.length < 2) {
      trailObj.wallGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      trailObj.topLineGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      return;
    }

    const vertices = [];
    const topPositions = [];

    for (let i = 0; i < allPts.length - 1; i++) {
      const p1 = allPts[i];
      const p2 = allPts[i + 1];
      const y1 = p1.y || 0;
      const y2 = p2.y || 0;

      vertices.push(
        p1.x, y1, p1.z,
        p2.x, y2, p2.z,
        p2.x, y2 + WALL_HEIGHT, p2.z,

        p1.x, y1, p1.z,
        p2.x, y2 + WALL_HEIGHT, p2.z,
        p1.x, y1 + WALL_HEIGHT, p1.z
      );

      topPositions.push(
        p1.x, y1 + WALL_HEIGHT, p1.z,
        p2.x, y2 + WALL_HEIGHT, p2.z
      );
    }

    trailObj.wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    trailObj.wallGeo.computeBoundingSphere();

    trailObj.topLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPositions, 3));
    trailObj.topLineGeo.computeBoundingSphere();
  }

  // ==========================================
  // STATE & ENTITIES MANAGEMENT
  // ==========================================
  let ws = null;
  let myId = null;
  let currentRoomCode = null;
  let inGame = false;
  let cameraMode = 0;

  const playerEntities = new Map();
  const pickupMeshes = new Map();
  const particles3D = [];

  const input = {
    left: false,
    right: false,
    throttle: false,
    brake: false,
    boost: false,
    jump: false
  };

  function spawnCrashParticles(x, y, z, hexColor) {
    const color = new THREE.Color(hexColor);
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 32; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y + 1.2, z);
      scene.add(m);
      const a = Math.random() * Math.PI * 2;
      const spd = 0.4 + Math.random() * 1.4;
      particles3D.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: 0.4 + Math.random() * 1.1,
        vz: Math.sin(a) * spd,
        life: 45 + Math.floor(Math.random() * 20)
      });
    }
  }

  function showBanner(text, color) {
    buffBanner.innerHTML = `${SVG_BOLT} ${escapeHtml(text)}`;
    buffBanner.style.borderColor = color;
    buffBanner.style.color = color;
    buffBanner.classList.remove('hidden');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => {
      buffBanner.classList.add('hidden');
    }, 2400);
  }

  function addKillFeed(killer, victim, killerColor, victimColor, reason) {
    const el = document.createElement('div');
    el.className = 'kill-item';
    const safeVictim = escapeHtml(victim);
    if (killer) {
      const safeKiller = escapeHtml(killer);
      el.innerHTML = `<span style="color:${escapeHtml(killerColor)}">${safeKiller}</span> ${SVG_BOLT} <span style="color:${escapeHtml(victimColor)}">${safeVictim}</span>`;
    } else {
      const label = reason === 'arena' ? 'sınır duvarına çarptı' : 'ışık duvarına çarptı';
      el.innerHTML = `<span style="color:${escapeHtml(victimColor)}">${safeVictim}</span> ${SVG_FLAME} ${label}`;
    }
    killFeed.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // ==========================================
  // WEBSOCKET CONNECTION
  // ==========================================
  function connectWS(onReady) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (onReady) onReady();
      return;
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws/tron`);

    ws.onopen = () => {
      if (onReady) onReady();
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'welcome') {
        myId = msg.playerId;
        arenaSize = msg.arenaSize || 680;
        buildArena(arenaSize);
        buildRamps(msg.ramps || []);
      } else if (msg.type === 'error') {
        lobbyError.textContent = msg.message;
        lobbyError.classList.remove('hidden');
      } else if (msg.type === 'joined') {
        lobbyError.classList.add('hidden');
        currentRoomCode = msg.roomCode;
        inGame = true;
        lobbyOverlay.classList.add('hidden');
        gameHud.classList.remove('hidden');
        roomCodeText.textContent = msg.isPublic ? 'GENEL ARENA' : `ODA KODU: ${msg.roomCode}`;
        copyHint.innerHTML = msg.isPublic ? `${SVG_BOLT} Canlı` : `${SVG_COPY} Kodu Kopyala`;
      } else if (msg.type === 'state') {
        handleServerState(msg);
      }
    };

    ws.onclose = () => {
      inGame = false;
      lobbyOverlay.classList.remove('hidden');
      gameHud.classList.add('hidden');
    };
  }

  connectWS();

  function joinGame(mode, code = '') {
    ensureAudio();
    const name = (playerNameInput.value || 'Rider').trim().slice(0, 16);
    localStorage.setItem('tron_name', name);

    connectWS(() => {
      ws.send(JSON.stringify({
        type: 'join',
        mode,
        roomCode: code,
        name,
        color: selectedColor
      }));
    });
  }

  btnQuickPlay.addEventListener('click', () => joinGame('public'));
  btnCreateRoom.addEventListener('click', () => joinGame('create'));
  btnJoinCode.addEventListener('click', () => {
    const code = roomCodeInput.value.trim();
    if (!code) {
      lobbyError.textContent = 'Lütfen katılmak için bir oda kodu girin!';
      lobbyError.classList.remove('hidden');
      return;
    }
    joinGame('code', code);
  });

  roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnJoinCode.click();
  });
  playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnQuickPlay.click();
  });

  roomBadge.addEventListener('click', () => {
    if (!currentRoomCode || currentRoomCode === 'PUBLIC') return;
    navigator.clipboard.writeText(currentRoomCode);
    copyHint.innerHTML = `${SVG_CHECK} Kopyalandı!`;
    setTimeout(() => {
      copyHint.innerHTML = `${SVG_COPY} Kodu Kopyala`;
    }, 1800);
  });

  btnCamToggle.addEventListener('click', () => {
    cameraMode = (cameraMode + 1) % 2;
  });

  btnAddBot.addEventListener('click', () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'room_action', action: 'add_bot' }));
    }
  });

  btnRemoveBot.addEventListener('click', () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'room_action', action: 'remove_bot' }));
    }
  });

  btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnToggleSound.innerHTML = soundEnabled
      ? `${SVG_VOL_ON} Ses: Açık`
      : `${SVG_VOL_OFF} Ses: Kapalı`;
  });

  btnLeaveRoom.addEventListener('click', () => {
    inGame = false;
    lobbyOverlay.classList.remove('hidden');
    gameHud.classList.add('hidden');
    if (ws) ws.close();
    setTimeout(() => connectWS(), 200);
  });

  // ==========================================
  // PROCESS SERVER STATE
  // ==========================================
  function handleServerState(state) {
    const activeIds = new Set();

    for (const sp of state.players) {
      activeIds.add(sp.id);
      let ent = playerEntities.get(sp.id);
      if (!ent) {
        const bikeObj = createLightcycleMesh(sp.color);
        scene.add(bikeObj.group);
        const trailObj = createTrailObjects(sp.color);
        ent = {
          ...sp,
          rx: sp.x,
          ry: sp.y,
          rz: sp.z,
          rdir: sp.dir,
          roll: 0,
          bikeGroup: bikeObj.group,
          shieldMesh: bikeObj.shieldMesh,
          trailObj
        };
        playerEntities.set(sp.id, ent);
      } else {
        if (Math.hypot(sp.x - ent.rx, sp.z - ent.rz) > 55) {
          ent.rx = sp.x;
          ent.ry = sp.y;
          ent.rz = sp.z;
          ent.rdir = sp.dir;
        }
        Object.assign(ent, sp);
      }

      ent.bikeGroup.visible = !sp.dead;
      ent.shieldMesh.visible = !!sp.shielded;
      ent.trailObj.wallMesh.visible = !sp.dead;
      ent.trailObj.topLine.visible = !sp.dead;

      if (!sp.dead) {
        updateTrailGeometry(ent.trailObj, sp.trail, ent.rx, ent.rz, ent.ry);
      }
    }

    for (const [id, ent] of playerEntities.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(ent.bikeGroup);
        scene.remove(ent.trailObj.wallMesh);
        scene.remove(ent.trailObj.topLine);
        playerEntities.delete(id);
      }
    }

    // Sync Pickups
    const activePickups = new Set();
    for (const pk of state.pickups || []) {
      activePickups.add(pk.id);
      if (!pickupMeshes.has(pk.id)) {
        const geo = new THREE.OctahedronGeometry(2.4, 0);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(pk.color),
          wireframe: true
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pk.x, 2.6, pk.z);
        mesh.userData = pk;
        scene.add(mesh);
        pickupMeshes.set(pk.id, mesh);
      }
    }

    for (const [id, mesh] of pickupMeshes.entries()) {
      if (!activePickups.has(id)) {
        scene.remove(mesh);
        pickupMeshes.delete(id);
      }
    }

    // Events
    for (const ev of state.events || []) {
      if (ev.type === 'crash') {
        spawnCrashParticles(ev.x, ev.y, ev.z, ev.victimColor);
        addKillFeed(ev.killerName, ev.victimName, ev.killerColor, ev.victimColor, ev.reason);
        playSound('crash');
      } else if (ev.type === 'ramp' || ev.type === 'jump') {
        playSound('ramp');
      } else if (ev.type === 'pickup') {
        showBanner(`${ev.name} AKTİF!`, ev.color);
        playSound('pickup');
      }
    }

    updateHud(state.players);
  }

  function updateHud(players) {
    const sorted = [...players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    leaderboardList.innerHTML = sorted
      .slice(0, 6)
      .map(p => `
        <div class="lb-row ${p.id === myId ? 'me' : ''}">
          <div class="lb-name">
            <span class="lb-dot" style="background:${escapeHtml(p.color)}"></span>
            <span>${escapeHtml(p.name)}</span>
          </div>
          <span class="lb-score">${Number(p.kills) || 0} ${SVG_BOLT} ${p.streak >= 3 ? `${SVG_FLAME}${Number(p.streak)}` : ''}</span>
        </div>
      `)
      .join('');

    const me = playerEntities.get(myId);
    if (me) {
      const kmh = me.dead ? 0 : Math.round(me.speed * 135);
      hudSpeedText.textContent = kmh;
      hudNitroText.textContent = `${me.nitro}%`;
      hudNitroFill.style.width = `${Math.max(0, me.nitro)}%`;

      const perks = [];
      if (me.shielded) perks.push('FAZ KALKANI AKTİF (Duvarlardan Geçebilirsin)');
      if (me.megaTrail) perks.push('MEGA İZ AKTİF (2x Uzun Işık Duvarı)');
      activePerks.textContent = perks.length
        ? perks.join('  •  ')
        : '3D Rampaları kullanarak ışık duvarlarının üstünden uç!';
    }
  }

  // ==========================================
  // KEYBOARD CONTROLS
  // ==========================================
  window.addEventListener('keydown', (e) => {
    if (!inGame) return;
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
    if (code === 'KeyW' || code === 'ArrowUp') input.throttle = true;
    if (code === 'KeyS' || code === 'ArrowDown') input.brake = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.boost = true;
    if (code === 'Space') input.jump = true;
    if (code === 'KeyC') cameraMode = (cameraMode + 1) % 2;
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
    if (code === 'KeyW' || code === 'ArrowUp') input.throttle = false;
    if (code === 'KeyS' || code === 'ArrowDown') input.brake = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.boost = false;
    if (code === 'Space') input.jump = false;
  });

  setInterval(() => {
    if (!inGame || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'input', ...input }));
  }, 25);

  // ==========================================
  // 2D RADAR MINIMAP RENDERER
  // ==========================================
  function renderMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    mCtx.clearRect(0, 0, w, h);

    mCtx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
    mCtx.lineWidth = 2;
    mCtx.strokeRect(2, 2, w - 4, h - 4);

    const toMap = (val) => ((val + arenaSize / 2) / arenaSize) * (w - 8) + 4;

    // Draw Ramps on radar
    mCtx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    for (const r of rampsList) {
      const rx = toMap(r.x);
      const rz = toMap(r.z);
      mCtx.fillRect(rx - 3, rz - 3, 6, 6);
    }

    // Draw Pickups on radar
    for (const mesh of pickupMeshes.values()) {
      const pk = mesh.userData;
      mCtx.fillStyle = pk.color;
      mCtx.beginPath();
      mCtx.arc(toMap(pk.x), toMap(pk.z), 2.5, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Draw Trails & Players on radar
    for (const ent of playerEntities.values()) {
      if (ent.dead) continue;
      mCtx.strokeStyle = ent.color;
      mCtx.lineWidth = 1.6;
      const pts = ent.trail || [];
      if (pts.length > 1) {
        mCtx.beginPath();
        mCtx.moveTo(toMap(pts[0].x), toMap(pts[0].z));
        for (let i = 1; i < pts.length; i++) {
          if (pts[i].gap) {
            mCtx.moveTo(toMap(pts[i].x), toMap(pts[i].z));
          } else {
            mCtx.lineTo(toMap(pts[i].x), toMap(pts[i].z));
          }
        }
        mCtx.lineTo(toMap(ent.rx), toMap(ent.rz));
        mCtx.stroke();
      }

      mCtx.fillStyle = ent.id === myId ? '#ffffff' : ent.color;
      mCtx.beginPath();
      mCtx.arc(toMap(ent.rx), toMap(ent.rz), ent.id === myId ? 4 : 2.8, 0, Math.PI * 2);
      mCtx.fill();
    }
  }

  // ==========================================
  // MAIN 3D ANIMATION LOOP
  // ==========================================
  function animate() {
    requestAnimationFrame(animate);

    const t = Date.now() * 0.003;

    for (const mesh of pickupMeshes.values()) {
      mesh.rotation.y += 0.04;
      mesh.rotation.x += 0.02;
      mesh.position.y = 2.6 + Math.sin(t * 2 + mesh.position.x) * 0.5;
    }

    for (let i = particles3D.length - 1; i >= 0; i--) {
      const p = particles3D[i];
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;
      p.vy -= 0.035;
      p.mesh.rotation.x += 0.1;
      p.mesh.rotation.y += 0.12;
      p.life -= 1;
      if (p.mesh.position.y < 0.3) {
        p.mesh.position.y = 0.3;
        p.vy *= -0.45;
      }
      if (p.life <= 0) {
        scene.remove(p.mesh);
        particles3D.splice(i, 1);
      }
    }

    if (!inGame) {
      camera.position.set(Math.cos(t * 0.25) * 165, 68, Math.sin(t * 0.25) * 165);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      return;
    }

    for (const ent of playerEntities.values()) {
      ent.rx += (ent.x - ent.rx) * 0.38;
      ent.ry += (ent.y - ent.ry) * 0.38;
      ent.rz += (ent.z - ent.rz) * 0.38;

      let diff = ent.dir - ent.rdir;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ent.rdir += diff * 0.35;

      const targetRoll = (ent.turn || 0) * -0.42;
      ent.roll += (targetRoll - ent.roll) * 0.22;

      ent.bikeGroup.position.set(ent.rx, ent.ry, ent.rz);
      ent.bikeGroup.rotation.set(ent.roll, -ent.rdir, ent.ry > 0.2 ? 0.18 : 0, 'YXZ');
    }

    const me = playerEntities.get(myId);
    if (me && !me.dead) {
      const distBack = cameraMode === 0 ? (me.speed > 2.0 ? 23 : 18.5) : 42;
      const camHeight = cameraMode === 0 ? 9.0 : 28;

      const targetCamX = me.rx - Math.cos(me.rdir) * distBack;
      const targetCamZ = me.rz - Math.sin(me.rdir) * distBack;
      const targetCamY = me.ry + camHeight;

      camera.position.x += (targetCamX - camera.position.x) * 0.18;
      camera.position.y += (targetCamY - camera.position.y) * 0.18;
      camera.position.z += (targetCamZ - camera.position.z) * 0.18;

      const lookAheadX = me.rx + Math.cos(me.rdir) * 16;
      const lookAheadZ = me.rz + Math.sin(me.rdir) * 16;
      camera.lookAt(lookAheadX, me.ry + 1.8, lookAheadZ);
    }

    renderMinimap();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
