/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary' | 'mythic';

export type ItemSlot = 'weapon' | 'shield' | 'armor' | 'helmet' | 'boots';

export interface ItemAffix {
  name: string;
  stat: 'attack' | 'defense' | 'maxHp' | 'speed' | 'critChance' | 'lifeSteal' | 'thorns';
  value: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  level: number;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  speedBonus: number;
  critChance: number;
  lifeSteal: number;
  thorns: number;
  durability: number;
  maxDurability: number;
  affixes: ItemAffix[];
  spriteIndex: number;
  color: string;
  specialEffect?: string;
  value: number;
}

export interface GroundItem {
  id: string;
  x: number;
  y: number;
  item: EquipmentItem;
  bobTime: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'kill' | 'boss' | 'relic' | 'altars';
  targetEnemyType?: string;
  currentCount: number;
  targetCount: number;
  goldReward: number;
  xpReward: number;
  rewardItemRarity: ItemRarity;
  completed: boolean;
  claimed: boolean;
}

export type EnemyType = 
  | 'slime' 
  | 'goblin' 
  | 'goblin_spear' 
  | 'skeleton' 
  | 'ghoul' 
  | 'cultist' 
  | 'necromancer' 
  | 'abomination' 
  | 'blood_demon' 
  | 'boss_malakor';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Direction;
  hp: number;
  maxHp: number;
  level: number;
  attack: number;
  defense: number;
  speed: number;
  radius: number;
  attackRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  hitFlashTimer: number;
  isStunned: boolean;
  stunTimer: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'windup';
  patrolTarget: { x: number; y: number } | null;
  targetPlayerIndex: number;
  animFrame: number;
  animTimer: number;
  isBoss?: boolean;
  name: string;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  gold: number;
  killCount: number;
  potions: number;
}

export interface Player {
  id: number;
  name: string;
  colorScheme: 'crimson' | 'ashen';
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Direction;
  isMoving: boolean;
  isAttacking: boolean;
  attackTimer: number;
  isSpinCharging: boolean;
  spinChargeTime: number;
  isSpinAttacking: boolean;
  spinTimer: number;
  isShielding: boolean;
  isDashing: boolean;
  dashTimer: number;
  iFrames: number;
  hitFlashTimer: number;
  isDead: boolean;
  reviveTimer: number;
  equipment: {
    weapon: EquipmentItem;
    shield: EquipmentItem;
    armor: EquipmentItem;
    helmet: EquipmentItem;
    boots: EquipmentItem;
  };
  inventory: EquipmentItem[];
  stats: PlayerStats;
  animFrame: number;
  animTimer: number;
  footprintTimer: number;
  hasBloodyFeet: number; // Duration of bloody footprints
}

export interface SeveredLimb {
  x: number;
  y: number;
  z: number; // Elevation
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  vRot: number;
  type: 'head' | 'arm' | 'weapon' | 'ribs' | 'leg' | 'slime_chunk';
  color: string;
  enemyType: EnemyType;
  lifetime: number;
  maxLifetime: number;
  bounces: number;
}

export interface BloodParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
}

export interface BloodDecal {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  lifetime: number;
  maxLifetime: number;
  vy: number;
  fontSize: number;
}

export interface TileMap {
  width: number;
  height: number;
  tileSize: number;
  // 0 = void, 1 = floor, 2 = wall_top, 3 = wall_front, 4 = column, 5 = door, 6 = stairs_down, 7 = blood_altar, 8 = chest
  tiles: number[][];
  torchPositions: { x: number; y: number }[];
  stairsPos: { x: number; y: number };
}

export interface DungeonRoom {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'start' | 'combat' | 'treasure' | 'altar' | 'boss';
}

export interface DungeonLevel {
  depth: number;
  name: string;
  theme: 'catacombs' | 'warrens' | 'sanctum';
  map: TileMap;
  rooms: DungeonRoom[];
  spawnPoint: { x: number; y: number };
}

export interface VirtualControlsState {
  joystickVector: { x: number; y: number };
  attackHeld: boolean;
  attackJustPressed: boolean;
  shieldHeld: boolean;
  spinHeld: boolean;
  dashJustPressed: boolean;
  potionJustPressed: boolean;
}
