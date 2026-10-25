/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Direction, DungeonLevel, Enemy, EquipmentItem, Player, Quest } from './types';
import { generateDungeonLevel, isTileSolid, TILE_SIZE } from './dungeon';
import { createStarterEquipment, generateLootItem } from './loot';
import { inputManager } from './input';
import { getTileNormal, textureAtlas } from './textures';
import { bloodSystem } from './blood';
import { combatManager } from './combat';
import { soundEngine } from './audio';
import { generateDynamicQuests } from './quests';

export class GameEngine {
  public canvas: HTMLCanvasElement | null = null;
  public ctx: CanvasRenderingContext2D | null = null;

  // Game state
  public isRunning: boolean = false;
  public currentFloor: number = 1;
  public dungeon: DungeonLevel | null = null;
  public players: Player[] = [];
  public enemies: Enemy[] = [];
  public chests: { x: number; y: number; opened: boolean }[] = [];
  public altars: { x: number; y: number; purified: boolean }[] = [];
  public quests: Quest[] = [];

  // Camera
  public camera = { x: 0, y: 0, targetX: 0, targetY: 0, zoom: 1.0, shake: 0 };

  // Ambient Lighting State (Moody Diablo / Balanced Zelda / Bright)
  public ambientPreset: 'moody' | 'balanced' | 'bright' = 'moody';
  public ambientDarkness: number = 0.68;
  private lightCanvas: HTMLCanvasElement | null = null;
  private lightCtx: CanvasRenderingContext2D | null = null;
  // Floor Transition State
  public isTransitioningFloor: boolean = false;
  public transitionPhase: 'fade_out' | 'loading' | 'fade_in' | 'none' = 'none';
  public transitionTimer: number = 0;
  public transitionDuration: number = 0.45;
  public targetFloor: number = 1;

  public cycleAmbientLight(): 'moody' | 'balanced' | 'bright' {
    if (this.ambientPreset === 'moody') {
      this.ambientPreset = 'balanced';
      this.ambientDarkness = 0.48;
    } else if (this.ambientPreset === 'balanced') {
      this.ambientPreset = 'bright';
      this.ambientDarkness = 0.22;
    } else {
      this.ambientPreset = 'moody';
      this.ambientDarkness = 0.68;
    }
    return this.ambientPreset;
  }

  // Timing
  private lastTime: number = 0;
  private animFrameId: number = 0;

