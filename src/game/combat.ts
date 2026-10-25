/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Direction, Enemy, EquipmentItem, FloatingText, GroundItem, Player, Quest } from './types';
import { bloodSystem } from './blood';
import { soundEngine } from './audio';
import { generateLootItem } from './loot';

export class CombatManager {
  public floatingTexts: FloatingText[] = [];
  public groundItems: GroundItem[] = [];
  private textCounter: number = 0;

  // Add floating damage or heal text
  public addFloatingText(x: number, y: number, text: string, color: string, fontSize: number = 13) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${++this.textCounter}`,
      x,
      y,
      text,
      color,
      lifetime: 0,
      maxLifetime: 0.8,
      vy: -28,
      fontSize,
    });
  }

  // Update floating text positions & decay
  public updateTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.lifetime += dt;
      ft.y += ft.vy * dt;
      if (ft.lifetime >= ft.maxLifetime) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Check player sword swing against enemies (Zelda 3 arc)
  public handlePlayerAttack(
    player: Player,
    enemies: Enemy[],
    isWhirlwind: boolean = false,
    triggerScreenShake: (amount: number) => void,
    onEnemyKilled: (enemy: Enemy, player: Player) => void
  ) {
    const weapon = player.equipment.weapon;
    const baseDamage = weapon.attackBonus + (player.stats.level * 4);
    const hitRadius = isWhirlwind ? 54 : 34;

    let hitAny = false;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > hitRadius + enemy.radius) continue;

      // If not whirlwind, check facing angle (Zelda 3 140-degree front arc)
      if (!isWhirlwind) {
        const angle = Math.atan2(dy, dx);
        const facingAngle = facingToAngle(player.facing);
        let diff = Math.abs(angle - facingAngle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
        if (diff > 1.2) continue; // Outside sword sweep cone
      }

      hitAny = true;

      // Damage calculation with crit chance
      const isCrit = Math.random() * 100 < (weapon.critChance || 5) || isWhirlwind;
      const multiplier = isWhirlwind ? 2.4 : isCrit ? 1.8 : 1.0;
      const rawDamage = Math.max(1, Math.round((baseDamage - enemy.defense * 0.4) * multiplier));

      enemy.hp -= rawDamage;
      enemy.hitFlashTimer = 0.14;
      enemy.isStunned = true;
      enemy.stunTimer = 0.22;

      // Knockback
      const knockAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const knockForce = isWhirlwind ? 8 : 4.5;
      enemy.vx += Math.cos(knockAngle) * knockForce;
      enemy.vy += Math.sin(knockAngle) * knockForce;

      // Blood spatter & proportional flying flesh chunks
      bloodSystem.spawnHitSpatter(enemy.x, enemy.y, knockAngle, isCrit ? 1.6 : 1.0);
      bloodSystem.spawnFleshChunks(enemy.x, enemy.y, enemy.type, knockAngle, rawDamage / enemy.maxHp);

      // On heavy hits or critical hits, sometimes sever a limb mid-combat!
      if ((rawDamage >= enemy.maxHp * 0.25 || isCrit) && Math.random() < 0.5) {
        bloodSystem.spawnDismemberment(enemy.x, enemy.y, enemy.type, knockAngle + (Math.random() - 0.5), false);
      }

      // Sound
      if (enemy.type === 'slime') {
        soundEngine.playSlimeBurst();
      } else {
        soundEngine.playHitFlesh();
      }

      // Floating text
      this.addFloatingText(
        enemy.x + (Math.random() - 0.5) * 8,
        enemy.y - 12,
        `${rawDamage}${isCrit ? '!' : ''}`,
        isCrit ? '#facc15' : '#ffffff',
        isCrit ? 16 : 13
      );

      // Weapon durability decay
      if (Math.random() < 0.2) {
        weapon.durability = Math.max(0, weapon.durability - 1);
      }

      // Life Steal
      if (weapon.lifeSteal > 0) {
        const heal = Math.round(rawDamage * (weapon.lifeSteal / 100));
        if (heal > 0) {
          player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
          this.addFloatingText(player.x, player.y - 14, `+${heal}`, '#4ade80', 12);
        }
      }

      // Enemy Slain: Graphically violent ends!
      if (enemy.hp <= 0) {
        enemies.splice(i, 1);
        soundEngine.playDismemberGore();
        bloodSystem.spawnDismemberment(enemy.x, enemy.y, enemy.type, knockAngle, isCrit);
        triggerScreenShake(isWhirlwind ? 7 : 4);
        onEnemyKilled(enemy, player);

        // Drop Loot Chance
        if (Math.random() < (enemy.isBoss ? 1.0 : 0.38)) {
          const droppedItem = generateLootItem(player.stats.level, enemy.isBoss ? 'legendary' : undefined);
          this.groundItems.push({
            id: `drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            x: enemy.x + (Math.random() - 0.5) * 12,
            y: enemy.y + (Math.random() - 0.5) * 12,
            item: droppedItem,
            bobTime: 0,
          });
          soundEngine.playLootDrop(droppedItem.rarity);
        }

        // Gold & Potions
        const goldDropped = Math.floor(Math.random() * 8) + (enemy.level * 4);
        player.stats.gold += goldDropped;
        this.addFloatingText(enemy.x, enemy.y - 20, `+${goldDropped} Gold`, '#fbbf24', 11);

        if (Math.random() < 0.2) {
          player.stats.potions = Math.min(9, player.stats.potions + 1);
          this.addFloatingText(player.x, player.y - 24, '+1 Potion', '#ef4444', 11);
        }
      }
    }

    if (hitAny) {
      triggerScreenShake(isWhirlwind ? 5 : 2);
    }
  }

  // Handle enemy striking a player (Shield blocking mechanics based on Zelda 3)
  public handleEnemyAttack(
    enemy: Enemy,
    player: Player,
    triggerScreenShake: (amount: number) => void
  ) {
    if (player.isDead || player.iFrames > 0) return;

    // Trigger enemy melee attack strike visual
    enemy.attackVisualTimer = 0.22;
    enemy.attackVisualAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    
    // Add visual arc for armed enemies
    if (enemy.type !== 'slime') {
      combatManager.addFloatingText(enemy.x, enemy.y - 10, 'ARC!', '#ffffff', 10);
    }

    // Check if player has Shield Raised facing the enemy!
    let blocked = false;
    if (player.isShielding && player.equipment.shield.durability > 0) {
      const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const playerFacingAngle = facingToAngle(player.facing);
      let angleDiff = Math.abs(angleToEnemy - playerFacingAngle);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

      // If enemy is within 90-degree frontal shield arc: BLOCKED!
      if (angleDiff < 1.0) {
        blocked = true;
      }
    }

    if (blocked) {
      // SHIELD BLOCK!
      soundEngine.playShieldBlock();
      triggerScreenShake(2);

      // Shield durability loss
      player.equipment.shield.durability = Math.max(0, player.equipment.shield.durability - 2);

      // Thorns reflect damage
      const thorns = player.equipment.shield.thorns + player.equipment.armor.thorns;
      if (thorns > 0) {
        enemy.hp -= thorns;
        this.addFloatingText(enemy.x, enemy.y - 10, `${thorns}`, '#f97316', 12);
      }

      // Knock enemy back slightly & stun
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      enemy.vx += Math.cos(angle) * 4;
      enemy.vy += Math.sin(angle) * 4;
      enemy.isStunned = true;
      enemy.stunTimer = 0.35;

      this.addFloatingText(player.x, player.y - 16, 'BLOCKED', '#60a5fa', 13);
      return;
    }

    // HIT PLAYER!
    soundEngine.playPlayerHurt();
    triggerScreenShake(4);

    const armorDef = player.equipment.armor.defenseBonus + player.equipment.helmet.defenseBonus + player.equipment.boots.defenseBonus;
    const damage = Math.max(2, Math.round(enemy.attack - armorDef * 0.45));

    player.stats.hp = Math.max(0, player.stats.hp - damage);
    player.iFrames = 0.5; // Half second invulnerability
    player.hitFlashTimer = 0.2;

    // Equipment wear / damage on hit
    if (Math.random() < 0.4) {
      player.equipment.armor.durability = Math.max(0, player.equipment.armor.durability - 2);
    }
    if (Math.random() < 0.3) {
      player.equipment.helmet.durability = Math.max(0, player.equipment.helmet.durability - 1);
    }

    // Blood splatter from player
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    bloodSystem.spawnHitSpatter(player.x, player.y, angle, 0.8);
    player.hasBloodyFeet = 6; // Fresh blood footprints for 6 seconds!

    this.addFloatingText(player.x, player.y - 14, `-${damage}`, '#ef4444', 15);

    // Knockback player
    player.vx += Math.cos(angle) * 3;
    player.vy += Math.sin(angle) * 3;

    if (player.stats.hp <= 0) {
      player.isDead = true;
      soundEngine.playDismemberGore();
      bloodSystem.addDecal(player.x, player.y, 22, '#450a0a');
    }
  }

  // Update floating items on ground (Diablo loot drops)
  public updateGroundItems(
    dt: number,
    players: Player[],
    onItemPickup: (item: EquipmentItem, player: Player) => void
  ) {
    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const gItem = this.groundItems[i];
      gItem.bobTime += dt * 3;

      // Check proximity with players to pick up
      for (const p of players) {
        if (p.isDead) continue;
        const dist = Math.hypot(p.x - gItem.x, p.y - gItem.y);
        if (dist < 22) {
          // Pickup!
          this.groundItems.splice(i, 1);
          soundEngine.playLootDrop(gItem.item.rarity);
          onItemPickup(gItem.item, p);
          this.addFloatingText(p.x, p.y - 20, `${gItem.item.name}`, gItem.item.color, 12);
          break;
        }
      }
    }
  }
}

function facingToAngle(facing: Direction): number {
  switch (facing) {
    case 'right': return 0;
    case 'down': return Math.PI / 2;
    case 'left': return Math.PI;
    case 'up': return -Math.PI / 2;
  }
}

export const combatManager = new CombatManager();
