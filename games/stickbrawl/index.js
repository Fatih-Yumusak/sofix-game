const { WebSocketServer } = require('ws');

// ==========================================
// GAME CONSTANTS & WEAPONS
// ==========================================
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const GRAVITY = 0.62;
const PLAYER_RADIUS = 18;
const PLAYER_HEIGHT = 52;

const WEAPONS = {
  fist: {
    id: 'fist',
    name: 'Yumruk',
    type: 'melee',
    damage: 16,
    cooldown: 280,
    range: 58,
    knockback: 11,
    ammo: Infinity,
    color: '#e2e8f0'
  },
  sword: {
    id: 'sword',
    name: 'Katana',
    type: 'melee',
    damage: 34,
    cooldown: 340,
    range: 85,
    knockback: 16,
    ammo: 18,
    color: '#38bdf8'
  },
  pistol: {
    id: 'pistol',
    name: 'Tabanca',
    type: 'ranged',
    damage: 18,
    cooldown: 240,
    speed: 22,
    spread: 0.04,
    pellets: 1,
    knockback: 7.5,
    recoil: 2.5,
    ammo: 15,
    color: '#facc15',
    bulletRadius: 4
  },
  shotgun: {
    id: 'shotgun',
    name: 'Pompalı',
    type: 'ranged',
    damage: 11,
    cooldown: 680,
    speed: 19,
    spread: 0.26,
    pellets: 6,
    knockback: 6.5,
    recoil: 9.5,
    ammo: 8,
    color: '#fb923c',
    bulletRadius: 3.5
  },
  smg: {
    id: 'smg',
    name: 'Uzi',
    type: 'ranged',
    damage: 10,
    cooldown: 105,
    speed: 21,
    spread: 0.14,
    pellets: 1,
    knockback: 4.2,
    recoil: 1.8,
    ammo: 32,
    color: '#a855f7',
    bulletRadius: 3.2
  },
  rocket: {
    id: 'rocket',
    name: 'Roketatar',
    type: 'ranged',
    damage: 55,
    cooldown: 1100,
    speed: 14,
    spread: 0.02,
    pellets: 1,
    knockback: 22,
    recoil: 11,
    ammo: 4,
    explosive: true,
    explosionRadius: 115,
    color: '#ef4444',
    bulletRadius: 7
  },
  railgun: {
    id: 'railgun',
    name: 'Lazer Sniper',
    type: 'ranged',
    damage: 65,
    cooldown: 1200,
    speed: 38,
    spread: 0,
    pellets: 1,
    knockback: 18,
    recoil: 8,
    ammo: 4,
    color: '#2dd4bf',
    bulletRadius: 5
  }
};

const DROP_WEAPON_KEYS = ['sword', 'pistol', 'shotgun', 'smg', 'rocket', 'railgun'];

const STICK_COLORS = [
  '#38bdf8',
  '#f43f5e',
  '#22c55e',
  '#facc15',
  '#a855f7',
  '#fb923c',
  '#2dd4bf',
  '#f472b6',
  '#60a5fa',
  '#ef4444',
  '#a3e635',
  '#e879f9'
];

function pickUniqueColor(room, preferredColor) {
  const usedColors = new Set(Array.from(room.players.values()).map(p => p.color));
  if (STICK_COLORS.includes(preferredColor) && !usedColors.has(preferredColor)) {
    return preferredColor;
  }
  for (const c of STICK_COLORS) {
    if (!usedColors.has(c)) return c;
  }
  return STICK_COLORS[room.players.size % STICK_COLORS.length];
}