  // Callback for React HUD updates
  public onStateUpdate: (() => void) | null = null;
  public onGameOver: (() => void) | null = null;
  public onLevelComplete: ((floor: number) => void) | null = null;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
    textureAtlas.init();
    inputManager.init();
    soundEngine.init();
  }

  // Start new single-player game session
  public start() {
    this.currentFloor = 1;
    this.players = [this.createPlayer(0, 'Sir Kaelen', 'crimson')];
    this.quests = generateDynamicQuests(1, 3);
    this.loadFloor(1);

    this.isRunning = true;
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  private createPlayer(index: number, name: string, colorScheme: 'crimson' | 'ashen'): Player {
    return {
      id: index,
      name,
      colorScheme,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 'down',
      isMoving: false,
      isAttacking: false,
      attackTimer: 0,
      isSpinCharging: false,
      spinChargeTime: 0,
      isSpinAttacking: false,
      spinTimer: 0,
      isShielding: false,
      isDashing: false,
      dashTimer: 0,
      iFrames: 0,
      hitFlashTimer: 0,
      isDead: false,
      reviveTimer: 0,
      equipment: createStarterEquipment(index),
      inventory: [],
      stats: {
        hp: 100,
        maxHp: 100,
        stamina: 100,
        maxStamina: 100,
        level: 1,
        xp: 0,
        nextLevelXp: 150,
        gold: 50,
        killCount: 0,
        potions: 3,
      },
      animFrame: 0,
      animTimer: 0,
      footprintTimer: 0,
      hasBloodyFeet: 0,
    };
  }

  public loadFloor(floor: number) {
    this.currentFloor = floor;
    const { level, enemies, chests, altars } = generateDungeonLevel(floor);
    this.dungeon = level;
    this.enemies = enemies;
    this.chests = chests;
    this.altars = altars;

    // Remove all previous floor blood decals, limbs, and flesh chunks
    bloodSystem.clearAll();

    // Reposition players at spawn point
    this.players.forEach((p, idx) => {
      p.x = level.spawnPoint.x + (idx === 1 ? 24 : 0);
      p.y = level.spawnPoint.y;
      p.vx = 0;
      p.vy = 0;
      p.isDead = false;
      p.hasBloodyFeet = 0;
      p.stats.hp = p.stats.maxHp;
    });

    // Reset camera instantly to spawn
    this.camera.x = level.spawnPoint.x;
    this.camera.y = level.spawnPoint.y;
    this.camera.targetX = this.camera.x;
    this.camera.targetY = this.camera.y;

    combatManager.groundItems = [];
    combatManager.floatingTexts = [];

    soundEngine.playLevelUp();
    if (this.onLevelComplete) {
      this.onLevelComplete(floor);
    }
  }

  public startFloorTransition(newFloor: number) {
    if (this.isTransitioningFloor) return;
    this.isTransitioningFloor = true;
    this.transitionPhase = 'fade_out';
    this.transitionTimer = 0;
    this.targetFloor = newFloor;
    soundEngine.playStairsDescent();
  }

  // 60FPS Game Loop
  private loop(currentTime: number) {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamp frame delta to prevent physics tunnels
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    inputManager.endFrame();
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  // Simulation Update
  private update(dt: number) {
    if (!this.dungeon) return;

    // Update Floor Transition State & Input Freeze
    if (this.isTransitioningFloor) {
      this.transitionTimer += dt;
      // Freeze player inputs and movement during transition
      for (const p of this.players) {
        p.vx = 0;
        p.vy = 0;
        p.isMoving = false;
        p.isAttacking = false;
        p.isSpinAttacking = false;
      }

      if (this.transitionPhase === 'fade_out' && this.transitionTimer >= this.transitionDuration) {
        this.transitionPhase = 'fade_in';
        this.transitionTimer = 0;
        this.loadFloor(this.targetFloor);
      } else if (this.transitionPhase === 'fade_in' && this.transitionTimer >= this.transitionDuration) {
        this.isTransitioningFloor = false;
        this.transitionPhase = 'none';
      }
    }

    // 1. Update Players
    this.players.forEach((player) => {
      this.updatePlayer(player, dt);
    });

    // 2. Game Over condition
    const p1 = this.players[0];
    if (p1 && p1.isDead && this.isRunning) {
      if (this.onGameOver) this.onGameOver();
    }

    // 4. Update Enemies
    this.updateEnemies(dt);

    // 5. Update Gore & Blood Systems
    bloodSystem.update(dt);
    combatManager.updateTexts(dt);
    combatManager.updateGroundItems(dt, this.players, (item, player) => {
      // Add item to player inventory
      if (player.inventory.length < 24) {
        player.inventory.push(item);
      }
    });

    // 6. Check Stairs & Chests Proximity
    this.checkInteractions();

    // 7. Update Camera with Screen Shake
    this.updateCamera(dt);

    // Sync HUD state periodically
    if (this.onStateUpdate) {
      this.onStateUpdate();
    }
  }

  private updatePlayer(player: Player, dt: number) {
    if (player.isDead) return;

    const input = inputManager.getPlayerInput(player.id);

    // Hit Flash & Invulnerability
    if (player.hitFlashTimer > 0) player.hitFlashTimer -= dt;
    if (player.iFrames > 0) player.iFrames -= dt;

    // Footprints
    if (player.hasBloodyFeet > 0) {
      player.hasBloodyFeet -= dt;
      player.footprintTimer += dt;
      if (player.isMoving && player.footprintTimer > 0.25) {
        player.footprintTimer = 0;
        bloodSystem.addFootprint(player.x, player.y + 8);
      }
    }

    // Dash Action (E or Mobile Dash Button)
    if (input.dashJustPressed && !player.isDashing && player.stats.stamina >= 25) {
      player.isDashing = true;
      player.dashTimer = 0.22;
      player.iFrames = 0.25;
      player.stats.stamina -= 25;
      soundEngine.playDash();

      const vec = facingToVector(player.facing);
      player.vx = vec.x * 9;
      player.vy = vec.y * 9;
    }

    if (player.isDashing) {
      player.dashTimer -= dt;
      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    } else {
      // Stamina regeneration
      player.stats.stamina = Math.min(player.stats.maxStamina, player.stats.stamina + 20 * dt);
    }

    // Potion Use
    if (input.potionJustPressed && player.stats.potions > 0 && player.stats.hp < player.stats.maxHp) {
      player.stats.potions--;
      const heal = Math.round(player.stats.maxHp * 0.6);
      player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
      soundEngine.playPotion();
      combatManager.addFloatingText(player.x, player.y - 18, `+${heal} HP`, '#22c55e', 14);
    }

    // Shield Hold (Shift / Key K / Mobile Shield)
    player.isShielding = input.shieldHeld && !player.isAttacking && !player.isSpinAttacking && !player.isDashing;

    // Spin Attack Charge (Holding Attack or Dedicated Spin Key)
    if (input.spinHeld || (input.attackHeld && !player.isAttacking && !player.isSpinAttacking)) {
      player.isSpinCharging = true;
      player.spinChargeTime += dt;
      soundEngine.playSpinCharge(Math.min(1.0, player.spinChargeTime / 1.0));

      if (player.spinChargeTime >= 1.0) {
        // Fully charged sword glow effect
        combatManager.addFloatingText(player.x, player.y - 20, 'CHARGED!', '#f59e0b', 11);
      }
    } else {
      // Released sword charge
      if (player.isSpinCharging) {
        if (player.spinChargeTime >= 1.0) {
          // Release Zelda 3 360-degree Whirlwind Spin Attack!
          player.isSpinAttacking = true;
          player.spinTimer = 0.38;
          soundEngine.playSpinAttack();
          combatManager.handlePlayerAttack(player, this.enemies, true, (s) => (this.camera.shake = s), (e, p) => this.onEnemyKilled(e, p));
        }
        player.isSpinCharging = false;
        player.spinChargeTime = 0;
      }
    }

    if (player.isSpinAttacking) {
      player.spinTimer -= dt;
      if (player.spinTimer <= 0) {
        player.isSpinAttacking = false;
      }
    }

    // Standard Sword Attack (Zelda 3 Slash Arc)
    if (input.attackJustPressed && !player.isAttacking && !player.isSpinAttacking && !player.isShielding) {
      player.isAttacking = true;
      player.attackTimer = 0.18;
      soundEngine.playSwordSwing();

      combatManager.handlePlayerAttack(player, this.enemies, false, (s) => (this.camera.shake = s), (e, p) => this.onEnemyKilled(e, p));
    }

    if (player.isAttacking) {
      player.attackTimer -= dt;
      if (player.attackTimer <= 0) {
        player.isAttacking = false;
      }
    }

    // Movement (WASD / Joystick / Gamepad)
    if (!player.isDashing) {
      const moveSpeed = (player.isShielding ? 1.4 : player.isAttacking ? 0.8 : 2.5) + (player.equipment.boots.speedBonus || 0);

      if (Math.abs(input.moveX) > 0.05 || Math.abs(input.moveY) > 0.05) {
        player.vx = input.moveX * moveSpeed;
        player.vy = input.moveY * moveSpeed;
        player.isMoving = true;

        // Facing direction
        if (Math.abs(input.moveX) > Math.abs(input.moveY)) {
          player.facing = input.moveX > 0 ? 'right' : 'left';
        } else {
          player.facing = input.moveY > 0 ? 'down' : 'up';
        }

        // Walk cycle animation
        player.animTimer += dt * 8;
        player.animFrame = Math.floor(player.animTimer) % 4;
      } else {
        player.vx *= 0.7;
        player.vy *= 0.7;
        player.isMoving = false;
        player.animFrame = 0;
      }
    }

    // Collision with Dungeon Walls & Columns
    this.moveAndCollide(player, dt);

    // Check Spike Trap hazard on current player tile
    if (this.dungeon) {
      const tileX = Math.floor(player.x / TILE_SIZE);
      const tileY = Math.floor(player.y / TILE_SIZE);
      if (
        tileX >= 0 &&
        tileX < this.dungeon.map.width &&
        tileY >= 0 &&
        tileY < this.dungeon.map.height &&
        this.dungeon.map.tiles[tileY][tileX] === 10
      ) {
        if (!player.iFrames || player.iFrames <= 0) {
          player.stats.hp = Math.max(0, player.stats.hp - 8);
          player.iFrames = 0.8;
          soundEngine.playPlayerHit();
          combatManager.addFloatingText(player.x, player.y - 16, '-8 SPIKE!', '#ef4444', 12);
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;
      if (enemy.stunTimer > 0) {
        enemy.stunTimer -= dt;
        if (enemy.stunTimer <= 0) enemy.isStunned = false;
      }
      if (enemy.attackVisualTimer && enemy.attackVisualTimer > 0) {
        enemy.attackVisualTimer -= dt;
      }

      // Find closest living player
      let targetPlayer: Player | null = null;
      let minDist = Infinity;
      for (const p of this.players) {
        if (p.isDead) continue;
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < minDist) {
          minDist = d;
          targetPlayer = p;
        }
      }

      if (targetPlayer && !enemy.isStunned) {
        const dist = Math.hypot(targetPlayer.x - enemy.x, targetPlayer.y - enemy.y);

        // Damaged enemies slow down noticeably in proportion to lost HP!
        const healthPct = Math.max(0.05, Math.min(1.0, enemy.hp / Math.max(1, enemy.maxHp)));
        // Full health: 1.0x speed. At 25% health: ~0.35x speed (crippled limp / slow crawl)
        const speedMultiplier = 0.18 + 0.82 * Math.pow(healthPct, 1.35);
        const currentSpeed = enemy.speed * speedMultiplier;

        if (dist < 180) {
          const angle = Math.atan2(targetPlayer.y - enemy.y, targetPlayer.x - enemy.x);

          // Facing direction
          if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
            enemy.facing = Math.cos(angle) > 0 ? 'right' : 'left';
          } else {
            enemy.facing = Math.sin(angle) > 0 ? 'down' : 'up';
          }

          // STRIKE DISTANCE: Enemies approach to attack range, but maintain physical distance
          const desiredStrikeDist = Math.max(16, enemy.attackRange * 0.75);

          if (dist > desiredStrikeDist + 4) {
            // Approach towards strike radius point relative to player
            const targetX = targetPlayer.x - Math.cos(angle) * desiredStrikeDist;
            const targetY = targetPlayer.y - Math.sin(angle) * desiredStrikeDist;
            const moveAngle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
            enemy.vx += (Math.cos(moveAngle) * currentSpeed - enemy.vx) * 0.18;
            enemy.vy += (Math.sin(moveAngle) * currentSpeed - enemy.vy) * 0.18;
          } else {
            // Within strike range: hold position and don't stack on top of player
            enemy.vx *= 0.6;
            enemy.vy *= 0.6;
          }

          // HARD RADIUS PUSH-BACK: Prevent enemies from reaching zero distance / stacking on top of player
          const minSeparation = (enemy.radius || 10) + 12; // Player radius ~ 10
          if (dist < minSeparation && dist > 0.001) {
            const overlap = minSeparation - dist;
            enemy.x -= Math.cos(angle) * overlap * 0.45;
            enemy.y -= Math.sin(angle) * overlap * 0.45;
          }

          // Wounded enemies have slightly slower attack recovery due to physical trauma
          const effectiveCooldown = enemy.attackCooldown * (1.0 + (1 - healthPct) * 0.6);

          // Attack when within range
          enemy.lastAttackTime += dt;
          if (dist <= enemy.attackRange + 4 && enemy.lastAttackTime >= effectiveCooldown) {
            enemy.lastAttackTime = 0;
            combatManager.handleEnemyAttack(enemy, targetPlayer, (s) => (this.camera.shake = s));
          }

          // Bleeding drops while moving wounded
          if (healthPct < 0.6 && Math.random() < (1 - healthPct) * 0.05) {
            bloodSystem.addDecal(enemy.x + (Math.random() - 0.5) * 6, enemy.y + 6, 2, enemy.type === 'slime' ? '#1b4332' : '#4a0505');
          }
        } else {
          // Wander / Idle
          enemy.vx *= 0.8;
          enemy.vy *= 0.8;
        }

        // Walk cycle & wobble animation slows down directly with damage!
        enemy.animTimer += dt * (1.8 + 3.2 * speedMultiplier);
        enemy.animFrame = Math.floor(enemy.animTimer) % 2;
      }

      this.moveAndCollide(enemy, dt);
    }
  }

  // Smooth Wall Sliding & Collision with 4-Corner Bounding Box
  private moveAndCollide(entity: { x: number; y: number; vx: number; vy: number; radius?: number }, dt: number) {
    if (!this.dungeon) return;
    const r = (entity.radius || 8) * 0.75; // Tight collision radius for smooth sliding

    // 1. Move X
    if (Math.abs(entity.vx) > 0.001) {
      const newX = entity.x + entity.vx * dt * 45;
      const testX = entity.vx > 0 ? newX + r : newX - r;
      const tX = Math.floor(testX / TILE_SIZE);
      const tYTop = Math.floor((entity.y - r) / TILE_SIZE);
      const tYBottom = Math.floor((entity.y + r) / TILE_SIZE);

      const canMoveX =
        tX >= 0 &&
        tX < this.dungeon.map.width &&
        tYTop >= 0 &&
        tYBottom < this.dungeon.map.height &&
        !isTileSolid(this.dungeon.map.tiles[tYTop][tX]) &&
        !isTileSolid(this.dungeon.map.tiles[tYBottom][tX]);

      if (canMoveX) {
        entity.x = newX;
      } else {
        entity.vx = 0;
      }
    }

    // 2. Move Y
    if (Math.abs(entity.vy) > 0.001) {
      const newY = entity.y + entity.vy * dt * 45;
      const testY = entity.vy > 0 ? newY + r : newY - r;
      const tY = Math.floor(testY / TILE_SIZE);
      const tXLeft = Math.floor((entity.x - r) / TILE_SIZE);
      const tXRight = Math.floor((entity.x + r) / TILE_SIZE);

      const canMoveY =
        tY >= 0 &&
        tY < this.dungeon.map.height &&
        tXLeft >= 0 &&
        tXRight < this.dungeon.map.width &&
        !isTileSolid(this.dungeon.map.tiles[tY][tXLeft]) &&
        !isTileSolid(this.dungeon.map.tiles[tY][tXRight]);

      if (canMoveY) {
        entity.y = newY;
      } else {
        entity.vy = 0;
      }
    }
  }

  private onEnemyKilled(enemy: Enemy, player: Player) {
    player.stats.killCount++;
    player.stats.xp += 30 + enemy.level * 15;

    // Check Level Up
    if (player.stats.xp >= player.stats.nextLevelXp) {
      player.stats.level++;
      player.stats.xp -= player.stats.nextLevelXp;
      player.stats.nextLevelXp = Math.round(player.stats.nextLevelXp * 1.5);
      player.stats.maxHp += 20;
      player.stats.hp = player.stats.maxHp;
      soundEngine.playLevelUp();
      combatManager.addFloatingText(player.x, player.y - 28, 'LEVEL UP!', '#f59e0b', 16);
    }

    // Update Quests
    for (const q of this.quests) {
      if (!q.completed && q.type === 'kill' && q.targetEnemyType === enemy.type) {
        q.currentCount++;
        if (q.currentCount >= q.targetCount) {
          q.completed = true;
          soundEngine.playLevelUp();
          combatManager.addFloatingText(player.x, player.y - 36, `QUEST COMPLETE: ${q.title}`, '#4ade80', 14);
        }
      }
      if (!q.completed && q.type === 'boss' && enemy.isBoss) {
        q.currentCount = 1;
        q.completed = true;
        soundEngine.playLevelUp();
        combatManager.addFloatingText(player.x, player.y - 36, 'BOSS DEFEATED!', '#f59e0b', 18);
      }
    }
  }

  private checkInteractions() {
    if (!this.dungeon) return;
    const stairs = this.dungeon.map.stairsPos;
    const stairsWorld = {
      x: stairs.x * TILE_SIZE + TILE_SIZE / 2,
      y: stairs.y * TILE_SIZE + TILE_SIZE / 2,
    };

    // Any player stepping on stairs descends to next floor with scene transition!
    for (const p of this.players) {
      if (p.isDead) continue;
      if (Math.hypot(p.x - stairsWorld.x, p.y - stairsWorld.y) < 18) {
        if (!this.isTransitioningFloor) {
          this.startFloorTransition(this.currentFloor + 1);
        }
        return;
      }

      // Check chests
      for (const chest of this.chests) {
        if (!chest.opened && Math.hypot(p.x - chest.x, p.y - chest.y) < 24) {
          chest.opened = true;
          // Spawn treasure!
          const loot = generateLootItem(p.stats.level, 'rare');
          combatManager.groundItems.push({
            id: `chest_loot_${Date.now()}`,
            x: chest.x,
            y: chest.y + 12,
            item: loot,
            bobTime: 0,
          });
          p.stats.gold += 50 + p.stats.level * 20;
          soundEngine.playLootDrop(loot.rarity);
          combatManager.addFloatingText(chest.x, chest.y - 16, 'CHEST OPENED', '#facc15', 12);
        }
      }

      // Check altars
      for (const altar of this.altars) {
        if (!altar.purified && Math.hypot(p.x - altar.x, p.y - altar.y) < 24) {
          altar.purified = true;
          // Repair all damaged equipment for this player!
          Object.values(p.equipment).forEach((eq) => {
            eq.durability = eq.maxDurability;
          });
          p.stats.hp = p.stats.maxHp;
          soundEngine.playPotion();
          combatManager.addFloatingText(altar.x, altar.y - 18, 'ALL GEAR REPAIRED & SANCTIFIED!', '#38bdf8', 13);

          // Update altar quest
          for (const q of this.quests) {
            if (!q.completed && q.type === 'altars') {
              q.currentCount++;
              if (q.currentCount >= q.targetCount) {
                q.completed = true;
                soundEngine.playLevelUp();
              }
            }
          }
        }
      }
    }
  }

  // Camera tracking: Smoothly follows the single player hero
  private updateCamera(dt: number) {
    if (this.players.length === 0) return;
    const p = this.players[0];
    this.camera.targetX = p.x;
    this.camera.targetY = p.y;

    // Smooth camera lerp
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

    // Decaying screen shake
    if (this.camera.shake > 0) {
      this.camera.shake = Math.max(0, this.camera.shake - dt * 15);
    }
  }

  public getViewportSize(): { w: number; h: number; dpr: number } {
    if (!this.canvas) return { w: 800, h: 600, dpr: 1 };
    
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    
    const w = rect.width > 0 ? rect.width : (this.canvas.clientWidth || window.innerWidth || 800);
    const h = rect.height > 0 ? rect.height : (this.canvas.clientHeight || window.innerHeight || 600);
    
    return { w, h, dpr };
  }

  // Render Pipeline: 2.5D Zelda 3 Depth Sorting, Dynamic Darkness & Torchlight
  public render() {
    if (!this.canvas || !this.ctx || !this.dungeon) return;
    const ctx = this.ctx;
    const { w, h, dpr } = this.getViewportSize();

    // Ensure backing store resolution matches target DPR
    const targetCanvasWidth = Math.floor(w * dpr);
    const targetCanvasHeight = Math.floor(h * dpr);
    if (this.canvas.width !== targetCanvasWidth || this.canvas.height !== targetCanvasHeight) {
      this.canvas.width = targetCanvasWidth;
      this.canvas.height = targetCanvasHeight;
    }

    // Set DPR scale on canvas context every frame
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Screen shake offset
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;

    // Gather active dynamic light sources for this frame (entity & tile normal mapping)
    const lights = this.getFrameLights(w, h);

    ctx.save();
    ctx.fillStyle = '#050405';
    ctx.fillRect(0, 0, w, h);

    // Dynamic camera center calculation:
    // Keeps player exactly in the middle of the screen across all device resolutions & aspect ratios.
    const centerX = w / 2;
    const centerY = h / 2;
    const cx = Math.round(centerX - this.camera.x + shakeX);
    const cy = Math.round(centerY - this.camera.y + shakeY);
    ctx.translate(cx, cy);

    // 1. Draw Tilemap (Floor & Base Walls)
    this.renderTiles(ctx, lights);

    // 2. Draw Persistent Blood Decals, Footprints, Grounded Limbs & Chunks directly on floor
    bloodSystem.renderDecalsAndGroundedGore(ctx);

    // 3. Draw Flying Blood Droplets & Flying Limbs on floor layer BEFORE entity renderList so blood is NEVER drawn on top of player
    bloodSystem.renderFlyingGore(ctx);

    // 4. Draw Ground Loot Items with hovering beacon
    this.renderGroundItems(ctx);

    // 5. 2.5D DEPTH SORTING: Sort all dynamic entities (chests, enemies, player) by Y coordinate!
    const renderList: { y: number; draw: () => void }[] = [];

    // Chests
    this.chests.forEach((chest) => {
      renderList.push({
        y: chest.y,
        draw: () => {
          const img = textureAtlas.get(chest.opened ? 'chest_open' : 'chest_closed');
          if (img) ctx.drawImage(img, chest.x - 12, chest.y - 10);
        },
      });
    });

    // Enemies with Dynamic Normal-Mapped Lighting & Melee Strike Visuals
    this.enemies.forEach((enemy) => {
      renderList.push({
        y: enemy.y,
        draw: () => {
          textureAtlas.renderEnemyWithLighting(ctx, enemy, lights);

          // Draw Enemy Melee Strike Visuals (Claw / Slash Arc)
          if (enemy.attackVisualTimer && enemy.attackVisualTimer > 0 && enemy.attackVisualAngle !== undefined) {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(enemy.attackVisualAngle);

            const progress = enemy.attackVisualTimer / 0.22;
            ctx.globalAlpha = Math.min(1.0, progress * 1.5);

            // Crimson / Green / Slate claw slash arc
            ctx.strokeStyle = enemy.type === 'slime' ? '#4ade80' : enemy.type === 'skeleton' ? '#cbd5e1' : '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(18, enemy.attackRange * 0.85), -0.6, 0.6);
            ctx.stroke();

            // Inner white claw streak marks
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(14, enemy.attackRange * 0.7), -0.4, 0.4);
            ctx.stroke();

            ctx.restore();
          }
        },
      });
    });

    // Players
    this.players.forEach((player) => {
      if (player.isDead) {
        // Render as fallen corpse on floor
        renderList.push({
          y: player.y - 5,
          draw: () => {
            ctx.save();
            ctx.translate(player.x, player.y);
            const shadowGrad = ctx.createRadialGradient(0, 4, 0, 0, 4, 12);
            shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
            shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
            shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.ellipse(0, 4, 12, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.rotate(Math.PI / 2);
            textureAtlas.renderPlayer(
              ctx,
              0,
              0,
              'down',
              0,
              player.colorScheme,
              player.equipment,
              false,
              false,
              0,
              false,
              0,
              false
            );
            ctx.restore();
          },
        });
      } else {
        renderList.push({
          y: player.y,
          draw: () => {
            const attackProgress = player.isAttacking ? (0.18 - player.attackTimer) / 0.18 : 0;
            const spinAngle = player.isSpinAttacking ? ((0.38 - player.spinTimer) / 0.38) * Math.PI * 4 : 0;
            textureAtlas.renderPlayer(
              ctx,
              player.x,
              player.y,
              player.facing,
              player.animFrame,
              player.colorScheme,
              player.equipment,
              player.isShielding,
              player.isAttacking,
              attackProgress,
              player.isSpinAttacking,
              spinAngle,
              player.isDashing
            );
            this.renderEnemyLighting(ctx, player, lights);
          },
        });
      }
    });

    // Sort ascending by Y (2.5D Zelda depth sorting)
    renderList.sort((a, b) => a.y - b.y);
    renderList.forEach((item) => item.draw());

    // 6. Draw 2.5D Dynamic Torch Lighting & Atmospheric Dungeon Darkness
    this.renderLighting(ctx, w, h);

    // 7. Draw Floating Combat Damage Numbers
    this.renderFloatingTexts(ctx);

    ctx.restore();

    // 8. Screen Fade & Atmospheric Banner for Level Descent Transition
    if (this.isTransitioningFloor) {
      let alpha = 0;
      if (this.transitionPhase === 'fade_out') {
        alpha = Math.min(1, this.transitionTimer / this.transitionDuration);
      } else if (this.transitionPhase === 'fade_in') {
        alpha = Math.max(0, 1 - this.transitionTimer / this.transitionDuration);
      }

      ctx.save();
      // Render in screen space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Black fade overlay
      ctx.fillStyle = `rgba(3, 2, 4, ${alpha.toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);

      // Atmospheric Floor Announcement Banner
      if (alpha > 0.15) {
        ctx.globalAlpha = Math.min(1, alpha * 1.4);

        const midY = h / 2;
        const bannerW = Math.min(w - 32, 380);
        const bannerH = 92;
        const bannerX = (w - bannerW) / 2;
        const bannerY = midY - bannerH / 2;

        // Dark gothic plaque
        ctx.fillStyle = 'rgba(10, 8, 14, 0.94)';
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeStyle = '#78350f'; // Dark amber gold border
        ctx.lineWidth = 2;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        // Inner gold filigree line
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.strokeRect(bannerX + 3, bannerY + 3, bannerW - 6, bannerH - 6);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Subtitle
        ctx.fillStyle = '#dc2626'; // Blood crimson
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillText('DESCENDING INTO THE DEPTHS...', w / 2, bannerY + 22);

        // Floor Name
        ctx.fillStyle = '#fef08a'; // Pale gold
        ctx.font = 'bold 20px "Courier New", monospace';
        const floorName = this.dungeon ? this.dungeon.name : `FLOOR ${this.targetFloor}`;
        ctx.fillText(floorName.toUpperCase(), w / 2, bannerY + 48);

        // Depth & Instruction
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText(`DUNGEON DEPTH ${this.targetFloor} · PREPARE YOUR BLADE`, w / 2, bannerY + 70);
      }

      ctx.restore();
    }
  }

  private getFrameLights(w: number, h: number) {
    const lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[] = [];
    for (const p of this.players) {
      if (p.isDead) continue;
      lights.push({
        x: p.x,
        y: p.y,
        z: 24,
        radius: 160,
        intensity: 1.15,
        r: 254,
        g: 220,
        b: 180,
      });
    }

    if (this.dungeon) {
      const time = performance.now() / 1000;
      for (let i = 0; i < this.dungeon.map.torchPositions.length; i++) {
        const torch = this.dungeon.map.torchPositions[i];
        if (Math.abs(torch.x - this.camera.x) > w / 2 + 100 || Math.abs(torch.y - this.camera.y) > h / 2 + 100) continue;

        // Per-torch independent flame phase timing & light position jitter
        const torchSeed = torch.x * 12.9898 + torch.y * 78.233;
        const phase1 = Math.sin(time * 7.2 + torchSeed);
        const phase2 = Math.cos(time * 11.4 + torchSeed * 1.3);
        const torchRadius = 92 + phase1 * 7 + phase2 * 4;

        // Flame light origin jumps/jitters slightly within torch
        const jitterX = Math.sin(time * 13.8 + torchSeed) * 2.0;
        const jitterY = Math.cos(time * 16.2 + torchSeed) * 2.0;

        lights.push({
          x: torch.x + jitterX,
          y: torch.y - 4 + jitterY,
          z: 26,
          radius: torchRadius,
          intensity: 1.25 + phase1 * 0.12,
          r: 251,
          g: 146,
          b: 60,
        });
      }
    }

    return lights;
  }

  // Render Tiles with 2.5D Dynamic Normal Lighting (Floor vs Wall distinct light reactions)
  private renderTiles(
    ctx: CanvasRenderingContext2D,
    lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[]
  ) {
    if (!this.dungeon || !this.canvas) return;
    const { tiles, width, height } = this.dungeon.map;
    const { w, h } = this.getViewportSize();

    // Viewport Culling Bounds
    const minTileX = Math.max(0, Math.floor((this.camera.x - w / 2 - 32) / TILE_SIZE));
    const maxTileX = Math.min(width - 1, Math.ceil((this.camera.x + w / 2 + 32) / TILE_SIZE));
    const minTileY = Math.max(0, Math.floor((this.camera.y - h / 2 - 32) / TILE_SIZE));
    const maxTileY = Math.min(height - 1, Math.ceil((this.camera.y + h / 2 + 32) / TILE_SIZE));

    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const t = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        const varIdx = Math.abs(x * 37 + y * 19) % 8;
        const floorImg = textureAtlas.get(`tile_floor_${varIdx}`);
        const ritualImg = textureAtlas.get(`tile_ritual_floor_${varIdx}`);
        const wallTopImg = textureAtlas.get(`tile_wall_top_${varIdx}`);
        const wallFrontImg = textureAtlas.get(`tile_wall_front_${varIdx}`);
        const pillarImg = textureAtlas.get(`tile_pillar_${varIdx}`);
        const stairsImg = textureAtlas.get(`tile_stairs_${varIdx}`);
        const pitImg = textureAtlas.get('tile_pit');
        const spikeImg = textureAtlas.get('tile_spike_trap');

        // 1. Draw base 16-bit diffuse texture
        if (t === 1 && floorImg) {
          ctx.drawImage(floorImg, px, py);
        } else if (t === 7 && ritualImg) {
          ctx.drawImage(ritualImg, px, py);
        } else if (t === 2 && wallTopImg) {
          ctx.drawImage(wallTopImg, px, py);
        } else if (t === 3 && wallFrontImg) {
          ctx.drawImage(wallFrontImg, px, py);
        } else if (t === 4 && pillarImg) {
          ctx.drawImage(pillarImg, px, py);
        } else if (t === 6 && stairsImg) {
          ctx.drawImage(stairsImg, px, py);
        } else if (t === 9 && pitImg) {
          ctx.drawImage(pitImg, px, py);
        } else if (t === 10 && spikeImg) {
          ctx.drawImage(spikeImg, px, py);
        }

        // 2. Dynamic Lighting via Per-Block Normal Map Sampling (N · L)
        const normalKey = t === 3 ? 'tile_wall_front_normal' : t === 2 ? 'tile_wall_top_normal' : t === 4 ? 'tile_pillar_normal' : t === 6 ? 'tile_stairs_normal' : 'tile_floor_normal';
        const blockSize = 4;
        const normObj = { nx: 0, ny: 0, nz: 1 };
        const tcz = getTileNormal(t).zHeight;

        for (let by = 0; by < 32; by += blockSize) {
          for (let bx = 0; bx < 32; bx += blockSize) {
            const localX = bx + blockSize / 2;
            const localY = by + blockSize / 2;
            textureAtlas.getNormalAt(normalKey, localX, localY, normObj);

            const subTcx = px + localX;
            const subTcy = py + localY;

            let directR = 0;
            let directG = 0;
            let directB = 0;
            let totalDirect = 0;
            let maxEdgeGlint = 0;
            let edgeGlintSide: 'left' | 'right' | null = null;
            let inDeepOcclusion = false;

            for (const light of lights) {
              const dx = light.x - subTcx;
              const dy = light.y - subTcy;
              const dz = light.z - tcz;
              const distSq = dx * dx + dy * dy + dz * dz;
              const radSq = light.radius * light.radius;

              if (distSq < radSq) {
                const dist = Math.sqrt(distSq);
                const lx = dx / dist;
                const ly = dy / dist;
                const lz = dz / dist;

                // Lambertian normal response: N · L
                const ndotl = normObj.nx * lx + normObj.ny * ly + normObj.nz * lz;
                // Soft quadratic attenuation decay
                const distRatio = Math.min(1.0, dist / light.radius);
                const atten = (1.0 - distRatio) * (1.0 - distRatio);

                if (ndotl > 0) {
                  const irradiance = ndotl * atten * light.intensity;
                  totalDirect += irradiance;
                  directR += light.r * irradiance;
                  directG += light.g * irradiance;
                  directB += light.b * irradiance;

                  if (t === 3 && bx === 0 && lx > 0.25) {
                    maxEdgeGlint = Math.max(maxEdgeGlint, irradiance);
                    edgeGlintSide = 'right';
                  } else if (t === 3 && bx === 28 && lx < -0.25) {
                    maxEdgeGlint = Math.max(maxEdgeGlint, irradiance);
                    edgeGlintSide = 'left';
                  }
                } else if (t === 3 && dy < -8) {
                  inDeepOcclusion = true;
                }
              }
            }

            if (totalDirect > 0.04) {
              const alpha = Math.min(0.55, totalDirect * 0.45);
              const r = Math.min(255, Math.round(directR / totalDirect));
              const g = Math.min(255, Math.round(directG / totalDirect));
              const b = Math.min(255, Math.round(directB / totalDirect));
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
              ctx.fillRect(px + bx, py + by, blockSize, blockSize);

              if (maxEdgeGlint > 0.15 && edgeGlintSide) {
                const glintAlpha = Math.min(0.65, maxEdgeGlint * 0.50);
                ctx.fillStyle = `rgba(255, 235, 205, ${glintAlpha.toFixed(2)})`;
                ctx.fillRect(edgeGlintSide === 'right' ? px + 30 : px + 1, py + by, 1, blockSize);
              }
            } else if (inDeepOcclusion && t === 3) {
              ctx.fillStyle = 'rgba(6, 4, 8, 0.42)';
              ctx.fillRect(px + bx, py + by, blockSize, blockSize);
            }
          }
        }
      }
    }
  }

  private renderEnemyLighting(
    ctx: CanvasRenderingContext2D,
    entity: { x: number; y: number; isBoss?: boolean; type?: string },
    lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[]
  ) {
    ctx.save();
    ctx.translate(Math.round(entity.x), Math.round(entity.y));
    ctx.globalCompositeOperation = 'source-atop';

    const radius = entity.isBoss ? 24 : entity.type === 'abomination' ? 18 : 12;
    const tcz = 14; // Entity body height above floor
    const blockSize = 3;

    for (let dy = -radius; dy <= radius; dy += blockSize) {
      for (let dx = -radius; dx <= radius; dx += blockSize) {
        if (Math.hypot(dx, dy) > radius) continue;

        // Hemispherical normal vector (pointing outwards from rounded body)
        const nx = dx / radius;
        const ny = dy / radius;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        const subTcx = entity.x + dx;
        const subTcy = entity.y + dy;

        let directR = 0;
        let directG = 0;
        let directB = 0;
        let totalDirect = 0;

        for (const light of lights) {
          const ldx = light.x - subTcx;
          const ldy = light.y - subTcy;
          const ldz = light.z - tcz;
          const distSq = ldx * ldx + ldy * ldy + ldz * ldz;
          const radSq = light.radius * light.radius;

          if (distSq < radSq) {
            const dist = Math.sqrt(distSq);
            const lx = ldx / dist;
            const ly = ldy / dist;
            const lz = ldz / dist;

            const dot = nx * lx + ny * ly + nz * lz;
            const ndotl = (dot + 0.4) / 1.4; // Half-Lambert wrap lighting so sides react dynamically
            const distRatio = Math.min(1.0, dist / light.radius);
            const atten = (1.0 - distRatio) * (1.0 - distRatio);

            const irradiance = ndotl * atten * light.intensity;
            totalDirect += irradiance;
            directR += light.r * irradiance;
            directG += light.g * irradiance;
            directB += light.b * irradiance;
          }
        }

        if (totalDirect > 0.02) {
          const alpha = Math.min(0.55, totalDirect * 0.45);
          const r = Math.min(255, Math.round(directR / totalDirect));
          const g = Math.min(255, Math.round(directG / totalDirect));
          const b = Math.min(255, Math.round(directB / totalDirect));
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
          ctx.fillRect(dx, dy, blockSize, blockSize);
        }
      }
    }

    ctx.restore();
  }

  private renderGroundItems(ctx: CanvasRenderingContext2D) {
    for (const g of combatManager.groundItems) {
      const bob = Math.sin(g.bobTime) * 3;
      // Item light glow
      ctx.fillStyle = g.item.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Item icon square
      ctx.fillStyle = g.item.color;
      ctx.fillRect(g.x - 5, g.y - 5 + bob, 10, 10);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(g.x - 5, g.y - 5 + bob, 10, 10);

      // Diablo Rarity Beam pointing upward
      if (g.item.rarity === 'legendary' || g.item.rarity === 'mythic') {
        const beamGrad = ctx.createLinearGradient(g.x, g.y + bob, g.x, g.y + bob - 45);
        beamGrad.addColorStop(0, g.item.color);
        beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(g.x - 2, g.y + bob - 45, 4, 45);
      }
    }
  }

  // Authentic Dark Fantasy Light-Mask System (Diablo & Zelda 3)
  private renderLighting(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!this.dungeon) return;

    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCtx = this.lightCanvas.getContext('2d');
    }
    if (this.lightCanvas.width !== w || this.lightCanvas.height !== h) {
      this.lightCanvas.width = w;
      this.lightCanvas.height = h;
    }

    if (!this.lightCtx) return;
    const lCtx = this.lightCtx;

    // 1. Fill light-mask with atmospheric darkness
    lCtx.globalCompositeOperation = 'source-over';
    lCtx.fillStyle = `rgba(7, 5, 8, ${this.ambientDarkness})`;
    lCtx.fillRect(0, 0, w, h);

    // 2. Carve out clear vision circles with destination-out
    lCtx.globalCompositeOperation = 'destination-out';

    // Player lantern vision (screen coordinates)
    for (const p of this.players) {
      if (p.isDead) continue;
      const sx = p.x - this.camera.x + w / 2;
      const sy = p.y - this.camera.y + h / 2;

      const playerGrad = lCtx.createRadialGradient(sx, sy, 25, sx, sy, 145);
      playerGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      playerGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.75)');
      playerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = playerGrad;
      lCtx.beginPath();
      lCtx.arc(sx, sy, 145, 0, Math.PI * 2);
      lCtx.fill();
    }

    // Torch sconce illumination with independent flicker & soft falloff
    const time = performance.now() / 1000;
    for (let i = 0; i < this.dungeon.map.torchPositions.length; i++) {
      const torch = this.dungeon.map.torchPositions[i];
      const torchSeed = torch.x * 12.9898 + torch.y * 78.233;
      const phase1 = Math.sin(time * 7.2 + torchSeed);

      const jitterX = Math.sin(time * 13.8 + torchSeed) * 2.0;
      const jitterY = Math.cos(time * 16.2 + torchSeed) * 2.0;

      const torchX = torch.x + jitterX;
      const torchY = torch.y - 4 + jitterY;

      const sx = torchX - this.camera.x + w / 2;
      const sy = torchY - this.camera.y + h / 2;

      // Viewport culling
      if (sx < -120 || sx > w + 120 || sy < -120 || sy > h + 120) continue;

      const torchRadius = 92 + phase1 * 7;
      const torchGrad = lCtx.createRadialGradient(sx, sy, 4, sx, sy, torchRadius);
      torchGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
      torchGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.75)');
      torchGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.35)');
      torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = torchGrad;
      lCtx.beginPath();
      lCtx.arc(sx, sy, torchRadius, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 3. Draw darkness mask over dungeon playfield
    ctx.save();
    ctx.drawImage(this.lightCanvas, this.camera.x - w / 2, this.camera.y - h / 2);

    // 4. Warm amber fire glow in torches using 'lighter'
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.dungeon.map.torchPositions.length; i++) {
      const torch = this.dungeon.map.torchPositions[i];
      const torchSeed = torch.x * 12.9898 + torch.y * 78.233;
      const phase1 = Math.sin(time * 7.2 + torchSeed);
      const animFrame = Math.floor((time * 8.0 + torchSeed) % 3);

      const jitterX = Math.sin(time * 13.8 + torchSeed) * 2.0;
      const jitterY = Math.cos(time * 16.2 + torchSeed) * 2.0;

      const torchX = torch.x + jitterX;
      const torchY = torch.y + jitterY;

      const grad = ctx.createRadialGradient(torchX, torchY, 4, torchX, torchY, 78 + phase1 * 6);
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.38)');
      grad.addColorStop(0.45, 'rgba(234, 88, 12, 0.18)');
      grad.addColorStop(0.8, 'rgba(180, 50, 10, 0.05)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(torchX, torchY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Sconce sprite at fixed position on wall
      const torchImg = textureAtlas.get(`torch_${animFrame}`);
      if (torchImg) {
        ctx.drawImage(torchImg, torch.x - 8, torch.y - 12);
      }
    }

    // Hero subtle lantern halo
    for (const p of this.players) {
      if (p.isDead) continue;
      const hGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 110);
      hGrad.addColorStop(0, 'rgba(254, 215, 170, 0.22)');
      hGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.08)');
      hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 110, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D) {
    for (const ft of combatManager.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.fontSize}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
      ctx.shadowBlur = 0;
    }
  }

  public destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
  }
}

function facingToVector(f: Direction) {
  switch (f) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export const gameEngine = new GameEngine();
