/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DungeonLevel, DungeonRoom, Enemy, EnemyType, TileMap } from './types';

export const TILE_SIZE = 32;

// Tile types:
// 0: void
// 1: floor
// 2: wall_top (Zelda 3 2.5D coping)
// 3: wall_front (Zelda 3 2.5D front facing wall with depth)
// 4: column / pillar
// 5: door / archway
// 6: stairs_down
// 7: blood_altar
// 8: chest_closed
// 9: pit / chasm (impassable hazard)
// 10: spike_trap (floor hazard)

export function generateDungeonLevel(depth: number): {
  level: DungeonLevel;
  enemies: Enemy[];
  chests: { x: number; y: number; opened: boolean }[];
  altars: { x: number; y: number; purified: boolean }[];
} {
  const width = 52;
  const height = 52;
  const tiles: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  // Generate 7 to 10 interconnected rooms
  const numRooms = Math.min(10, 6 + Math.floor(depth / 2));
  const rooms: DungeonRoom[] = [];

  for (let attempt = 0; attempt < 100 && rooms.length < numRooms; attempt++) {
    const rw = Math.floor(Math.random() * 5) + 8; // 8 to 12 tiles wide
    const rh = Math.floor(Math.random() * 5) + 8; // 8 to 12 tiles high
    const rx = Math.floor(Math.random() * (width - rw - 4)) + 2;
    const ry = Math.floor(Math.random() * (height - rh - 4)) + 2;

    let overlaps = false;
    for (const r of rooms) {
      if (
        rx < r.x + r.w + 3 &&
        rx + rw + 3 > r.x &&
        ry < r.y + r.h + 3 &&
        ry + rh + 3 > r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      const roomType =
        rooms.length === 0
          ? 'start'
          : rooms.length === numRooms - 1 && depth % 3 === 0
          ? 'boss'
          : rooms.length % 3 === 0
          ? 'altar'
          : 'combat';
      rooms.push({ x: rx, y: ry, w: rw, h: rh, type: roomType });
    }
  }

  // Carve rooms with floors
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        tiles[y][x] = 1; // Floor
      }
    }
    // Add pillars inside larger rooms
    if (r.w >= 10 && r.h >= 10 && r.type !== 'boss') {
      tiles[r.y + 3][r.x + 3] = 4;
      tiles[r.y + 3][r.x + r.w - 4] = 4;
      tiles[r.y + r.h - 4][r.x + 3] = 4;
      tiles[r.y + r.h - 4][r.x + r.w - 4] = 4;
    }

    // Introduce Pits and Spike Traps in combat/boss rooms (depth >= 2)
    if (depth >= 2 && r.type !== 'start') {
      // Add a pit in larger rooms
      if (r.w >= 9 && r.h >= 9 && Math.random() < 0.6) {
        const px = r.x + Math.floor(r.w / 2);
        const py = r.y + Math.floor(r.h / 2);
        tiles[py][px] = 9; // Pit
        tiles[py][px + 1] = 9;
      }
      // Add spike traps on random floor tiles
      const trapCount = Math.floor(Math.random() * 2) + (depth >= 3 ? 2 : 1);
      for (let t = 0; t < trapCount; t++) {
        const tx = r.x + 2 + Math.floor(Math.random() * (r.w - 4));
        const ty = r.y + 2 + Math.floor(Math.random() * (r.h - 4));
        if (tiles[ty][tx] === 1) {
          tiles[ty][tx] = 10; // Spike Trap
        }
      }
    }
  }

  // Connect rooms with corridors (L-shaped corridors)
  for (let i = 0; i < rooms.length - 1; i++) {
    const r1 = rooms[i];
    const r2 = rooms[i + 1];

    let cx = Math.floor(r1.x + r1.w / 2);
    let cy = Math.floor(r1.y + r1.h / 2);
    const targetX = Math.floor(r2.x + r2.w / 2);
    const targetY = Math.floor(r2.y + r2.h / 2);

    while (cx !== targetX) {
      tiles[cy][cx] = 1;
      tiles[cy + 1][cx] = 1;
      cx += cx < targetX ? 1 : -1;
    }
    while (cy !== targetY) {
      tiles[cy][cx] = 1;
      tiles[cy][cx + 1] = 1;
      cy += cy < targetY ? 1 : -1;
    }
  }

  // Apply Zelda 3 2.5D Walls around all floor/pit/hazard tiles!
  // Pass 1: North wall front faces -> wall_front (3)
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === 0 && (tiles[y + 1][x] === 1 || tiles[y + 1][x] === 10)) {
        tiles[y][x] = 3; // Wall Front
      }
    }
  }

  // Pass 2: Side walls, top depth coping -> wall_top (2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === 0) {
        const hasFloorNearby =
          (y > 0 && (tiles[y - 1][x] === 1 || tiles[y - 1][x] === 10)) ||
          (x > 0 && (tiles[y][x - 1] === 1 || tiles[y][x - 1] === 10)) ||
          (x < width - 1 && (tiles[y][x + 1] === 1 || tiles[y][x + 1] === 10)) ||
          (y < height - 1 && tiles[y + 1][x] === 3);

        if (hasFloorNearby) {
          tiles[y][x] = 2; // Wall Top
        }
      }
    }
  }

  // GUARANTEED WALL-MOUNTED TORCHES: Scan wall tiles (2 or 3) that have a floor immediately below them
  const torchPositions: { x: number; y: number }[] = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      if ((tiles[y][x] === 2 || tiles[y][x] === 3) && tiles[y + 1][x] === 1) {
        // Place torch on this wall tile, slightly offset toward the center
        // Only pick roughly every 5th or 6th valid wall tile to space them out nicely
        if ((x * 7 + y * 13) % 7 === 0) {
          torchPositions.push({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2,
          });
        }
      }
    }
  }

  // Fallback: Ensure every room has at least 2 wall-mounted torches if none were picked
  for (const r of rooms) {
    const roomTorches = torchPositions.filter(
      (tp) => tp.x >= r.x * TILE_SIZE && tp.x <= (r.x + r.w) * TILE_SIZE && tp.y >= (r.y - 1) * TILE_SIZE && tp.y <= (r.y + r.h) * TILE_SIZE
    );
    if (roomTorches.length === 0) {
      torchPositions.push({
        x: (r.x + 2) * TILE_SIZE,
        y: (r.y + 1) * TILE_SIZE,
      });
      torchPositions.push({
        x: (r.x + r.w - 3) * TILE_SIZE,
        y: (r.y + 1) * TILE_SIZE,
      });
    }
  }

  // Spawn Point in Room 0
  const startRoom = rooms[0];
  const spawnPoint = {
    x: (startRoom.x + Math.floor(startRoom.w / 2)) * TILE_SIZE + TILE_SIZE / 2,
    y: (startRoom.y + Math.floor(startRoom.h / 2)) * TILE_SIZE + TILE_SIZE / 2,
  };

  // Exit Stairs in Last Room
  const exitRoom = rooms[rooms.length - 1];
  const stairsPos = {
    x: exitRoom.x + Math.floor(exitRoom.w / 2),
    y: exitRoom.y + Math.floor(exitRoom.h / 2),
  };
  tiles[stairsPos.y][stairsPos.x] = 6; // Stairs Down tile

  // Chests and Altars
  const chests: { x: number; y: number; opened: boolean }[] = [];
  const altars: { x: number; y: number; purified: boolean }[] = [];

  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    if (r.type === 'altar') {
      const ax = r.x + Math.floor(r.w / 2);
      const ay = r.y + Math.floor(r.h / 2);
      tiles[ay][ax] = 7;
      altars.push({ x: ax * TILE_SIZE + TILE_SIZE / 2, y: ay * TILE_SIZE + TILE_SIZE / 2, purified: false });
    } else if (i % 2 === 1 && r.type !== 'boss') {
      const cx = r.x + 2;
      const cy = r.y + 2;
      tiles[cy][cx] = 8;
      chests.push({ x: cx * TILE_SIZE + TILE_SIZE / 2, y: cy * TILE_SIZE + TILE_SIZE / 2, opened: false });
    }
  }

  // Populate Enemies with Progressive Level Scaling
  const enemies: Enemy[] = [];
  let enemyIdCounter = 0;

  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i];
    if (r.type === 'boss') {
      const bx = (r.x + Math.floor(r.w / 2)) * TILE_SIZE;
      const by = (r.y + Math.floor(r.h / 2)) * TILE_SIZE;
      enemies.push(createEnemyInstance(`boss_${depth}_${++enemyIdCounter}`, 'boss_malakor', bx, by, depth + 2));
      continue;
    }

    const enemyCount = Math.floor(Math.random() * 3) + 2 + Math.floor(depth / 2);
    for (let e = 0; e < enemyCount; e++) {
      const ex = (r.x + 2 + Math.floor(Math.random() * (r.w - 4))) * TILE_SIZE + TILE_SIZE / 2;
      const ey = (r.y + 2 + Math.floor(Math.random() * (r.h - 4))) * TILE_SIZE + TILE_SIZE / 2;

      const type = pickEnemyTypeForDepth(depth);
      enemies.push(createEnemyInstance(`enemy_${depth}_${++enemyIdCounter}`, type, ex, ey, depth));
    }
  }

  const themeName = depth <= 2 ? 'Flooded Warrens' : depth <= 4 ? 'Ancient Catacombs' : 'Sanguine Sanctum';

  const map: TileMap = {
    width,
    height,
    tileSize: TILE_SIZE,
    tiles,
    torchPositions,
    stairsPos,
  };

  const level: DungeonLevel = {
    depth,
    name: `${themeName} - Floor ${depth}`,
    theme: depth <= 2 ? 'warrens' : depth <= 4 ? 'catacombs' : 'sanctum',
    map,
    rooms,
    spawnPoint,
  };

  return { level, enemies, chests, altars };
}

