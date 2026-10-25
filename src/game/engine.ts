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

    // Reposition players at spawn point
    this.players.forEach((p, idx) => {
      p.x = level.spawnPoint.x + (idx === 1 ? 24 : 0);
      p.y = level.spawnPoint.y;
      p.vx = 0;
      p.vy = 0;
      p.isDead = false;
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
  }

  private updateEnemies(dt: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer -= dt;
      if (enemy.stunTimer > 0) {
        enemy.stunTimer -= dt;
        if (enemy.stunTimer <= 0) enemy.isStunned = false;
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

        if (dist < 180) {
          // Chase Player (speed slows down as enemy takes damage / loses health)
          const healthRatio = Math.max(0.25, enemy.hp / Math.max(1, enemy.maxHp));
          const currentSpeed = enemy.speed * (0.35 + 0.65 * healthRatio);
          const angle = Math.atan2(targetPlayer.y - enemy.y, targetPlayer.x - enemy.x);
          enemy.vx += (Math.cos(angle) * currentSpeed - enemy.vx) * 0.15;
          enemy.vy += (Math.sin(angle) * currentSpeed - enemy.vy) * 0.15;

          if (Math.abs(enemy.vx) > Math.abs(enemy.vy)) {
            enemy.facing = enemy.vx > 0 ? 'right' : 'left';
          } else {
            enemy.facing = enemy.vy > 0 ? 'down' : 'up';
          }

          // Attack when within range
          enemy.lastAttackTime += dt;
          if (dist <= enemy.attackRange && enemy.lastAttackTime >= enemy.attackCooldown) {
            enemy.lastAttackTime = 0;
            combatManager.handleEnemyAttack(enemy, targetPlayer, (s) => (this.camera.shake = s));
          }
        } else {
          // Wander / Idle
          enemy.vx *= 0.8;
          enemy.vy *= 0.8;
        }

        enemy.animTimer += dt * 4;
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

    // Any player stepping on stairs descends to next floor!
    for (const p of this.players) {
      if (p.isDead) continue;
      if (Math.hypot(p.x - stairsWorld.x, p.y - stairsWorld.y) < 18) {
        this.loadFloor(this.currentFloor + 1);
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

  // Render Pipeline: 2.5D Zelda 3 Depth Sorting, Dynamic Darkness & Torchlight
  public render() {
    if (!this.canvas || !this.ctx || !this.dungeon) return;
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || (this.canvas.width / dpr);
    const h = this.canvas.clientHeight || (this.canvas.height / dpr);

    // Gather active dynamic light sources for this frame (just below top of walls z=24/26)
    const lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[] = [];
    for (const p of this.players) {
      if (p.isDead) continue;
      lights.push({
        x: p.x,
        y: p.y,
        z: 24,
        radius: 155,
        intensity: 1.15,
        r: 254,
        g: 220,
        b: 180,
      });
    }

    const animFlicker = Math.floor(Date.now() / 150) % 3;
    for (const torch of this.dungeon.map.torchPositions) {
      if (Math.abs(torch.x - this.camera.x) > w / 2 + 100 || Math.abs(torch.y - this.camera.y) > h / 2 + 100) continue;
      lights.push({
        x: torch.x,
        y: torch.y - 4,
        z: 26,
        radius: 95 + animFlicker * 5,
        intensity: 1.35,
        r: 251,
        g: 146,
        b: 60,
      });
    }

    // Screen shake offset
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;

    ctx.save();
    ctx.fillStyle = '#050405';
    ctx.fillRect(0, 0, w, h);

    // Apply Camera transform
    const cx = Math.round(w / 2 - this.camera.x + shakeX);
    const cy = Math.round(h / 2 - this.camera.y + shakeY);
    ctx.translate(cx, cy);

    // 1. Draw Tilemap (Floor & Base Walls)
    this.renderTiles(ctx, lights);

    // 2. Draw Persistent Blood Decals directly on floor
    bloodSystem.renderDecals(ctx);

    // 3. Draw Ground Loot Items with hovering beacon
    this.renderGroundItems(ctx);

    // 4. 2.5D DEPTH SORTING: Sort all dynamic entities by Y coordinate!
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

    // Enemies
    this.enemies.forEach((enemy) => {
      renderList.push({
        y: enemy.y,
        draw: () => {
          textureAtlas.renderEnemy(ctx, enemy);
          this.renderEnemyLighting(ctx, enemy, lights);
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

    // 5. Draw Flying Blood Droplets and Flying Dismembered Limbs
    bloodSystem.renderParticlesAndLimbs(ctx);

    // 6. Draw 2.5D Dynamic Torch Lighting & Atmospheric Dungeon Darkness
    this.renderLighting(ctx, w, h);

    // 7. Draw Floating Combat Damage Numbers
    this.renderFloatingTexts(ctx);

    ctx.restore();
  }

  // Render Tiles with 2.5D Dynamic Normal Lighting (Floor vs Wall distinct light reactions)
  private renderTiles(
    ctx: CanvasRenderingContext2D,
    lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[]
  ) {
    if (!this.dungeon || !this.canvas) return;
    const { tiles, width, height } = this.dungeon.map;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || (this.canvas.width / dpr);
    const h = this.canvas.clientHeight || (this.canvas.height / dpr);

    const floorImg = textureAtlas.get('tile_floor');
    const ritualImg = textureAtlas.get('tile_ritual_floor');
    const wallTopImg = textureAtlas.get('tile_wall_top');
    const wallFrontImg = textureAtlas.get('tile_wall_front');
    const pillarImg = textureAtlas.get('tile_pillar');
    const stairsImg = textureAtlas.get('tile_stairs');

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
        }

        // 2. Dynamic Lighting via Per-Block Normal Map Sampling (N · L)
        const normalKey =
          t === 3 ? 'tile_wall_front_normal' :
          t === 2 ? 'tile_wall_top_normal' :
          t === 4 ? 'tile_pillar_normal' :
          t === 6 ? 'tile_stairs_normal' :
          'tile_floor_normal';
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
                const atten = Math.max(0, 1 - dist / light.radius);

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
            const atten = Math.max(0, 1 - dist / light.radius);

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

    // Torch sconce illumination
    const animFlicker = Math.floor(Date.now() / 150) % 3;
    for (const torch of this.dungeon.map.torchPositions) {
      const sx = torch.x - this.camera.x + w / 2;
      const sy = torch.y - this.camera.y + h / 2;

      // Viewport culling
      if (sx < -120 || sx > w + 120 || sy < -120 || sy > h + 120) continue;

      const torchRadius = 88 + animFlicker * 5;
      const torchGrad = lCtx.createRadialGradient(sx, sy, 8, sx, sy, torchRadius);
      torchGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      torchGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
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
    for (const torch of this.dungeon.map.torchPositions) {
      const grad = ctx.createRadialGradient(torch.x, torch.y, 4, torch.x, torch.y, 75 + animFlicker * 4);
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.38)');
      grad.addColorStop(0.5, 'rgba(234, 88, 12, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, 80, 0, Math.PI * 2);
      ctx.fill();

      // Sconce sprite
      const torchImg = textureAtlas.get(`torch_${animFlicker}`);
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