// ==========================================
// MAPS
// ==========================================
const MAPS = [
  {
    id: 'sky_temple',
    name: 'Gökyüzü Tapınağı',
    hazard: 'void',
    platforms: [
      { x: 240, y: 560, w: 800, h: 32, color: '#334155' },
      { x: 100, y: 420, w: 260, h: 22, color: '#475569' },
      { x: 920, y: 420, w: 260, h: 22, color: '#475569' },
      { x: 460, y: 340, w: 360, h: 22, color: '#475569' },
      { x: 260, y: 210, w: 220, h: 20, color: '#64748b' },
      { x: 800, y: 210, w: 220, h: 20, color: '#64748b' }
    ],
    jumpPads: [
      { x: 265, y: 548, w: 60, h: 12, vy: -19.5 },
      { x: 955, y: 548, w: 60, h: 12, vy: -19.5 }
    ],
    spawns: [
      { x: 350, y: 480 },
      { x: 930, y: 480 },
      { x: 220, y: 340 },
      { x: 1050, y: 340 },
      { x: 640, y: 260 },
      { x: 370, y: 140 },
      { x: 910, y: 140 }
    ]
  },
  {
    id: 'lava_factory',
    name: 'Lav Fabrikası',
    hazard: 'lava',
    platforms: [
      { x: 110, y: 540, w: 320, h: 28, color: '#3f3f46' },
      { x: 850, y: 540, w: 320, h: 28, color: '#3f3f46' },
      { x: 490, y: 460, w: 300, h: 24, color: '#52525b' },
      { x: 220, y: 330, w: 260, h: 22, color: '#52525b' },
      { x: 800, y: 330, w: 260, h: 22, color: '#52525b' },
      { x: 510, y: 200, w: 260, h: 20, color: '#71717a' }
    ],
    jumpPads: [
      { x: 140, y: 528, w: 65, h: 12, vy: -20.5 },
      { x: 1075, y: 528, w: 65, h: 12, vy: -20.5 },
      { x: 610, y: 448, w: 60, h: 12, vy: -18.5 }
    ],
    spawns: [
      { x: 250, y: 460 },
      { x: 1000, y: 460 },
      { x: 640, y: 380 },
      { x: 350, y: 250 },
      { x: 930, y: 250 },
      { x: 640, y: 130 }
    ]
  },
  {
    id: 'twin_towers',
    name: 'İkiz Kuleler',
    hazard: 'void',
    platforms: [
      { x: 140, y: 580, w: 340, h: 30, color: '#1e293b' },
      { x: 800, y: 580, w: 340, h: 30, color: '#1e293b' },
      { x: 540, y: 500, w: 200, h: 22, color: '#334155' },
      { x: 180, y: 410, w: 240, h: 22, color: '#334155' },
      { x: 860, y: 410, w: 240, h: 22, color: '#334155' },
      { x: 470, y: 310, w: 340, h: 22, color: '#475569' },
      { x: 180, y: 220, w: 200, h: 20, color: '#64748b' },
      { x: 900, y: 220, w: 200, h: 20, color: '#64748b' }
    ],
    jumpPads: [
      { x: 400, y: 568, w: 60, h: 12, vy: -20 },
      { x: 820, y: 568, w: 60, h: 12, vy: -20 }
    ],
    spawns: [
      { x: 280, y: 500 },
      { x: 980, y: 500 },
      { x: 640, y: 420 },
      { x: 300, y: 330 },
      { x: 980, y: 330 },
      { x: 640, y: 230 }
    ]
  }
];

const MAX_ROOMS = 100;
const MAX_PLAYERS_PER_ROOM = 12;

