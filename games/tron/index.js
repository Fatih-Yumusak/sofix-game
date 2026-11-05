const { WebSocketServer } = require('ws');

// ==========================================
// TRON 3D ARENA CONSTANTS (LARGE ARENA)
// ==========================================
const ARENA_SIZE = 680; // -340 to +340 on X and Z
const HALF_ARENA = ARENA_SIZE / 2;
const BASE_SPEED = 1.65;
const BOOST_SPEED = 2.75;
const TURN_SPEED = 0.066;
const GRAVITY = 0.046;
const WALL_HEIGHT = 3.4;
const BIKE_RADIUS = 1.7;
const BASE_TRAIL_LENGTH = 180;
const LONG_TRAIL_LENGTH = 340;

const MAX_ROOMS = 100;
const MAX_PLAYERS_PER_ROOM = 12;

const NEON_COLORS = [
  '#00f2fe', // Cyan
  '#ff6a00', // Orange
  '#ff007f', // Neon Pink
  '#00ff66', // Matrix Green
  '#ffe600', // Cyber Yellow
  '#a855f7', // Neon Purple
  '#ff2a2a', // Laser Red
  '#38bdf8', // Sky Blue
  '#f472b6', // Hot Rose
  '#a3e635', // Electric Lime
  '#fb923c', // Amber Glow
  '#e879f9'  // Magenta
];

function pickUniqueColor(room, preferredColor) {
  const usedColors = new Set(Array.from(room.players.values()).map(p => p.color));
  if (NEON_COLORS.includes(preferredColor) && !usedColors.has(preferredColor)) {
    return preferredColor;
  }
  for (const c of NEON_COLORS) {
    if (!usedColors.has(c)) return c;
  }
  return NEON_COLORS[room.players.size % NEON_COLORS.length];
}

// 17 Large 3D Sloped Ramps distributed across the 680x680 Arena
// dir: angle (in radians) the ramp points toward (0 = +X, PI/2 = +Z, PI = -X, -PI/2 = -Z)
const RAMPS = [
  // Center Mega Jump Pad (4-way pyramid)
  { id: 'c0', x: 0, z: 0, w: 28, d: 28, h: 4.5, dir: 0, omni: true, boostVy: 1.28 },

  // Inner Ring Ramps (directional wedge ramps)
  { id: 'r1', x: -90, z: 0, w: 24, d: 18, h: 4.2, dir: 0, boostVy: 1.15 },
  { id: 'r2', x: 90, z: 0, w: 24, d: 18, h: 4.2, dir: Math.PI, boostVy: 1.15 },
  { id: 'r3', x: 0, z: -90, w: 18, d: 24, h: 4.2, dir: Math.PI / 2, boostVy: 1.15 },
  { id: 'r4', x: 0, z: 90, w: 18, d: 24, h: 4.2, dir: -Math.PI / 2, boostVy: 1.15 },

  // Diagonal Mid-Arena Ramps (directional wedge ramps)
  { id: 'r5', x: -115, z: -115, w: 24, d: 18, h: 4.2, dir: Math.PI / 4, boostVy: 1.15 },
  { id: 'r6', x: 115, z: -115, w: 24, d: 18, h: 4.2, dir: (3 * Math.PI) / 4, boostVy: 1.15 },
  { id: 'r7', x: -115, z: 115, w: 24, d: 18, h: 4.2, dir: -Math.PI / 4, boostVy: 1.15 },
  { id: 'r8', x: 115, z: 115, w: 24, d: 18, h: 4.2, dir: (-3 * Math.PI) / 4, boostVy: 1.15 },

  // Outer Highway Ramps (directional wedge ramps)
  { id: 'r9', x: -210, z: -100, w: 26, d: 18, h: 4.4, dir: 0, boostVy: 1.18 },
  { id: 'r10', x: -210, z: 100, w: 26, d: 18, h: 4.4, dir: 0, boostVy: 1.18 },
  { id: 'r11', x: 210, z: -100, w: 26, d: 18, h: 4.4, dir: Math.PI, boostVy: 1.18 },
  { id: 'r12', x: 210, z: 100, w: 26, d: 18, h: 4.4, dir: Math.PI, boostVy: 1.18 },
  { id: 'r13', x: -100, z: -210, w: 18, d: 26, h: 4.4, dir: Math.PI / 2, boostVy: 1.18 },
  { id: 'r14', x: 100, z: -210, w: 18, d: 26, h: 4.4, dir: Math.PI / 2, boostVy: 1.18 },
  { id: 'r15', x: -100, z: 210, w: 18, d: 26, h: 4.4, dir: -Math.PI / 2, boostVy: 1.18 },
  { id: 'r16', x: 100, z: 210, w: 18, d: 26, h: 4.4, dir: -Math.PI / 2, boostVy: 1.18 }
];

