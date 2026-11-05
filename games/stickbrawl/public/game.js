(() => {
  const GAME_WIDTH = 1280;
  const GAME_HEIGHT = 720;

  const STICK_COLORS = [
    '#38bdf8',
    '#f43f5e',
    '#22c55e',
    '#facc15',
    '#a855f7',
    '#fb923c',
    '#2dd4bf',
    '#f472b6'
  ];

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
  const mapNameText = document.getElementById('mapNameText');
  const btnNextMap = document.getElementById('btnNextMap');
  const btnAddBot = document.getElementById('btnAddBot');
  const btnRemoveBot = document.getElementById('btnRemoveBot');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const btnLeaveRoom = document.getElementById('btnLeaveRoom');

  const leaderboardList = document.getElementById('leaderboardList');
  const killFeed = document.getElementById('killFeed');
  const hudWeaponName = document.getElementById('hudWeaponName');
  const hudAmmoText = document.getElementById('hudAmmoText');
  const hudHpText = document.getElementById('hudHpText');
  const hudHpFill = document.getElementById('hudHpFill');

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const previewCanvas = document.getElementById('previewCanvas');
  const pCtx = previewCanvas.getContext('2d');

  // ==========================================
  // AUDIO SYNTHESIZER (Zero External Assets)
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

    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'swing') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'shoot') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'explosion') {
      osc.type = 'Square' in window ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.32);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'hit') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'pickup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  // ==========================================
  // CLIENT STATE
  // ==========================================
  let selectedColor = localStorage.getItem('sb_color') || STICK_COLORS[0];
  playerNameInput.value = localStorage.getItem('sb_name') || '';

  let ws = null;
  let myId = null;
  let currentRoomCode = null;
  let inGame = false;
  let mapsById = {};
  let weaponsById = {};
  let currentMapId = 'sky_temple';

  // Render entities with client interpolation
  const renderPlayers = new Map();
  let bullets = [];
  let drops = [];
  const particles = [];
  const floatingTexts = [];
  const slashArcs = [];
  let screenShake = 0;

  // Input state
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    attack: false,
    dash: false,
    aimAngle: 0
  };
  let mouseScreenX = window.innerWidth / 2;
  let mouseScreenY = window.innerHeight / 2;

  // ==========================================
  // COLOR PICKER & PREVIEW
  // ==========================================
  function renderSwatches() {
    colorPicker.innerHTML = '';
    STICK_COLORS.forEach(c => {
      const el = document.createElement('div');
      el.className = 'color-swatch' + (c === selectedColor ? ' active' : '');
      el.style.backgroundColor = c;
      el.style.color = c;
      el.addEventListener('click', () => {
        selectedColor = c;
        localStorage.setItem('sb_color', c);
        renderSwatches();
      });
      colorPicker.appendChild(el);
    });
  }
  renderSwatches();

  const SVG_COPY = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const SVG_CHECK = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const SVG_BOLT = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  const SVG_SWORD = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/></svg>';
  const SVG_CROSSHAIR = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>';
  const SVG_FLAME = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
  const SVG_VOL_ON = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  const SVG_VOL_OFF = '<svg width="13" height="13" class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  function connectWS(onReady) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (onReady) onReady();
      return;
    }

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/ws/stickbrawl`);

    ws.onopen = () => {
      if (onReady) onReady();
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'welcome') {
        myId = msg.playerId;
        (msg.maps || []).forEach(m => { mapsById[m.id] = m; });
        weaponsById = msg.weapons || {};
      } else if (msg.type === 'error') {
        lobbyError.textContent = msg.message;
        lobbyError.classList.remove('hidden');
      } else if (msg.type === 'joined') {
        lobbyError.classList.add('hidden');
        currentRoomCode = msg.roomCode;
        inGame = true;
        lobbyOverlay.classList.add('hidden');
        gameHud.classList.remove('hidden');
        roomCodeText.textContent = msg.isPublic
          ? 'GENEL ARENA'
          : `ODA KODU: ${msg.roomCode}`;
        copyHint.innerHTML = msg.isPublic ? `${SVG_BOLT} Canlı` : `${SVG_COPY} Kodu Kopyala`;
        renderPlayers.clear();
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
    const name = (playerNameInput.value || 'Stickman').trim().slice(0, 16);
    localStorage.setItem('sb_name', name);

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

  btnNextMap.addEventListener('click', () => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'room_action', action: 'next_map' }));
    }
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
  // HANDLE SERVER STATE & EVENTS
  // ==========================================
  function spawnParticles(x, y, color, count = 12, speed = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.25 + Math.random() * 0.85) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        radius: 2 + Math.random() * 3.5,
        color,
        alpha: 1,
        decay: 0.022 + Math.random() * 0.02
      });
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function addKillFeedItem(killer, victim, weapon, killerColor, victimColor) {
    const el = document.createElement('div');
    el.className = 'kill-item';
    const wepIcons = {
      fist: SVG_SWORD,
      sword: SVG_SWORD,
      pistol: SVG_CROSSHAIR,
      shotgun: SVG_CROSSHAIR,
      smg: SVG_BOLT,
      rocket: SVG_FLAME,
      railgun: SVG_BOLT,
      lava: SVG_FLAME,
      void: SVG_CROSSHAIR
    };
    const icon = wepIcons[weapon] || SVG_SWORD;
    const safeVictim = escapeHtml(victim);
    if (killer) {
      const safeKiller = escapeHtml(killer);
      el.innerHTML = `<span style="color:${escapeHtml(killerColor)}">${safeKiller}</span> ${icon} <span style="color:${escapeHtml(victimColor)}">${safeVictim}</span>`;
    } else {
      el.innerHTML = `<span style="color:${escapeHtml(victimColor)}">${safeVictim}</span> ${icon} düştü`;
    }
    killFeed.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 4200);
  }

  function handleServerState(state) {
    currentMapId = state.mapId;
    mapNameText.textContent = state.mapName;
    bullets = state.bullets || [];
    drops = state.drops || [];

    const activeIds = new Set();
    for (const sp of state.players) {
      activeIds.add(sp.id);
      const existing = renderPlayers.get(sp.id);
      if (!existing) {
        renderPlayers.set(sp.id, {
          ...sp,
          rx: sp.x,
          ry: sp.y,
          walkCycle: 0
        });
      } else {
        // Snap if respawned far away
        if (Math.hypot(sp.x - existing.rx, sp.y - existing.ry) > 180) {
          existing.rx = sp.x;
          existing.ry = sp.y;
        }
        Object.assign(existing, sp);
      }
    }

    for (const id of renderPlayers.keys()) {
      if (!activeIds.has(id)) renderPlayers.delete(id);
    }

    // Process one-shot events
    for (const ev of state.events || []) {
      if (ev.type === 'hit') {
        spawnParticles(ev.x, ev.y, ev.color, 10, 5.5);
        floatingTexts.push({
          x: ev.x + (Math.random() * 16 - 8),
          y: ev.y - 12,
          text: `-${ev.damage}`,
          color: '#f87171',
          alpha: 1
        });
        playSound('hit');
      } else if (ev.type === 'kill') {
        spawnParticles(ev.x, ev.y, ev.victimColor, 28, 8.5);
        screenShake = Math.max(screenShake, 8);
        addKillFeedItem(ev.killerName, ev.victimName, ev.weapon, ev.killerColor, ev.victimColor);
        playSound('explosion');
      } else if (ev.type === 'swing') {
        slashArcs.push({
          x: ev.x,
          y: ev.y,
          angle: ev.angle,
          range: ev.range,
          color: ev.color,
          alpha: 1
        });
        playSound('swing');
      } else if (ev.type === 'shoot') {
        spawnParticles(ev.x, ev.y, ev.color, 5, 4);
        if (ev.weapon === 'shotgun' || ev.weapon === 'railgun') {
          screenShake = Math.max(screenShake, 5);
        }
        playSound('shoot');
      } else if (ev.type === 'explosion') {
        spawnParticles(ev.x, ev.y, '#fb923c', 36, 10);
        spawnParticles(ev.x, ev.y, '#facc15', 20, 6);
        screenShake = Math.max(screenShake, 14);
        playSound('explosion');
      } else if (ev.type === 'jump' || ev.type === 'bounce') {
        spawnParticles(ev.x, ev.y, '#cbd5e1', 7, 3.2);
        playSound('jump');
      } else if (ev.type === 'dash') {
        spawnParticles(ev.x, ev.y, ev.color, 12, 4.5);
      } else if (ev.type === 'pickup') {
        floatingTexts.push({
          x: ev.x,
          y: ev.y - 10,
          text: `+ ${ev.weaponName}`,
          color: ev.color,
          alpha: 1
        });
        playSound('pickup');
      }
    }

    updateHud(state.players);
  }

  function updateHud(players) {
    // Leaderboard sorted by kills
    const sorted = [...players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    leaderboardList.innerHTML = sorted
      .slice(0, 6)
      .map(p => `
        <div class="lb-row ${p.id === myId ? 'me' : ''}">
          <div class="lb-name">
            <span class="lb-dot" style="background:${escapeHtml(p.color)}"></span>
            <span>${escapeHtml(p.name)}</span>
          </div>
          <span class="lb-score">${Number(p.kills) || 0} ${SVG_SWORD} ${p.streak >= 3 ? `${SVG_FLAME}${Number(p.streak)}` : ''}</span>
        </div>
      `)
      .join('');

    const me = renderPlayers.get(myId);
    if (me) {
      const wep = weaponsById[me.weapon] || { name: 'Yumruk', color: '#38bdf8' };
      hudWeaponName.textContent = wep.name;
      hudWeaponName.style.color = wep.color;
      hudAmmoText.textContent = me.ammo === -1 ? '∞ MERMİ' : `${me.ammo} MERMİ`;

      hudHpText.textContent = `${me.hp} / 100`;
      hudHpFill.style.width = `${Math.max(0, me.hp)}%`;
      if (me.hp > 50) {
        hudHpFill.style.background = 'linear-gradient(90deg, #22c55e, #4ade80)';
      } else if (me.hp > 25) {
        hudHpFill.style.background = 'linear-gradient(90deg, #eab308, #facc15)';
      } else {
        hudHpFill.style.background = 'linear-gradient(90deg, #dc2626, #f87171)';
      }
    }
  }

  // ==========================================
  // INPUT LISTENERS
  // ==========================================
  window.addEventListener('keydown', (e) => {
    if (!inGame) return;
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
    if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') input.up = true;
    if (code === 'KeyS' || code === 'ArrowDown') input.down = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') input.dash = true;
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
    if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') input.up = false;
    if (code === 'KeyS' || code === 'ArrowDown') input.down = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyE') input.dash = false;
  });

  window.addEventListener('mousemove', (e) => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (!inGame) return;
    if (e.button === 0) input.attack = true;
    if (e.button === 2) input.dash = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.attack = false;
    if (e.button === 2) input.dash = false;
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // Send input at 40Hz
  setInterval(() => {
    if (!inGame || !ws || ws.readyState !== WebSocket.OPEN) return;

    const me = renderPlayers.get(myId);
    if (me) {
      const worldMouse = screenToWorld(mouseScreenX, mouseScreenY);
      input.aimAngle = Math.atan2(worldMouse.y - (me.ry - 24), worldMouse.x - me.rx);
    }

    ws.send(JSON.stringify({
      type: 'input',
      ...input
    }));
  }, 25);

  // ==========================================
  // VIEWPORT SCALING & CAMERA
  // ==========================================
  let viewScale = 1;
  let viewOffsetX = 0;
  let viewOffsetY = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const scaleX = canvas.width / GAME_WIDTH;
    const scaleY = canvas.height / GAME_HEIGHT;
    viewScale = Math.min(scaleX, scaleY);
    viewOffsetX = (canvas.width - GAME_WIDTH * viewScale) / 2;
    viewOffsetY = (canvas.height - GAME_HEIGHT * viewScale) / 2;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function screenToWorld(sx, sy) {
    return {
      x: (sx - viewOffsetX) / viewScale,
      y: (sy - viewOffsetY) / viewScale
    };
  }

  // ==========================================
  // PROCEDURAL STICKMAN RENDERING
  // ==========================================
  function drawStickman(c, x, y, color, aimAngle, walkCycle, onGround, weaponId, meleeActive, invuln) {
    c.save();
    if (invuln && Math.floor(Date.now() / 80) % 2 === 0) {
      c.globalAlpha = 0.5;
    }

    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 4.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    const hipX = x;
    const hipY = y - 18;
    const shoulderX = x;
    const shoulderY = y - 36;
    const headX = x;
    const headY = y - 47;

    // Shadow on ground
    c.save();
    c.fillStyle = 'rgba(0, 0, 0, 0.35)';
    c.beginPath();
    c.ellipse(x, y, 13, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Spine
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(shoulderX, shoulderY);
    c.stroke();

    // Legs (Procedural walking or jumping)
    const swing = onGround ? Math.sin(walkCycle) * 11 : 7;
    const kneeBend = onGround ? Math.cos(walkCycle) * 4 : -5;

    // Left leg
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(hipX - swing * 0.6, hipY + 9 + kneeBend * 0.3);
    c.lineTo(hipX - swing, y);
    c.stroke();

    // Right leg
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(hipX + swing * 0.6, hipY + 9 - kneeBend * 0.3);
    c.lineTo(hipX + swing, y);
    c.stroke();

    // Head with subtle glow
    c.save();
    c.shadowColor = color;
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(headX, headY, 9.5, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Headband / Eyes facing aim direction
    const facing = Math.cos(aimAngle) >= 0 ? 1 : -1;
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(headX + facing * 4, headY - 1, 2, 0, Math.PI * 2);
    c.fill();

    // Arms & Weapon
    const swingOffset = meleeActive ? Math.sin(Date.now() * 0.05) * 0.9 : 0;
    const armAngle = aimAngle + swingOffset;
    const handX = shoulderX + Math.cos(armAngle) * 18;
    const handY = shoulderY + Math.sin(armAngle) * 18;

    // Back arm
    c.beginPath();
    c.moveTo(shoulderX, shoulderY);
    c.lineTo(shoulderX - facing * 7, shoulderY + 11);
    c.stroke();

    // Aiming arm
    c.beginPath();
    c.moveTo(shoulderX, shoulderY);
    c.lineTo(handX, handY);
    c.stroke();

    // Draw equipped weapon in hand
    drawWeaponInHand(c, handX, handY, armAngle, weaponId);

    c.restore();
  }

  function drawWeaponInHand(c, hx, hy, angle, weaponId) {
    if (!weaponId || weaponId === 'fist') {
      // Boxing glove / fist highlight
      c.fillStyle = '#f8fafc';
      c.beginPath();
      c.arc(hx, hy, 4.2, 0, Math.PI * 2);
      c.fill();
      return;
    }

    c.save();
    c.translate(hx, hy);
    c.rotate(angle);

    if (weaponId === 'sword') {
      // Katana blade
      c.strokeStyle = '#e2e8f0';
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(36, 0);
      c.stroke();

      c.strokeStyle = '#38bdf8';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(2, -1);
      c.lineTo(35, -1);
      c.stroke();
    } else if (weaponId === 'pistol') {
      c.fillStyle = '#facc15';
      c.fillRect(0, -3, 14, 6);
      c.fillStyle = '#475569';
      c.fillRect(0, 2, 5, 6);
    } else if (weaponId === 'shotgun') {
      c.fillStyle = '#fb923c';
      c.fillRect(-2, -3.5, 24, 7);
      c.fillStyle = '#78350f';
      c.fillRect(-6, -2, 8, 6);
    } else if (weaponId === 'smg') {
      c.fillStyle = '#a855f7';
      c.fillRect(0, -3.5, 17, 7);
      c.fillRect(5, 3, 4, 7);
    } else if (weaponId === 'rocket') {
      c.fillStyle = '#ef4444';
      c.fillRect(-8, -5, 30, 10);
      c.fillStyle = '#facc15';
      c.fillRect(18, -6, 5, 12);
    } else if (weaponId === 'railgun') {
      c.fillStyle = '#2dd4bf';
      c.fillRect(-4, -4, 32, 8);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(30, 0);
      c.stroke();
    }

    c.restore();
  }

  // ==========================================
  // LOBBY PREVIEW RENDER LOOP
  // ==========================================
  function renderPreview() {
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Floor platform
    pCtx.fillStyle = '#334155';
    pCtx.fillRect(40, 125, 140, 12);

    const t = Date.now() * 0.006;
    drawStickman(
      pCtx,
      110,
      125,
      selectedColor,
      Math.sin(t * 0.5) * 0.35,
      t,
      true,
      'sword',
      false,
      false
    );
  }

  // ==========================================
  // MAIN GAME RENDER LOOP
  // ==========================================
  function renderGame() {
    requestAnimationFrame(renderGame);

    if (!inGame) {
      renderPreview();
      return;
    }

    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Screen shake offset
    let shakeX = 0;
    let shakeY = 0;
    if (screenShake > 0.2) {
      shakeX = (Math.random() - 0.5) * screenShake * 2;
      shakeY = (Math.random() - 0.5) * screenShake * 2;
      screenShake *= 0.86;
    } else {
      screenShake = 0;
    }

    ctx.translate(viewOffsetX + shakeX, viewOffsetY + shakeY);
    ctx.scale(viewScale, viewScale);

    // Arena Background Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= GAME_WIDTH; gx += 64) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, GAME_HEIGHT);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GAME_HEIGHT; gy += 64) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(GAME_WIDTH, gy);
      ctx.stroke();
    }

    const map = mapsById[currentMapId];
    if (map) {
      // Draw Platforms
      for (const plat of map.platforms) {
        ctx.fillStyle = plat.color || '#334155';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 8);
        ctx.fill();

        // Top highlight bar
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fillRect(plat.x + 6, plat.y, plat.w - 12, 3);
      }

      // Draw Jump Pads
      for (const pad of map.jumpPads || []) {
        ctx.save();
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 4);
        ctx.fill();
        ctx.restore();
      }

      // Draw Lava Hazard if lava map
      if (map.hazard === 'lava') {
        const grad = ctx.createLinearGradient(0, GAME_HEIGHT - 36, 0, GAME_HEIGHT);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(1, '#dc2626');
        ctx.fillStyle = grad;
        ctx.fillRect(0, GAME_HEIGHT - 30, GAME_WIDTH, 35);
      }
    }

    // Draw Falling Weapon Crates
    for (const d of drops) {
      const wep = weaponsById[d.w] || { name: d.w, color: '#facc15' };
      ctx.save();

      // Parachute if still in the air
      if (d.y < 180) {
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(d.x - 12, d.y - 22);
        ctx.lineTo(d.x, d.y - 8);
        ctx.moveTo(d.x + 12, d.y - 22);
        ctx.lineTo(d.x, d.y - 8);
        ctx.stroke();

        ctx.fillStyle = wep.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y - 22, 14, Math.PI, 0);
        ctx.fill();
      }

      // Crate box
      ctx.shadowColor = wep.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = wep.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(d.x - 15, d.y - 15, 30, 26, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wep.name.toUpperCase(), d.x, d.y - 22);
      ctx.restore();
    }

    // Draw Slash Arcs
    for (let i = slashArcs.length - 1; i >= 0; i--) {
      const arc = slashArcs[i];
      ctx.save();
      ctx.globalAlpha = arc.alpha;
      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(arc.x, arc.y, arc.range * 0.78, arc.angle - 0.85, arc.angle + 0.85);
      ctx.stroke();
      ctx.restore();
      arc.alpha -= 0.12;
      if (arc.alpha <= 0) slashArcs.splice(i, 1);
    }

    // Draw & Interpolate Players
    for (const p of renderPlayers.values()) {
      p.rx += (p.x - p.rx) * 0.35;
      p.ry += (p.y - p.ry) * 0.35;

      if (Math.abs(p.vx) > 0.4 && p.onGround) {
        p.walkCycle += Math.abs(p.vx) * 0.09;
      } else {
        p.walkCycle *= 0.8;
      }

      if (p.dead) continue;

      drawStickman(
        ctx,
        p.rx,
        p.ry,
        p.color,
        p.aimAngle,
        p.walkCycle,
        p.onGround,
        p.weapon,
        p.meleeActive,
        p.invuln
      );

      // Name & Mini Health Bar above head
      ctx.save();
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.id === myId ? '#ffffff' : '#cbd5e1';
      ctx.fillText(p.name, p.rx, p.ry - 72);

      // Health bar background
      const barW = 42;
      const barH = 5;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(p.rx - barW / 2, p.ry - 66, barW, barH);

      ctx.fillStyle = p.hp > 40 ? '#22c55e' : '#ef4444';
      ctx.fillRect(p.rx - barW / 2, p.ry - 66, (Math.max(0, p.hp) / 100) * barW, barH);
      ctx.restore();
    }

    // Draw Bullets
    for (const b of bullets) {
      ctx.save();
      ctx.shadowColor = b.c;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r || 4, 0, Math.PI * 2);
      ctx.fill();

      // Bullet trail
      ctx.strokeStyle = b.c;
      ctx.lineWidth = (b.r || 4) * 1.1;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 1.2, b.y - b.vy * 1.2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.18;
      pt.alpha -= pt.decay;

      if (pt.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Floating Damage / Pickup Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 1.1;
      ft.alpha -= 0.024;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '900 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  requestAnimationFrame(renderGame);
})();