function sanitizeName(raw) {
  if (typeof raw !== 'string') return 'Stickman';
  const cleaned = raw.replace(/[<>&"'`\\]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return cleaned.slice(0, 16) || 'Stickman';
}

function createStickBrawlServer() {
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
      mapIndex: 0,
      players: new Map(),
      bullets: [],
      weaponDrops: [],
      events: [],
      lastDropTime: Date.now(),
      botCount: 0,
      createdAt: Date.now()
    };
    rooms.set(code, room);
    syncBots(room);
    return room;
  }

  function getMap(room) {
    return MAPS[room.mapIndex % MAPS.length];
  }

  function getRandomSpawn(room) {
    const map = getMap(room);
    const pt = map.spawns[Math.floor(Math.random() * map.spawns.length)];
    return {
      x: pt.x + (Math.random() * 40 - 20),
      y: pt.y
    };
  }

  function createPlayerObj(id, name, color, isBot = false, room) {
    const spawn = getRandomSpawn(room);
    return {
      id,
      name: sanitizeName(name),
      color,
      isBot,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      dead: false,
      respawnAt: 0,
      kills: 0,
      deaths: 0,
      streak: 0,
      weapon: 'fist',
      ammo: Infinity,
      aimAngle: 0,
      facing: 1,
      onGround: false,
      jumpsLeft: 2,
      lastJumpPressed: false,
      lastAttackTime: 0,
      meleeSwingUntil: 0,
      dashUntil: 0,
      dashCooldownUntil: 0,
      invulnerableUntil: Date.now() + 1500,
      lastDamagedBy: null,
      lastDamagedAt: 0,
      input: {
        left: false,
        right: false,
        up: false,
        down: false,
        attack: false,
        dash: false,
        aimAngle: 0
      },
      botState: {
        targetId: null,
        rethinkAt: 0,
        strafeDir: 1
      }
    };
  }

  const BOT_NAMES = ['Gölge [BOT]', 'Ninja [BOT]', 'Keskin [BOT]', 'Barut [BOT]', 'Kaos [BOT]'];

  function syncBots(room) {
    const currentBots = Array.from(room.players.values()).filter(p => p.isBot);
    const humanCount = Array.from(room.players.values()).filter(p => !p.isBot).length;
    const targetBots = humanCount === 0 ? 0 : room.botCount;

    while (currentBots.length < targetBots && room.players.size < 10) {
      const botId = `bot_${nextEntityId++}`;
      const botIndex = currentBots.length;
      const botName = BOT_NAMES[botIndex % BOT_NAMES.length];
      const color = pickUniqueColor(room, null);
      const bot = createPlayerObj(botId, botName, color, true, room);
      room.players.set(botId, bot);
      currentBots.push(bot);
    }

    while (currentBots.length > targetBots) {
      const botToRemove = currentBots.pop();
      if (botToRemove) {
        room.players.delete(botToRemove.id);
      }
    }
  }

  createRoom('PUBLIC', true);

  function updateBotAI(bot, room, now) {
    if (bot.dead) return;

    let nearestEnemy = null;
    let nearestDist = Infinity;

    for (const other of room.players.values()) {
      if (other.id === bot.id || other.dead) continue;
      const dist = Math.hypot(other.x - bot.x, other.y - bot.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = other;
      }
    }

    let targetCrate = null;
    if (bot.weapon === 'fist' && room.weaponDrops.length > 0) {
      let minCrateDist = 420;
      for (const drop of room.weaponDrops) {
        const d = Math.hypot(drop.x - bot.x, drop.y - bot.y);
        if (d < minCrateDist) {
          minCrateDist = d;
          targetCrate = drop;
        }
      }
    }

    const input = bot.input;
    input.left = false;
    input.right = false;
    input.up = false;
    input.attack = false;
    input.dash = false;

    const target = targetCrate || nearestEnemy;
    if (!target) {
      if (bot.x < 500) input.right = true;
      else if (bot.x > 780) input.left = true;
      return;
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;

    if (now > bot.botState.rethinkAt) {
      bot.botState.rethinkAt = now + 450 + Math.random() * 450;
      bot.botState.strafeDir = Math.random() < 0.5 ? -1 : 1;
    }

    const wep = WEAPONS[bot.weapon] || WEAPONS.fist;
    const preferredDist = targetCrate ? 10 : (wep.type === 'melee' ? 42 : 260);

    if (Math.abs(dx) > preferredDist) {
      if (dx > 0) input.right = true;
      else input.left = true;
    } else if (!targetCrate && wep.type === 'ranged') {
      if (bot.botState.strafeDir > 0) input.right = true;
      else input.left = true;
    }

    if (bot.x < 160) {
      input.left = false;
      input.right = true;
    } else if (bot.x > GAME_WIDTH - 160) {
      input.right = false;
      input.left = true;
    }

    if ((dy < -45 && Math.random() < 0.25) || (bot.y > 540 && bot.vy > 0)) {
      input.up = true;
    } else {
      input.up = false;
    }

    if (nearestEnemy) {
      const aimDx = nearestEnemy.x - bot.x;
      const aimDy = (nearestEnemy.y - 16) - (bot.y - 20);
      input.aimAngle = Math.atan2(aimDy, aimDx) + (Math.random() * 0.14 - 0.07);

      const attackRange = wep.type === 'melee' ? wep.range + 15 : 680;
      if (nearestDist <= attackRange && Math.random() < 0.45) {
        input.attack = true;
      }

      if (nearestDist < 120 && Math.random() < 0.03) {
        input.dash = true;
      }
    }
  }

  function damagePlayer(room, victim, attacker, amount, knockX, knockY, weaponId) {
    const now = Date.now();
    if (victim.dead || now < victim.invulnerableUntil || now < victim.dashUntil) return;

    victim.hp -= amount;
    victim.vx += knockX;
    victim.vy += knockY;
    if (attacker && attacker.id !== victim.id) {
      victim.lastDamagedBy = attacker.id;
      victim.lastDamagedAt = now;
    }

    room.events.push({
      type: 'hit',
      x: victim.x,
      y: victim.y - 24,
      damage: Math.round(amount),
      color: victim.color
    });

    if (victim.hp <= 0) {
      killPlayer(room, victim, attacker, weaponId);
    }
  }

  function killPlayer(room, victim, killer, weaponId = 'void') {
    if (victim.dead) return;
    victim.dead = true;
    victim.hp = 0;
    victim.deaths += 1;
    victim.streak = 0;
    victim.respawnAt = Date.now() + 2600;

    const now = Date.now();
    if (!killer && victim.lastDamagedBy && now - victim.lastDamagedAt < 5000) {
      killer = room.players.get(victim.lastDamagedBy) || null;
    }

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.streak += 1;
      if (!killer.dead) {
        killer.hp = Math.min(killer.maxHp, killer.hp + 25);
      }
    }

    room.events.push({
      type: 'kill',
      x: victim.x,
      y: victim.y - 20,
      victimName: victim.name,
      victimColor: victim.color,
      killerName: killer ? killer.name : null,
      killerColor: killer ? killer.color : '#94a3b8',
      weapon: weaponId
    });
  }

  function triggerAttack(room, p, now) {
    const wep = WEAPONS[p.weapon] || WEAPONS.fist;
    if (now - p.lastAttackTime < wep.cooldown) return;
    p.lastAttackTime = now;

    const cos = Math.cos(p.aimAngle);
    const sin = Math.sin(p.aimAngle);
    p.facing = cos >= 0 ? 1 : -1;

    if (wep.type === 'melee') {
      p.meleeSwingUntil = now + 180;
      p.vx += cos * 4.5;

      room.events.push({
        type: 'swing',
        playerId: p.id,
        x: p.x,
        y: p.y - 22,
        angle: p.aimAngle,
        range: wep.range,
        color: wep.color,
        weapon: wep.id
      });

      if (wep.id === 'sword') {
        for (const b of room.bullets) {
          if (b.ownerId !== p.id && Math.hypot(b.x - p.x, b.y - (p.y - 22)) < wep.range + 20) {
            b.ownerId = p.id;
            b.vx = -b.vx * 1.15;
            b.vy = -b.vy * 1.15;
            b.color = p.color;
          }
        }
      }

      for (const other of room.players.values()) {
        if (other.id === p.id || other.dead) continue;
        const dx = other.x - p.x;
        const dy = (other.y - 22) - (p.y - 22);
        const dist = Math.hypot(dx, dy);
        if (dist <= wep.range + PLAYER_RADIUS) {
          const angleToTarget = Math.atan2(dy, dx);
          let angleDiff = Math.abs(angleToTarget - p.aimAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (angleDiff <= 1.25 || dist < 36) {
            damagePlayer(
              room,
              other,
              p,
              wep.damage,
              cos * wep.knockback,
              sin * wep.knockback - 4.5,
              wep.id
            );
          }
        }
      }
    } else {
      p.vx -= cos * wep.recoil;
      p.vy -= sin * (wep.recoil * 0.65);

      room.events.push({
        type: 'shoot',
        x: p.x + cos * 28,
        y: p.y - 22 + sin * 28,
        angle: p.aimAngle,
        weapon: wep.id,
        color: wep.color
      });

      for (let i = 0; i < wep.pellets; i++) {
        const angleOffset = (Math.random() - 0.5) * wep.spread;
        const a = p.aimAngle + angleOffset;
        const speedVar = wep.pellets > 1 ? (0.88 + Math.random() * 0.24) : 1;
        room.bullets.push({
          id: nextEntityId++,
          ownerId: p.id,
          weaponId: wep.id,
          x: p.x + Math.cos(a) * 26,
          y: (p.y - 22) + Math.sin(a) * 26,
          vx: Math.cos(a) * wep.speed * speedVar,
          vy: Math.sin(a) * wep.speed * speedVar,
          damage: wep.damage,
          knockback: wep.knockback,
          radius: wep.bulletRadius,
          explosive: !!wep.explosive,
          explosionRadius: wep.explosionRadius || 0,
          color: wep.color,
          ttl: wep.id === 'shotgun' ? 26 : 75
        });
      }
    }

    if (p.ammo !== Infinity) {
      p.ammo -= 1;
      if (p.ammo <= 0) {
        p.weapon = 'fist';
        p.ammo = Infinity;
      }
    }
  }

  function triggerExplosion(room, bullet) {
    room.events.push({
      type: 'explosion',
      x: bullet.x,
      y: bullet.y,
      radius: bullet.explosionRadius
    });

    const owner = room.players.get(bullet.ownerId) || null;
    for (const p of room.players.values()) {
      if (p.dead) continue;
      const dx = p.x - bullet.x;
      const dy = (p.y - 22) - bullet.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= bullet.explosionRadius) {
        const factor = Math.max(0.25, 1 - dist / bullet.explosionRadius);
        const dmg = bullet.damage * factor * (owner && owner.id === p.id ? 0.45 : 1);
        const angle = Math.atan2(dy, dx);
        damagePlayer(
          room,
          p,
          owner,
          dmg,
          Math.cos(angle) * bullet.knockback * factor,
          Math.sin(angle) * bullet.knockback * factor - 5,
          bullet.weaponId
        );
      }
    }
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

      const map = getMap(room);

      if (now - room.lastDropTime > 5200 && room.weaponDrops.length < 4) {
        room.lastDropTime = now;
        const plat = map.platforms[Math.floor(Math.random() * map.platforms.length)];
        const wepKey = DROP_WEAPON_KEYS[Math.floor(Math.random() * DROP_WEAPON_KEYS.length)];
        room.weaponDrops.push({
          id: nextEntityId++,
          weapon: wepKey,
          x: plat.x + 30 + Math.random() * Math.max(20, plat.w - 60),
          y: -30,
          vy: 0,
          targetY: plat.y - 16
        });
      }

      for (const drop of room.weaponDrops) {
        if (drop.y < drop.targetY) {
          drop.vy = Math.min(drop.vy + 0.18, 4.2);
          drop.y = Math.min(drop.targetY, drop.y + drop.vy);
        }
      }

      for (const p of room.players.values()) {
        if (p.isBot) {
          updateBotAI(p, room, now);
        }

        if (p.dead) {
          if (now >= p.respawnAt) {
            const sp = getRandomSpawn(room);
            p.x = sp.x;
            p.y = sp.y;
            p.vx = 0;
            p.vy = 0;
            p.hp = p.maxHp;
            p.dead = false;
            p.weapon = 'fist';
            p.ammo = Infinity;
            p.invulnerableUntil = now + 1500;
            p.lastDamagedBy = null;
          }
          continue;
        }

        p.aimAngle = p.input.aimAngle || 0;
        p.facing = Math.cos(p.aimAngle) >= 0 ? 1 : -1;

        if (p.input.dash && now >= p.dashCooldownUntil) {
          p.dashUntil = now + 160;
          p.dashCooldownUntil = now + 1300;
          const dashDir = p.input.left ? -1 : p.input.right ? 1 : p.facing;
          p.vx = dashDir * 17.5;
          p.vy = -2.5;
          room.events.push({
            type: 'dash',
            x: p.x,
            y: p.y - 22,
            color: p.color
          });
        }

        const accel = p.onGround ? 1.35 : 0.85;
        const maxSpeed = 7.4;
        if (now >= p.dashUntil) {
          if (p.input.left) {
            if (p.vx > -maxSpeed) p.vx = Math.max(-maxSpeed, p.vx - accel);
          } else if (p.input.right) {
            if (p.vx < maxSpeed) p.vx = Math.min(maxSpeed, p.vx + accel);
          } else {
            p.vx *= p.onGround ? 0.76 : 0.91;
          }
        }

        if (p.input.up && !p.lastJumpPressed && p.jumpsLeft > 0) {
          p.vy = p.jumpsLeft === 2 ? -13.6 : -12.2;
          p.onGround = false;
          p.jumpsLeft -= 1;
          room.events.push({
            type: 'jump',
            x: p.x,
            y: p.y,
            color: p.color
          });
        }
        p.lastJumpPressed = !!p.input.up;

        p.vy = Math.min(p.vy + GRAVITY, 18);

        const prevY = p.y;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 24) {
          p.x = 24;
          p.vx = Math.max(0, p.vx);
        } else if (p.x > GAME_WIDTH - 24) {
          p.x = GAME_WIDTH - 24;
          p.vx = Math.min(0, p.vx);
        }

        p.onGround = false;
        if (p.vy >= 0 && !p.input.down) {
          for (const plat of map.platforms) {
            if (
              p.x + 12 >= plat.x &&
              p.x - 12 <= plat.x + plat.w &&
              prevY <= plat.y + 8 &&
              p.y >= plat.y
            ) {
              p.y = plat.y;
              p.vy = 0;
              p.onGround = true;
              p.jumpsLeft = 2;
              break;
            }
          }
        }

        for (const pad of map.jumpPads) {
          if (
            p.x + 12 >= pad.x &&
            p.x - 12 <= pad.x + pad.w &&
            Math.abs(p.y - pad.y) <= 18
          ) {
            p.vy = pad.vy;
            p.onGround = false;
            p.jumpsLeft = 1;
            room.events.push({
              type: 'bounce',
              x: pad.x + pad.w / 2,
              y: pad.y
            });
          }
        }

        for (let i = room.weaponDrops.length - 1; i >= 0; i--) {
          const drop = room.weaponDrops[i];
          if (Math.hypot(drop.x - p.x, drop.y - (p.y - 18)) < 38) {
            const wep = WEAPONS[drop.weapon];
            p.weapon = drop.weapon;
            p.ammo = wep.ammo;
            room.weaponDrops.splice(i, 1);
            room.events.push({
              type: 'pickup',
              x: drop.x,
              y: drop.y,
              weaponName: wep.name,
              color: wep.color
            });
          }
        }

        if (p.input.attack) {
          triggerAttack(room, p, now);
        }

        if (p.y > GAME_HEIGHT + 50 || (map.hazard === 'lava' && p.y > GAME_HEIGHT - 28)) {
          killPlayer(room, p, null, map.hazard);
        }
      }

      for (let i = room.bullets.length - 1; i >= 0; i--) {
        const b = room.bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.ttl -= 1;

        let removeBullet = false;

        if (b.ttl <= 0 || b.x < -50 || b.x > GAME_WIDTH + 50 || b.y < -50 || b.y > GAME_HEIGHT + 50) {
          removeBullet = true;
        }

        if (!removeBullet) {
          for (const plat of map.platforms) {
            if (
              b.x >= plat.x &&
              b.x <= plat.x + plat.w &&
              b.y >= plat.y &&
              b.y <= plat.y + plat.h
            ) {
              if (b.explosive) triggerExplosion(room, b);
              removeBullet = true;
              break;
            }
          }
        }

        if (!removeBullet) {
          for (const p of room.players.values()) {
            if (p.id === b.ownerId || p.dead) continue;
            if (
              Math.abs(b.x - p.x) <= PLAYER_RADIUS + b.radius &&
              b.y >= p.y - PLAYER_HEIGHT &&
              b.y <= p.y
            ) {
              if (b.explosive) {
                triggerExplosion(room, b);
              } else {
                const owner = room.players.get(b.ownerId) || null;
                const angle = Math.atan2(b.vy, b.vx);
                damagePlayer(
                  room,
                  p,
                  owner,
                  b.damage,
                  Math.cos(angle) * b.knockback,
                  Math.sin(angle) * b.knockback - 3,
                  b.weaponId
                );
              }
              removeBullet = true;
              break;
            }
          }
        }

        if (removeBullet) {
          room.bullets.splice(i, 1);
        }
      }

      if (tickCounter % 2 === 0) {
        const payload = JSON.stringify({
          type: 'state',
          t: now,
          roomCode: room.code,
          mapId: map.id,
          mapName: map.name,
          botCount: room.botCount,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            isBot: p.isBot,
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            vx: Math.round(p.vx * 10) / 10,
            vy: Math.round(p.vy * 10) / 10,
            hp: Math.max(0, Math.round(p.hp)),
            dead: p.dead,
            kills: p.kills,
            deaths: p.deaths,
            streak: p.streak,
            weapon: p.weapon,
            ammo: p.ammo === Infinity ? -1 : p.ammo,
            aimAngle: Math.round(p.aimAngle * 100) / 100,
            facing: p.facing,
            onGround: p.onGround,
            meleeActive: now < p.meleeSwingUntil,
            dashing: now < p.dashUntil,
            invuln: now < p.invulnerableUntil
          })),
          bullets: room.bullets.map(b => ({
            id: b.id,
            x: Math.round(b.x),
            y: Math.round(b.y),
            vx: Math.round(b.vx * 10) / 10,
            vy: Math.round(b.vy * 10) / 10,
            r: b.radius,
            c: b.color,
            exp: b.explosive
          })),
          drops: room.weaponDrops.map(d => ({
            id: d.id,
            w: d.weapon,
            x: Math.round(d.x),
            y: Math.round(d.y)
          })),
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
    const playerId = `p_${nextEntityId++}`;
    ws.playerId = playerId;
    ws.roomCode = null;
    ws.lastActionAt = 0;

    ws.send(JSON.stringify({
      type: 'welcome',
      playerId,
      maps: MAPS,
      weapons: WEAPONS
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
            ws.send(JSON.stringify({ type: 'error', message: 'Maksimum oda sınırına ulaşıldı, lütfen genel arenaya katılın.' }));
            return;
          }
          const code = generateRoomCode();
          room = createRoom(code, false);
          room.botCount = 0;
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

        const player = createPlayerObj(playerId, msg.name || 'Stickman', color, false, room);
        room.players.set(playerId, player);
        syncBots(room);

        ws.send(JSON.stringify({
          type: 'joined',
          roomCode: room.code,
          isPublic: room.isPublic,
          playerId
        }));
      } else if (msg.type === 'input') {
        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const p = room.players.get(playerId);
        if (!p) return;

        p.input.left = !!msg.left;
        p.input.right = !!msg.right;
        p.input.up = !!msg.up;
        p.input.down = !!msg.down;
        p.input.attack = !!msg.attack;
        p.input.dash = !!msg.dash;
        if (typeof msg.aimAngle === 'number' && Number.isFinite(msg.aimAngle)) {
          p.input.aimAngle = Math.max(-Math.PI, Math.min(Math.PI, msg.aimAngle));
        }
      } else if (msg.type === 'room_action') {
        if (now - ws.lastActionAt < 350) return;
        ws.lastActionAt = now;

        if (!ws.roomCode) return;
        const room = rooms.get(ws.roomCode);
        if (!room) return;

        if (msg.action === 'next_map') {
          room.mapIndex = (room.mapIndex + 1) % MAPS.length;
          room.weaponDrops = [];
          room.bullets = [];
          for (const p of room.players.values()) {
            const sp = getRandomSpawn(room);
            p.x = sp.x;
            p.y = sp.y;
            p.vx = 0;
            p.vy = 0;
            p.hp = p.maxHp;
          }
        } else if (msg.action === 'add_bot') {
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

module.exports = { createStickBrawlServer };