function pickEnemyTypeForDepth(depth: number): EnemyType {
  if (depth === 1) {
    return Math.random() < 0.65 ? 'slime' : 'goblin';
  } else if (depth === 2) {
    const r = Math.random();
    return r < 0.35 ? 'slime' : r < 0.75 ? 'goblin' : 'goblin_spear';
  } else if (depth === 3) {
    const r = Math.random();
    return r < 0.25 ? 'goblin_spear' : r < 0.7 ? 'skeleton' : 'ghoul';
  } else if (depth === 4) {
    const r = Math.random();
    return r < 0.4 ? 'skeleton' : r < 0.7 ? 'ghoul' : 'cultist';
  } else if (depth === 5) {
    const r = Math.random();
    return r < 0.3 ? 'ghoul' : r < 0.6 ? 'cultist' : r < 0.85 ? 'necromancer' : 'abomination';
  } else {
    const r = Math.random();
    return r < 0.25 ? 'necromancer' : r < 0.6 ? 'abomination' : 'blood_demon';
  }
}

function createEnemyInstance(id: string, type: EnemyType, x: number, y: number, level: number): Enemy {
  let hp = 30 + level * 15;
  let attack = 6 + level * 3;
  let defense = 2 + level * 2;
  let speed = 1.2;
  let radius = 12;
  let attackRange = 24;
  let attackCooldown = 1.0;
  let name = 'Enemy';
  let isBoss = false;

  switch (type) {
    case 'slime':
      name = 'Acid Slime';
      hp = 25 + level * 10;
      attack = 5 + level * 2;
      defense = 1;
      speed = 0.9;
      radius = 10;
      attackRange = 18;
      break;
    case 'goblin':
      name = 'Goblin Skirmisher';
      hp = 35 + level * 12;
      attack = 8 + level * 3;
      defense = 3;
      speed = 1.5;
      radius = 11;
      attackRange = 22;
      break;
    case 'goblin_spear':
      name = 'Goblin Spearman';
      hp = 45 + level * 14;
      attack = 10 + level * 3;
      defense = 4;
      speed = 1.3;
      radius = 11;
      attackRange = 36;
      attackCooldown = 1.2;
      break;
    case 'skeleton':
      name = 'Crypt Skeleton';
      hp = 55 + level * 18;
      attack = 12 + level * 4;
      defense = 6;
      speed = 1.1;
      radius = 12;
      attackRange = 25;
      break;
    case 'ghoul':
      name = 'Ghoul Stalker';
      hp = 70 + level * 20;
      attack = 15 + level * 4;
      defense = 5;
      speed = 1.6;
      radius = 13;
      attackRange = 24;
      break;
    case 'cultist':
      name = 'Sanguine Cultist';
      hp = 80 + level * 22;
      attack = 18 + level * 5;
      defense = 7;
      speed = 1.2;
      radius = 12;
      attackRange = 60;
      break;
    case 'necromancer':
      name = 'Dread Necromancer';
      hp = 120 + level * 30;
      attack = 22 + level * 6;
      defense = 9;
      speed = 1.1;
      radius = 14;
      attackRange = 75;
      break;
    case 'abomination':
      name = 'Flesh Abomination';
      hp = 240 + level * 50;
      attack = 28 + level * 8;
      defense = 14;
      speed = 0.85;
      radius = 20;
      attackRange = 32;
      attackCooldown = 1.5;
      break;
    case 'blood_demon':
      name = 'Blood Demon';
      hp = 280 + level * 60;
      attack = 34 + level * 9;
      defense = 16;
      speed = 1.4;
      radius = 18;
      attackRange = 34;
      break;
    case 'boss_malakor':
      name = 'Malakor the Flayed';
      hp = 650 + level * 150;
      attack = 42 + level * 12;
      defense = 22;
      speed = 1.0;
      radius = 28;
      attackRange = 48;
      attackCooldown = 1.3;
      isBoss = true;
      break;
  }

  return {
    id,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    facing: 'down',
    hp,
    maxHp: hp,
    level,
    attack,
    defense,
    speed,
    radius,
    attackRange,
    attackCooldown,
    lastAttackTime: 0,
    hitFlashTimer: 0,
    isStunned: false,
    stunTimer: 0,
    state: 'idle',
    patrolTarget: null,
    targetPlayerIndex: 0,
    animFrame: 0,
    animTimer: 0,
    isBoss,
    name,
  };
}

export function isTileSolid(tileType: number): boolean {
  // 0: void, 2: wall_top, 3: wall_front, 4: column, 8: closed chest, 9: pit
  return tileType === 0 || tileType === 2 || tileType === 3 || tileType === 4 || tileType === 8 || tileType === 9;
}