const PICKUP_TYPES = [
  { id: 'nitro', name: 'TAM NİTRO', color: '#facc15' },
  { id: 'shield', name: 'FAZ KALKANI', color: '#22c55e' },
  { id: 'trail', name: 'MEGA İZ', color: '#a855f7' }
];

function sanitizeName(raw) {
  if (typeof raw !== 'string') return 'Rider';
  const cleaned = raw.replace(/[<>&"'`\\]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return cleaned.slice(0, 16) || 'Rider';
}

function distToSegmentSq(px, pz, x1, z1, x2, z2) {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return (px - x1) * (px - x1) + (pz - z1) * (pz - z1);
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projZ = z1 + t * (z2 - z1);
  return (px - projX) * (px - projX) + (pz - projZ) * (pz - projZ);
}

function createTronServer() {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const rooms = new Map();
  let nextEntityId = 1;

  function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return rooms.has(code) ? generateRoomCode() : code;
  }

  function createRoom(code, isPublic = false) {
    const room = {
      code,
      isPublic,
      players: new Map(),
      pickups: [],
      events: [],
      lastPickupSpawn: Date.now(),
      botCount: 0,
      createdAt: Date.now()
    };
    rooms.set(code, room);
    syncBots(room);
    return room;
  }

  function getRandomSpawn() {
    const margin = 75;
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * (HALF_ARENA - margin - 80);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const dir = Math.atan2(-z, -x) + (Math.random() * 0.5 - 0.25);
    return { x, z, dir };
  }

  function createPlayerObj(id, name, color, isBot = false) {
    const sp = getRandomSpawn();
    const now = Date.now();
    return {
      id,
      name: sanitizeName(name),
      color,
      isBot,
      x: sp.x,
      y: 0,
      z: sp.z,
      vy: 0,
      dir: sp.dir,
      speed: BASE_SPEED,
      targetSpeed: BASE_SPEED,
      nitro: 100,
      dead: false,
      respawnAt: 0,
      kills: 0,
      deaths: 0,
      streak: 0,
      shieldUntil: now + 2500,
      megaTrailUntil: 0,
      jumpCooldownUntil: 0,
      lastRampAt: 0,
      lastTrailX: sp.x,
      lastTrailY: 0,
      lastTrailZ: sp.z,
      trail: [{ x: Math.round(sp.x * 10) / 10, y: 0, z: Math.round(sp.z * 10) / 10 }],
      input: {
        left: false,
        right: false,
        throttle: false,
        brake: false,
        boost: false,
        jump: false
      },
      botState: {
        turnDir: 0,
        nextDecisionAt: 0
      }
    };
  }

  const BOT_NAMES = ['Rinzler [BOT]', 'Clu [BOT]', 'Quorra [BOT]', 'Tron [BOT]', 'Sark [BOT]'];

  function syncBots(room) {
    const currentBots = Array.from(room.players.values()).filter(p => p.isBot);
    const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
    const targetBots = humanCount === 0 ? 0 : room.botCount;

    while (currentBots.length < targetBots && room.players.size < MAX_PLAYERS_PER_ROOM) {
      const botId = `tbot_${nextEntityId++}`;
      const botName = BOT_NAMES[currentBots.length % BOT_NAMES.length];
      const color = pickUniqueColor(room, null);
      const bot = createPlayerObj(botId, botName, color, true);
      room.players.set(botId, bot);
      currentBots.push(bot);
    }

    while (currentBots.length > targetBots) {
      const b = currentBots.pop();
      if (b) room.players.delete(b.id);
    }
  }

  createRoom('PUBLIC', true);

  function isPointDangerous(room, bot, testX, testZ) {
    if (Math.abs(testX) > HALF_ARENA - 18 || Math.abs(testZ) > HALF_ARENA - 18) {
      return true;
    }
    for (const other of room.players.values()) {
      if (other.dead || other.trail.length < 2) continue;
      const limit = other.id === bot.id ? other.trail.length - 8 : other.trail.length - 1;
      for (let i = 0; i < limit; i++) {
        const p1 = other.trail[i];
        const p2 = other.trail[i + 1];
        if (distToSegmentSq(testX, testZ, p1.x, p1.z, p2.x, p2.z) < 42) {
          return true;
        }
      }
    }
    return false;
  }

  function updateBotAI(bot, room, now) {
    if (bot.dead) return;
    const input = bot.input;
    input.left = false;
    input.right = false;
    input.boost = false;
    input.jump = false;

    const lookDist = 32;
    const frontX = bot.x + Math.cos(bot.dir) * lookDist;
    const frontZ = bot.z + Math.sin(bot.dir) * lookDist;

    if (isPointDangerous(room, bot, frontX, frontZ)) {
      const leftAngle = bot.dir - 0.7;
      const rightAngle = bot.dir + 0.7;
      const leftSafe = !isPointDangerous(
        room,
        bot,
        bot.x + Math.cos(leftAngle) * lookDist,
        bot.z + Math.sin(leftAngle) * lookDist
      );
      const rightSafe = !isPointDangerous(
        room,
        bot,
        bot.x + Math.cos(rightAngle) * lookDist,
        bot.z + Math.sin(rightAngle) * lookDist
      );

      if (leftSafe && !rightSafe) {
        input.left = true;
      } else if (rightSafe && !leftSafe) {
        input.right = true;
      } else if (!leftSafe && !rightSafe && now >= bot.jumpCooldownUntil) {
        input.jump = true;
        input.left = true;
      } else {
        if (bot.botState.turnDir >= 0) input.right = true;
        else input.left = true;
      }
    } else {
      if (now > bot.botState.nextDecisionAt) {
        bot.botState.nextDecisionAt = now + 500 + Math.random() * 900;
        const r = Math.random();
        if (r < 0.25) bot.botState.turnDir = -1;
        else if (r < 0.5) bot.botState.turnDir = 1;
        else bot.botState.turnDir = 0;
      }
      if (bot.botState.turnDir < 0) input.left = true;
      else if (bot.botState.turnDir > 0) input.right = true;
      if (bot.nitro > 45 && Math.random() < 0.25) input.boost = true;
    }
  }

  function killPlayer(room, victim, killer, reason = 'wall') {
    if (victim.dead) return;
    victim.dead = true;
    victim.deaths += 1;
    victim.streak = 0;
    victim.respawnAt = Date.now() + 2500;
    victim.trail = [];

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.streak += 1;
      killer.nitro = Math.min(100, killer.nitro + 40);
    }

    room.events.push({
      type: 'crash',
      x: Math.round(victim.x),
      y: Math.round(victim.y),
      z: Math.round(victim.z),
      victimName: victim.name,
      victimColor: victim.color,
      killerName: killer ? killer.name : null,
      killerColor: killer ? killer.color : '#94a3b8',
      reason
    });
  }

  let tickCounter = 0;

  setInterval(() => {
    const now = Date.now();
    tickCounter++;

    for (const [code, room] of rooms.entries()) {
      const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
      if (!room.isPublic && humanCount === 0 && now - room.createdAt > 15000) {
        rooms.delete(code);
        continue;
      }
      if (humanCount === 0) continue;

      if (now - room.lastPickupSpawn > 3200 && room.pickups.length < 14) {
        room.lastPickupSpawn = now;
        const pType = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
        room.pickups.push({
          id: nextEntityId++,
          type: pType.id,
          name: pType.name,
          color: pType.color,
          x: Math.round((Math.random() * 2 - 1) * (HALF_ARENA - 45)),
          z: Math.round((Math.random() * 2 - 1) * (HALF_ARENA - 45))
        });
      }

      for (const p of room.players.values()) {
        if (p.isBot) updateBotAI(p, room, now);

        if (p.dead) {
          if (now >= p.respawnAt) {
            const sp = getRandomSpawn();
            p.x = sp.x;
            p.y = 0;
            p.z = sp.z;
            p.vy = 0;
            p.dir = sp.dir;
            p.speed = BASE_SPEED;
            p.targetSpeed = BASE_SPEED;
            p.nitro = 100;
            p.dead = false;
            p.shieldUntil = now + 2500;
            p.megaTrailUntil = 0;
            p.lastTrailX = sp.x;
            p.lastTrailY = 0;
            p.lastTrailZ = sp.z;
            p.trail = [{ x: Math.round(sp.x * 10) / 10, y: 0, z: Math.round(sp.z * 10) / 10 }];
          }
          continue;
        }

        if (p.input.left) p.dir -= TURN_SPEED;
        if (p.input.right) p.dir += TURN_SPEED;

        // W / S Speed Control (0 to 2.05) + Shift Nitro Boost
        if (p.input.throttle) {
          p.targetSpeed = Math.min(2.05, p.targetSpeed + 0.045);
        }
        if (p.input.brake) {
          p.targetSpeed = Math.max(0, p.targetSpeed - 0.055);
        }

        const isBoosting = p.input.boost && p.nitro > 1;
        if (isBoosting) {
          p.targetSpeed = Math.max(p.targetSpeed, BASE_SPEED);
          p.speed = BOOST_SPEED;
          p.nitro = Math.max(0, p.nitro - 0.55);
        } else {
          p.speed += (p.targetSpeed - p.speed) * 0.25;
          if (p.speed < 0.02 && p.targetSpeed === 0) p.speed = 0;
          p.nitro = Math.min(100, p.nitro + 0.22);
        }

        if (p.input.jump && p.y === 0 && now >= p.jumpCooldownUntil && p.nitro >= 25) {
          p.vy = 0.78;
          p.nitro -= 25;
          p.jumpCooldownUntil = now + 1300;
          room.events.push({
            type: 'jump',
            x: Math.round(p.x),
            z: Math.round(p.z),
            color: p.color
          });
        }

        const prevX = p.x;
        const prevZ = p.z;
        p.x += Math.cos(p.dir) * p.speed;
        p.z += Math.sin(p.dir) * p.speed;

        if (p.y > 0 || p.vy !== 0) {
          p.y += p.vy;
          p.vy -= GRAVITY;
          if (p.y <= 0) {
            p.y = 0;
            p.vy = 0;
          }
        }

        // Check 3D Ramps with directional validation (No jumping when entering backwards!)
        for (const ramp of RAMPS) {
          const length = Math.max(ramp.w, ramp.d);
          const width = Math.min(ramp.w, ramp.d);
          const cosR = Math.cos(ramp.dir || 0);
          const sinR = Math.sin(ramp.dir || 0);
          const dx = p.x - ramp.x;
          const dz = p.z - ramp.z;

          // Local coordinates relative to ramp orientation
          const localX = dx * cosR + dz * sinR; // -length/2 (bottom entrance) to +length/2 (top lip)
          const localZ = -dx * sinR + dz * cosR; // -width/2 to +width/2

          if (Math.abs(localX) <= length / 2 && Math.abs(localZ) <= width / 2) {
            if (ramp.omni) {
              // 4-way pyramid ramp can be entered from any side
              if (p.y < ramp.h && now - p.lastRampAt > 450) {
                p.vy = ramp.boostVy * (isBoosting ? 1.18 : 1.0);
                p.y = Math.max(p.y, 1.8);
                p.lastRampAt = now;
                room.events.push({ type: 'ramp', x: ramp.x, z: ramp.z, color: p.color });
              }
            } else {
              // Directional wedge ramp: check alignment between bike direction and ramp direction
              const forwardDot = Math.cos(p.dir) * cosR + Math.sin(p.dir) * sinR;

              if (forwardDot >= 0.25) {
                // Entering from the sloped front side -> ride up the slope and launch!
                const progress = Math.max(0, Math.min(1, (localX + length / 2) / length));
                const slopeY = progress * ramp.h;
                if (p.y <= slopeY + 1.2) {
                  p.y = Math.max(p.y, slopeY);
                  if (progress >= 0.55 && now - p.lastRampAt > 450) {
                    p.vy = ramp.boostVy * (isBoosting ? 1.18 : 1.0);
                    p.lastRampAt = now;
                    room.events.push({ type: 'ramp', x: ramp.x, z: ramp.z, color: p.color });
                  }
                }
              } else {
                // Entering from behind or side into the raised wedge -> block/push out, do NOT jump!
                if (localX > 0 && p.y < ramp.h - 0.4) {
                  p.x = prevX;
                  p.z = prevZ;
                }
              }
            }
            break;
          }
        }

        // Check Power-ups
        for (let i = room.pickups.length - 1; i >= 0; i--) {
          const pk = room.pickups[i];
          if (Math.hypot(p.x - pk.x, p.z - pk.z) <= 6.0 && p.y < 6) {
            if (pk.type === 'nitro') {
              p.nitro = 100;
            } else if (pk.type === 'shield') {
              p.shieldUntil = now + 5000;
            } else if (pk.type === 'trail') {
              p.megaTrailUntil = now + 10000;
            }
            room.events.push({
              type: 'pickup',
              x: pk.x,
              z: pk.z,
              name: pk.name,
              color: pk.color
            });
            room.pickups.splice(i, 1);
          }
        }

        // Append 3D trail vertices continuously (including in mid-air so airborne trails stay suspended in the air!)
        const dist3D = Math.hypot(p.x - p.lastTrailX, p.y - p.lastTrailY, p.z - p.lastTrailZ);
        if (dist3D >= 2.2) {
          p.trail.push({
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            z: Math.round(p.z * 10) / 10
          });
          p.lastTrailX = p.x;
          p.lastTrailY = p.y;
          p.lastTrailZ = p.z;
          const maxLen = now < p.megaTrailUntil ? LONG_TRAIL_LENGTH : BASE_TRAIL_LENGTH;
          while (p.trail.length > maxLen) {
            p.trail.shift();
          }
        }

        // Boundary Wall Collision
        if (Math.abs(p.x) >= HALF_ARENA || Math.abs(p.z) >= HALF_ARENA) {
          killPlayer(room, p, null, 'arena');
          continue;
        }

        // 3D Light Trail Collision (checks both XZ segment proximity AND 3D Y height overlap)
        const isShielded = now < p.shieldUntil;
        if (!isShielded) {
          let crashed = false;
          for (const other of room.players.values()) {
            if (other.dead || other.trail.length < 2) continue;
            if (other.id === p.id && p.speed < 0.15) continue;

            const maxIdx = other.id === p.id ? other.trail.length - 6 : other.trail.length - 1;
            for (let i = 0; i < maxIdx; i++) {
              const t1 = other.trail[i];
              const t2 = other.trail[i + 1];
              const segBottomY = Math.min(t1.y || 0, t2.y || 0);
              const segTopY = Math.max(t1.y || 0, t2.y || 0) + WALL_HEIGHT;

              // Check vertical overlap between bike [p.y, p.y + 2.0] and 3D ribbon [segBottomY, segTopY]
              if (p.y < segTopY - 0.3 && p.y + 2.0 > segBottomY + 0.2) {
                const dSq1 = distToSegmentSq(p.x, p.z, t1.x, t1.z, t2.x, t2.z);
                const dSq2 = distToSegmentSq((p.x + prevX) * 0.5, (p.z + prevZ) * 0.5, t1.x, t1.z, t2.x, t2.z);
                if (dSq1 < BIKE_RADIUS * BIKE_RADIUS || dSq2 < BIKE_RADIUS * BIKE_RADIUS) {
                  killPlayer(room, p, other.id === p.id ? null : other, 'trail');
                  crashed = true;
                  break;
                }
              }
            }
            if (crashed) break;

            if (other.id !== p.id && other.trail.length >= 1) {
              const lastPt = other.trail[other.trail.length - 1];
              const segBottomY = Math.min(lastPt.y || 0, other.y || 0);
              const segTopY = Math.max(lastPt.y || 0, other.y || 0) + WALL_HEIGHT;
              if (p.y < segTopY - 0.3 && p.y + 2.0 > segBottomY + 0.2) {
                const dSqTip = distToSegmentSq(p.x, p.z, lastPt.x, lastPt.z, other.x, other.z);
                if (dSqTip < BIKE_RADIUS * BIKE_RADIUS) {
                  killPlayer(room, p, other, 'trail');
                  break;
                }
              }
            }
          }
        }
      }

      if (tickCounter % 2 === 0) {
        const payload = JSON.stringify({
          type: 'state',
          roomCode: room.code,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            isBot: p.isBot,
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            z: Math.round(p.z * 10) / 10,
            dir: Math.round(p.dir * 100) / 100,
            speed: Math.round(p.speed * 100) / 100,
            nitro: Math.round(p.nitro),
            dead: p.dead,
            kills: p.kills,
            deaths: p.deaths,
            streak: p.streak,
            shielded: now < p.shieldUntil,
            megaTrail: now < p.megaTrailUntil,
            turn: p.input.left ? -1 : p.input.right ? 1 : 0,
            maxTrail: now < p.megaTrailUntil ? LONG_TRAIL_LENGTH : BASE_TRAIL_LENGTH
          })),
          pickups: room.pickups,
          events: room.events
        });

        room.events = [];

        for (const client of wss.clients) {
          if (client.readyState === 1 && client.roomCode === room.code) {
            client.send(payload);
          }
        }
      }
    }
  }, 1000 / 60);

  wss.on('connection', (ws) => {
    const playerId = `tp_${nextEntityId++}`;
    ws.playerId = playerId;
    ws.roomCode = null;
    ws.lastActionAt = 0;

    ws.send(JSON.stringify({
      type: 'welcome',
      playerId,
      arenaSize: ARENA_SIZE,
      ramps: RAMPS,
      colors: NEON_COLORS
    }));

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      const now = Date.now();

      if (msg.type === 'join') {
        if (now - ws.lastActionAt < 400) return;
        ws.lastActionAt = now;

        if (ws.roomCode && rooms.has(ws.roomCode)) {
          const oldRoom = rooms.get(ws.roomCode);
          oldRoom.players.delete(playerId);
          syncBots(oldRoom);
        }

        let room;
        if (msg.mode === 'create') {
          if (rooms.size >= MAX_ROOMS) {
            ws.send(JSON.stringify({ type: 'error', message: 'Maksimum oda sınırına ulaşıldı.' }));
            return;
          }
          const code = generateRoomCode();
          room = createRoom(code, false);
        } else if (msg.mode === 'code') {
          const code = typeof msg.roomCode === 'string' ? msg.roomCode.trim().toUpperCase().slice(0, 6) : '';
          room = rooms.get(code);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Oda bulunamadı! Kodu kontrol edin.' }));
            return;
          }
          if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
            ws.send(JSON.stringify({ type: 'error', message: 'Bu oda şu an dolu!' }));
            return;
          }
        } else {
          room = rooms.get('PUBLIC') || createRoom('PUBLIC', true);
        }

        ws.roomCode = room.code;
        const color = pickUniqueColor(room, msg.color);

        const player = createPlayerObj(playerId, msg.name || 'Rider', color, false);
        room.players.set(playerId, player);
        syncBots(room);

        const initialTrails = {};
        for (const [pid, pl] of room.players.entries()) {
          initialTrails[pid] = pl.trail;
        }

        ws.send(JSON.stringify({
          type: 'joined',
          roomCode: room.code,
          isPublic: room.isPublic,
          playerId,
          initialTrails
        }));
      } else if (msg.type === 'input') {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const p = room.players.get(playerId);
        if (!p) return;

        p.input.left = !!msg.left;
        p.input.right = !!msg.right;
        p.input.throttle = !!msg.throttle;
        p.input.brake = !!msg.brake;
        p.input.boost = !!msg.boost;
        p.input.jump = !!msg.jump;
      } else if (msg.type === 'room_action') {
        if (now - ws.lastActionAt < 350) return;
        ws.lastActionAt = now;

        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;

        if (msg.action === 'add_bot') {
          room.botCount = Math.min(6, room.botCount + 1);
          syncBots(room);
        } else if (msg.action === 'remove_bot') {
          room.botCount = Math.max(0, room.botCount - 1);
          syncBots(room);
        }
      }
    });

    ws.on('close', () => {
      if (ws.roomCode && rooms.has(ws.roomCode)) {
        const room = rooms.get(ws.roomCode);
        room.players.delete(playerId);
        syncBots(room);
      }
    });
  });

  return {
    wss,
    getStats: () => ({
      rooms: rooms.size,
      players: Array.from(rooms.values()).reduce((sum, r) => sum + r.players.size, 0)
    })
  };
}

module.exports = { createTronServer };
