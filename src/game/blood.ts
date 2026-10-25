/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BloodDecal, BloodParticle, EnemyType, SeveredLimb } from './types';
import { PALETTE, textureAtlas } from './textures';

export interface FleshChunk {
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
  bounces: number;
}

export class BloodSystem {
  public particles: BloodParticle[] = [];
  public severedLimbs: SeveredLimb[] = [];
  public fleshChunks: FleshChunk[] = [];
  public decals: BloodDecal[] = [];
  private maxDecals: number = 350;

  // Clear all decals, particles, and limbs when moving to a new dungeon floor
  public clearAll() {
    this.particles = [];
    this.severedLimbs = [];
    this.fleshChunks = [];
    this.decals = [];
  }

  // Arterial Blood Spray on Weapon Hit (Pure 16-Bit Pixel Droplets)
  public spawnHitSpatter(x: number, y: number, hitAngle: number, intensity: number = 1) {
    const count = Math.floor((6 + Math.random() * 6) * intensity);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.4;
      const angle = hitAngle + spread;
      const speed = (2 + Math.random() * 4.5) * intensity;
      const vz = 2 + Math.random() * 3.5;

      this.particles.push({
        x: Math.round(x + (Math.random() - 0.5) * 6),
        y: Math.round(y + (Math.random() - 0.5) * 6),
        z: 8 + Math.random() * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz,
        size: Math.random() > 0.5 ? 3 : 2, // 2px or 3px discrete pixel blocks
        color: Math.random() > 0.35 ? PALETTE.bloodBright : PALETTE.bloodMid,
        lifetime: 0,
        maxLifetime: 0.5 + Math.random() * 0.3,
      });
    }
  }

  // Flying Flesh Chunks Torn Off Proportional to Damage Dealt!
  public spawnFleshChunks(x: number, y: number, enemyType: EnemyType, hitAngle: number, damageRatio: number) {
    // Number of chunks proportional to damage dealt (e.g. 1 to 5 chunks)
    const count = Math.max(1, Math.min(6, Math.round(damageRatio * 8)));

    const chunkColors = enemyType === 'slime'
      ? [PALETTE.slimeAcid, PALETTE.slimeAcidDark, PALETTE.slimeAcidGlow]
      : enemyType === 'skeleton'
      ? [PALETTE.boneWhite, PALETTE.boneDark]
      : enemyType === 'goblin' || enemyType === 'goblin_spear'
      ? [PALETTE.goblinGreen, PALETTE.bloodBright, PALETTE.bloodDark]
      : [PALETTE.bloodDark, '#5c4d3c', PALETTE.bloodBright];

    for (let i = 0; i < count; i++) {
      const angle = hitAngle + (Math.random() - 0.5) * 1.6;
      const speed = 2.5 + Math.random() * 4;
      const color = chunkColors[Math.floor(Math.random() * chunkColors.length)];

      this.fleshChunks.push({
        x: Math.round(x),
        y: Math.round(y),
        z: 10 + Math.random() * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 3 + Math.random() * 4,
        size: Math.random() > 0.5 ? 4 : 3, // 3px to 4px chunky pixel flesh bits
        color,
        lifetime: 0,
        maxLifetime: 12,
        bounces: 0,
      });
    }
  }

  // Violent Dismemberment on Kill
  public spawnDismemberment(
    x: number,
    y: number,
    enemyType: EnemyType,
    killerAngle: number,
    isCrit: boolean = false
  ) {
    // 1. Pixelated blood geyser
    const fountainCount = isCrit ? 28 : 18;
    for (let i = 0; i < fountainCount; i++) {
      const angle = killerAngle + (Math.random() - 0.5) * 1.6;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x: Math.round(x),
        y: Math.round(y),
        z: 12 + Math.random() * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 3 + Math.random() * 5,
        size: Math.random() > 0.5 ? 4 : 2,
        color: enemyType === 'slime' ? PALETTE.slimeAcid : (Math.random() > 0.4 ? PALETTE.bloodBright : PALETTE.bloodGore),
        lifetime: 0,
        maxLifetime: 0.7 + Math.random() * 0.3,
      });
    }

    // 2. Severed Limbs
    if (enemyType === 'skeleton') {
      const boneTypes: SeveredLimb['type'][] = ['head', 'ribs', 'arm', 'arm', 'weapon'];
      boneTypes.forEach((bType) => {
        const angle = killerAngle + (Math.random() - 0.5) * 2.2;
        const speed = 2.5 + Math.random() * 5;
        this.severedLimbs.push({
          x: Math.round(x + (Math.random() - 0.5) * 8),
          y: Math.round(y + (Math.random() - 0.5) * 8),
          z: 12 + Math.random() * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 4 + Math.random() * 4,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 15,
          type: bType,
          color: PALETTE.boneWhite,
          enemyType,
          lifetime: 0,
          maxLifetime: 15,
          bounces: 0,
        });
      });
    } else if (enemyType === 'slime') {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        this.severedLimbs.push({
          x: Math.round(x),
          y: Math.round(y),
          z: 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 3 + Math.random() * 3,
          rotation: 0,
          vRot: 0,
          type: 'slime_chunk',
          color: PALETTE.slimeAcid,
          enemyType,
          lifetime: 0,
          maxLifetime: 12,
          bounces: 0,
        });
      }
    } else {
      const limbTypes: SeveredLimb['type'][] = ['head', 'arm', 'weapon'];
      if (isCrit || enemyType === 'abomination' || enemyType === 'boss_malakor') {
        limbTypes.push('leg', 'ribs');
      }

      const limbColor = enemyType === 'goblin' || enemyType === 'goblin_spear' 
        ? PALETTE.goblinGreen 
        : enemyType === 'abomination' 
        ? '#5c4d3c' 
        : enemyType === 'blood_demon' || enemyType === 'boss_malakor'
        ? PALETTE.demonRed
        : '#475569';

      limbTypes.forEach((lType) => {
        const angle = killerAngle + (Math.random() - 0.5) * 1.8;
        const speed = 3 + Math.random() * 5.5;
        this.severedLimbs.push({
          x: Math.round(x + (Math.random() - 0.5) * 6),
          y: Math.round(y + (Math.random() - 0.5) * 6),
          z: 14 + Math.random() * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 4 + Math.random() * 5,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 18,
          type: lType,
          color: limbColor,
          enemyType,
          lifetime: 0,
          maxLifetime: 20,
          bounces: 0,
        });
      });
    }

    // Permanent large death blood pool decal on floor
    this.addDecal(x, y, 16 + Math.random() * 6, enemyType === 'slime' ? PALETTE.slimeAcidDark : PALETTE.bloodGore);
  }

  // Add 16-Bit Decal
  public addDecal(x: number, y: number, radius: number, color: string) {
    if (this.decals.length >= this.maxDecals) {
      this.decals.shift();
    }
    this.decals.push({
      x: Math.round(x),
      y: Math.round(y),
      radius: Math.round(radius),
      color,
      alpha: 0.85,
    });
  }

  // 16-Bit Pixel Footprint
  public addFootprint(x: number, y: number) {
    if (this.decals.length >= this.maxDecals) {
      this.decals.shift();
    }
    this.decals.push({
      x: Math.round(x),
      y: Math.round(y),
      radius: 3,
      color: PALETTE.bloodDark,
      alpha: 0.65,
    });
  }

  // Update physics
  public update(dt: number) {
    const gravity = 28;

    // 1. In-air pixel droplets
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += dt;
      p.x += p.vx * dt * 30;
      p.y += p.vy * dt * 30;
      p.vz -= gravity * dt;
      p.z += p.vz * dt * 30;

      if (p.z <= 0) {
        this.addDecal(p.x, p.y, p.size * 1.5, p.color);
        this.particles.splice(i, 1);
        continue;
      }

      if (p.lifetime >= p.maxLifetime) {
        this.particles.splice(i, 1);
      }
    }

    // 2. Flying Flesh Chunks
    for (let i = this.fleshChunks.length - 1; i >= 0; i--) {
      const c = this.fleshChunks[i];
      c.lifetime += dt;
      if (c.z > 0) {
        c.x += c.vx * dt * 25;
        c.y += c.vy * dt * 25;
        c.vz -= gravity * dt;
        c.z += c.vz * dt * 25;

        if (c.z <= 0) {
          c.z = 0;
          c.bounces++;
          if (c.bounces < 2) {
            c.vz = -c.vz * 0.4;
            c.vx *= 0.5;
            c.vy *= 0.5;
          } else {
            c.vx = 0;
            c.vy = 0;
            c.vz = 0;
          }
          this.addDecal(c.x, c.y, 4, c.color);
        }
      }

      if (c.lifetime >= c.maxLifetime) {
        this.fleshChunks.splice(i, 1);
      }
    }

    // 3. Severed Limbs
    for (let i = this.severedLimbs.length - 1; i >= 0; i--) {
      const limb = this.severedLimbs[i];
      limb.lifetime += dt;

      if (limb.z > 0) {
        limb.x += limb.vx * dt * 25;
        limb.y += limb.vy * dt * 25;
        limb.vz -= gravity * dt;
        limb.z += limb.vz * dt * 25;
        limb.rotation += limb.vRot * dt;

        // Drip pixel droplets
        if (Math.random() < 0.35 && limb.enemyType !== 'skeleton') {
          this.particles.push({
            x: Math.round(limb.x),
            y: Math.round(limb.y),
            z: limb.z,
            vx: -limb.vx * 0.2,
            vy: -limb.vy * 0.2,
            vz: 0,
            size: 2,
            color: limb.enemyType === 'slime' ? PALETTE.slimeAcid : PALETTE.bloodMid,
            lifetime: 0,
            maxLifetime: 0.35,
          });
        }

        if (limb.z <= 0) {
          limb.z = 0;
          limb.bounces++;
          if (limb.bounces < 3) {
            limb.vz = -limb.vz * 0.45;
            limb.vx *= 0.5;
            limb.vy *= 0.5;
            limb.vRot *= 0.5;
          } else {
            limb.vx = 0;
            limb.vy = 0;
            limb.vz = 0;
            limb.vRot = 0;
          }
          this.addDecal(limb.x, limb.y, 6, limb.enemyType === 'slime' ? PALETTE.slimeAcid : PALETTE.bloodDark);
        }
      }

      if (limb.lifetime >= limb.maxLifetime) {
        this.severedLimbs.splice(i, 1);
      }
    }
  }

  // Render Persistent Blood Decals as Pure 16-Bit Pixel Clusters
  public renderDecals(ctx: CanvasRenderingContext2D) {
    for (const d of this.decals) {
      const x = Math.round(d.x);
      const y = Math.round(d.y);
      const r = d.radius;

      ctx.fillStyle = d.color;
      ctx.globalAlpha = d.alpha;

      // 16-Bit Pixel Splatter Shape (Stepped pixel blocks, zero smooth vector curves)
      if (r <= 3) {
        // Small droplet: 2x2 or 3x3 block
        ctx.fillRect(x - 1, y - 1, r, r);
      } else if (r <= 7) {
        // Medium splatter: stepped cross pixel pattern
        ctx.fillRect(x - 3, y - 2, 6, 4);
        ctx.fillRect(x - 2, y - 3, 4, 6);
        // Satellite pixels
        ctx.fillRect(x + 4, y - 1, 2, 2);
        ctx.fillRect(x - 4, y + 2, 2, 2);
      } else {
        // Large blood pool: stepped 16-bit jagged shape
        ctx.fillRect(x - r + 3, y - 4, (r - 3) * 2, 8);
        ctx.fillRect(x - r + 5, y - 7, (r - 5) * 2, 14);
        ctx.fillRect(x - 6, y - r + 4, 12, (r - 4) * 2);
        // Jagged clot bits
        ctx.fillStyle = PALETTE.bloodGore;
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = d.color;
        // Satellite drips
        ctx.fillRect(x + r - 2, y + 2, 2, 2);
        ctx.fillRect(x - r + 1, y - 3, 2, 2);
        ctx.fillRect(x + 2, y + r - 3, 2, 2);
      }
    }
    ctx.globalAlpha = 1.0;
  }

  // Render Flying Blood Droplets and Flesh Chunks as 16-Bit Pixel Blocks
  public renderParticlesAndLimbs(ctx: CanvasRenderingContext2D) {
    // 1. Severed Limbs
    for (const limb of this.severedLimbs) {
      textureAtlas.renderSeveredLimb(ctx, limb);
    }

    // 2. Flying Flesh Chunks (Pure Pixel Rectangles)
    for (const chunk of this.fleshChunks) {
      ctx.fillStyle = chunk.color;
      const px = Math.round(chunk.x - chunk.size / 2);
      const py = Math.round(chunk.y - chunk.z - chunk.size / 2);
      ctx.fillRect(px, py, chunk.size, chunk.size);
      // Dark pixel outline
      ctx.fillStyle = PALETTE.bloodGore;
      ctx.fillRect(px, py, 1, chunk.size);
    }

    // 3. In-Air Blood Droplets (Pure Pixel Rectangles)
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      const px = Math.round(p.x - p.size / 2);
      const py = Math.round(p.y - p.z - p.size / 2);
      ctx.fillRect(px, py, p.size, p.size);
    }
  }
}

export const bloodSystem = new BloodSystem();
