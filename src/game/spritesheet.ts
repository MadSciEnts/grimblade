/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PALETTE } from './textures';

// Master Pre-Baked 16-Bit Pixel Art Sprite Sheet Generator
export class SpriteSheetManager {
  public tileSheet: HTMLCanvasElement | null = null;
  public normalSheet: HTMLCanvasElement | null = null;
  public heroSheet: HTMLCanvasElement | null = null;
  public enemySheet: HTMLCanvasElement | null = null;
  public goreSheet: HTMLCanvasElement | null = null;
  public itemsSheet: HTMLCanvasElement | null = null;

  public isGenerated: boolean = false;

  private createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [canvas, ctx];
  }

  // Pre-generate all 16-bit sprite sheets in advance
  public generateAll() {
    if (this.isGenerated) return;
    this.generateTileSheet();
    this.generateNormalSheet();
    this.generateHeroSheet();
    this.generateEnemySheet();
    this.generateGoreSheet();
    this.generateItemsSheet();
    this.isGenerated = true;
  }

  // 1. Tile Sprite Sheet (256x256, 32x32 tiles)
  private generateTileSheet() {
    const [canvas, ctx] = this.createCanvas(256, 256);

    // Tile (0, 0): Cobblestone Paver
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = PALETTE.stoneMid;
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillRect(17, 1, 14, 14);
    ctx.fillRect(1, 17, 14, 14);
    ctx.fillRect(17, 17, 14, 14);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(1, 1, 13, 2);
    ctx.fillRect(1, 1, 2, 13);
    ctx.fillRect(17, 1, 13, 2);
    ctx.fillRect(17, 1, 2, 13);
    ctx.fillRect(1, 17, 13, 2);
    ctx.fillRect(1, 17, 2, 13);
    ctx.fillRect(17, 17, 13, 2);
    ctx.fillRect(17, 17, 2, 13);
    // Cracks & grime
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(6, 6, 4, 1);
    ctx.fillRect(10, 7, 2, 2);
    ctx.fillRect(22, 22, 5, 1);

    // Tile (32, 0): Cracked Floor
    ctx.drawImage(canvas, 0, 0, 32, 32, 32, 0, 32, 32);
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(36, 12, 12, 2);
    ctx.fillRect(44, 14, 2, 8);
    ctx.fillRect(52, 6, 8, 2);
    ctx.fillRect(48, 20, 10, 2);

    // Tile (64, 0): Runic Blood Ritual Floor
    ctx.drawImage(canvas, 0, 0, 32, 32, 64, 0, 32, 32);
    ctx.strokeStyle = PALETTE.bloodMid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(80, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.fillRect(79, 6, 2, 4);
    ctx.fillRect(89, 14, 4, 2);
    ctx.fillRect(86, 23, 2, 4);
    ctx.fillRect(72, 23, 2, 4);
    ctx.fillRect(67, 14, 4, 2);

    // Tile (96, 0): Zelda 3 North Wall Top Coping
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = PALETTE.stoneHighlight;
    ctx.fillRect(96, 0, 32, 3);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(96, 3, 32, 5);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(106, 0, 2, 28);
    ctx.fillRect(118, 0, 2, 28);
    ctx.fillStyle = PALETTE.wallFront;
    ctx.fillRect(96, 28, 32, 4);

    // Tile (128, 0): Zelda 3 North Wall Front Face (Bricks with depth)
    ctx.fillStyle = PALETTE.wallFront;
    ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = PALETTE.stoneMid;
    ctx.fillRect(129, 1, 14, 8);
    ctx.fillRect(145, 1, 14, 8);
    ctx.fillRect(129, 11, 6, 8);
    ctx.fillRect(137, 11, 14, 8);
    ctx.fillRect(153, 11, 6, 8);
    ctx.fillRect(129, 21, 14, 8);
    ctx.fillRect(145, 21, 14, 8);
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(128, 0, 32, 1);
    ctx.fillRect(128, 10, 32, 1);
    ctx.fillRect(128, 20, 32, 1);
    ctx.fillRect(128, 30, 32, 2);

    // Tile (160, 0): Carved Stone Pillar / Column
    ctx.drawImage(canvas, 0, 0, 32, 32, 160, 0, 32, 32);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fillRect(164, 2, 24, 28);
    ctx.fillStyle = PALETTE.stoneMid;
    ctx.fillRect(166, 4, 20, 24);
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(168, 6, 8, 20);
    ctx.fillStyle = PALETTE.stoneHighlight;
    ctx.fillRect(168, 6, 3, 20);
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(182, 6, 4, 20);

    // Tile (192, 0): Stairs Down
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(192, 0, 32, 32);
    for (let i = 0; i < 4; i++) {
      const y = i * 8;
      ctx.fillStyle = [PALETTE.stoneMid, PALETTE.stoneDark, PALETTE.dungeonDark, PALETTE.voidBlack][i];
      ctx.fillRect(194, y, 28, 7);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(194, y, 28, 2);
    }

    // Tile (224, 0): Blood Altar
    ctx.drawImage(canvas, 0, 0, 32, 32, 224, 0, 32, 32);
    ctx.fillStyle = '#22080a';
    ctx.fillRect(228, 4, 24, 24);
    ctx.fillStyle = '#4a080d';
    ctx.fillRect(230, 6, 20, 20);
    ctx.fillStyle = PALETTE.bloodMid;
    ctx.fillRect(233, 9, 14, 14); // Glowing blood pool
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.fillRect(236, 12, 8, 8);

    // Row 1 (y = 32): Chests, Torches, Urns
    // Tile (0, 32): Closed Chest
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(4, 36, 24, 20);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(6, 38, 20, 16);
    ctx.fillStyle = PALETTE.goldMid;
    ctx.fillRect(4, 36, 4, 20);
    ctx.fillRect(24, 36, 4, 20);
    ctx.fillRect(4, 43, 24, 3);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillRect(14, 42, 4, 5);
    ctx.fillStyle = PALETTE.voidBlack;
    ctx.fillRect(15, 44, 2, 2);

    // Tile (32, 32): Open Chest
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(36, 42, 24, 18);
    ctx.fillStyle = PALETTE.woodMid;
    ctx.fillRect(38, 44, 20, 14);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(36, 32, 24, 10);
    ctx.fillStyle = PALETTE.goldBright;
    ctx.fillRect(42, 38, 12, 10);

    // Tile (64, 32), (96, 32), (128, 32): Animated Torch Sconces (Frames 0, 1, 2)
    for (let f = 0; f < 3; f++) {
      const tx = 64 + f * 32;
      ctx.fillStyle = PALETTE.ironDark;
      ctx.fillRect(tx + 14, 48, 4, 10);
      ctx.fillRect(tx + 12, 45, 8, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(tx + 12 - (f === 1 ? 1 : 0), 38, 8 + (f === 2 ? 1 : 0), 9);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(tx + 14, 35 + (f === 0 ? 1 : 0), 4, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx + 15, 36, 2, 5);
    }

    // Tile (160, 32): Pottery Urn
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(176, 50, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.ellipse(176, 44, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    this.tileSheet = canvas;
  }

  // 1b. Normal Maps Sprite Sheet (256x256, 32x32 tiles for Dynamic Lighting)
  private generateNormalSheet() {
    const [canvas, ctx] = this.createCanvas(256, 256);

    // Normal (0, 0): Floor Normal Map (horizontal +Z with paver bevels)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgb(128, 55, 230)';
    ctx.fillRect(1, 1, 14, 2);
    ctx.fillRect(17, 1, 14, 2);
    ctx.fillRect(1, 17, 14, 2);
    ctx.fillRect(17, 17, 14, 2);
    ctx.fillStyle = 'rgb(128, 201, 230)';
    ctx.fillRect(1, 13, 14, 2);
    ctx.fillRect(17, 13, 14, 2);
    ctx.fillRect(1, 29, 14, 2);
    ctx.fillRect(17, 29, 14, 2);
    ctx.fillStyle = 'rgb(55, 128, 230)';
    ctx.fillRect(1, 1, 2, 14);
    ctx.fillRect(17, 1, 2, 14);
    ctx.fillRect(1, 17, 2, 14);
    ctx.fillRect(17, 17, 2, 14);
    ctx.fillStyle = 'rgb(201, 128, 230)';
    ctx.fillRect(13, 1, 2, 14);
    ctx.fillRect(29, 1, 2, 14);
    ctx.fillRect(13, 17, 2, 14);
    ctx.fillRect(29, 17, 2, 14);

    // Normal (32, 0): Cracked Floor Normal Map
    ctx.drawImage(canvas, 0, 0, 32, 32, 32, 0, 32, 32);
    ctx.fillStyle = 'rgb(128, 128, 180)';
    ctx.fillRect(36, 12, 12, 2);
    ctx.fillRect(44, 14, 2, 8);

    // Normal (64, 0): Blood Altar Floor Normal Map
    ctx.drawImage(canvas, 0, 0, 32, 32, 64, 0, 32, 32);
    ctx.strokeStyle = 'rgb(128, 128, 190)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(80, 16, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Normal (96, 0): Wall Top Normal Map (Coping facing up/back)
    ctx.fillStyle = 'rgb(128, 92, 250)';
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = 'rgb(128, 230, 205)';
    ctx.fillRect(96, 28, 32, 4);

    // Normal (128, 0): Wall Front Normal Map (Vertical face facing south +Y)
    ctx.fillStyle = 'rgb(128, 248, 171)';
    ctx.fillRect(128, 0, 32, 32);
    ctx.fillStyle = 'rgb(128, 185, 241)';
    ctx.fillRect(129, 1, 14, 1);
    ctx.fillRect(145, 1, 14, 1);
    ctx.fillRect(129, 11, 6, 1);
    ctx.fillRect(137, 11, 14, 1);
    ctx.fillRect(153, 11, 6, 1);
    ctx.fillRect(129, 21, 14, 1);
    ctx.fillRect(145, 21, 14, 1);
    ctx.fillStyle = 'rgb(128, 252, 153)';
    ctx.fillRect(129, 7, 14, 2);
    ctx.fillRect(145, 7, 14, 2);
    ctx.fillStyle = 'rgb(52, 223, 163)';
    ctx.fillRect(129, 1, 1, 7);
    ctx.fillRect(145, 1, 1, 7);
    ctx.fillStyle = 'rgb(204, 223, 163)';
    ctx.fillRect(142, 1, 1, 7);
    ctx.fillRect(158, 1, 1, 7);

    // Normal (160, 0): Pillar Normal Map (Cylindrical curvature)
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(160, 0, 32, 32);
    ctx.fillStyle = 'rgb(40, 180, 180)';
    ctx.fillRect(164, 2, 7, 28);
    ctx.fillStyle = 'rgb(128, 240, 175)';
    ctx.fillRect(171, 2, 10, 28);
    ctx.fillStyle = 'rgb(216, 180, 180)';
    ctx.fillRect(181, 2, 7, 28);

    this.normalSheet = canvas;
  }

  // 2. Hero Sprite Sheet (256x256, 32x32 frames)
  private generateHeroSheet() {
    const [canvas, ctx] = this.createCanvas(256, 256);
    // Rows: 0=Down, 1=Up, 2=Left, 3=Right
    // Cols: 0=Idle, 1=Walk1, 2=Walk2, 3=Shield, 4=Slash1, 5=Slash2, 6=Spin, 7=Dash
    for (let r = 0; r < 4; r++) {
      const y = r * 32;
      const facing = ['down', 'up', 'left', 'right'][r];

      for (let c = 0; c < 8; c++) {
        const x = c * 32;
        const cx = x + 16;
        const cy = y + 16;

        ctx.save();
        ctx.translate(cx, cy);

        // Shadow
        const shadowWidth = (facing === 'left' || facing === 'right') ? 6 : 8;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 10, shadowWidth, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const walkOffset = c === 1 ? 2 : c === 2 ? -2 : 0;

        // Direction-specific rendering
        if (facing === 'down') {
          // Front View
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-5, 6 + walkOffset, 3, 5);
          ctx.fillRect(2, 6 - walkOffset, 3, 5);
          ctx.fillStyle = PALETTE.clothCrimson;
          ctx.fillRect(-6, -5, 12, 12);
          ctx.fillStyle = PALETTE.ironMid;
          ctx.fillRect(-5, -4, 10, 9);
          ctx.fillStyle = PALETTE.goldMid;
          ctx.fillRect(-1, -2, 2, 6); // Chest emblem
          ctx.fillStyle = PALETTE.skinHero;
          ctx.fillRect(-4, -13, 8, 8); // Face
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(-5, -15, 10, 5); // Helm cap
          ctx.fillRect(-5, -15, 2, 8);
          ctx.fillRect(3, -15, 2, 8);
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-3, -9, 2, 2);
          ctx.fillRect(1, -9, 2, 2);
        } else if (facing === 'up') {
          // Back View (No face skin, spinal ridge on backplate)
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-5, 6 - walkOffset, 3, 5);
          ctx.fillRect(2, 6 + walkOffset, 3, 5);
          ctx.fillStyle = PALETTE.clothCrimson;
          ctx.fillRect(-6, -5, 12, 12);
          ctx.fillStyle = PALETTE.ironMid;
          ctx.fillRect(-5, -4, 10, 9);
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-1, -4, 2, 9); // Spinal ridge
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-4, -8, 8, 3); // Chainmail coif
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(-5, -15, 10, 9); // Solid helmet skull dome
          ctx.fillStyle = PALETTE.ironBright;
          ctx.fillRect(-1, -15, 2, 8); // Rear comb
        } else if (facing === 'left') {
          // Side Profile Left
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-3 + walkOffset, 6, 3, 5);
          ctx.fillRect(1 - walkOffset, 6, 3, 5);
          ctx.fillStyle = PALETTE.clothCrimson;
          ctx.fillRect(-4, -5, 8, 12);
          ctx.fillStyle = PALETTE.ironMid;
          ctx.fillRect(-4, -4, 7, 9);
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(-5, -4, 3, 5); // Leading pauldron
          ctx.fillStyle = PALETTE.skinHero;
          ctx.fillRect(-4, -13, 7, 8);
          ctx.fillRect(-5, -10, 2, 3); // Nose pointing left
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(-5, -15, 8, 5);
          ctx.fillRect(-6, -12, 2, 3); // Visor beak pointing left
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-3, -9, 2, 2);
        } else {
          // Side Profile Right
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(-2 - walkOffset, 6, 3, 5);
          ctx.fillRect(2 + walkOffset, 6, 3, 5);
          ctx.fillStyle = PALETTE.clothCrimson;
          ctx.fillRect(-3, -5, 8, 12);
          ctx.fillStyle = PALETTE.ironMid;
          ctx.fillRect(-2, -4, 7, 9);
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(2, -4, 3, 5); // Leading pauldron
          ctx.fillStyle = PALETTE.skinHero;
          ctx.fillRect(-2, -13, 7, 8);
          ctx.fillRect(3, -10, 2, 3); // Nose pointing right
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(-2, -15, 8, 5);
          ctx.fillRect(4, -12, 2, 3); // Visor beak pointing right
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(1, -9, 2, 2);
        }

        // Action Pose (Shield / Slash / Sheathed)
        if (c === 3) {
          ctx.fillStyle = PALETTE.ironMid;
          ctx.fillRect(-6, -3, 12, 10);
          ctx.strokeStyle = PALETTE.goldMid;
          ctx.strokeRect(-6, -3, 12, 10);
        } else if (c === 4 || c === 5) {
          ctx.fillStyle = PALETTE.ironBright;
          const slashAngle = c === 4 ? -0.4 : 0.6;
          ctx.rotate(slashAngle);
          ctx.fillRect(4, -3, 16, 4);
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 18, -0.6, 0.6);
          ctx.stroke();
        } else {
          ctx.fillStyle = PALETTE.ironLight;
          ctx.fillRect(facing === 'left' ? 3 : 5, 0, 2, 9);
        }

        ctx.restore();
      }
    }

    // Row 4 (y = 128): Damaged Equipment Overlay Sprites (Cracks, Broken chunks, Blood spatter)
    for (let c = 0; c < 4; c++) {
      const x = c * 32;
      const y = 128;
      // Cracked Armor Overlay
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(x + 13, y + 10, 4, 1);
      ctx.fillRect(x + 15, y + 11, 2, 3);
      ctx.fillRect(x + 18, y + 13, 4, 1);
      // Dried blood spatter on armor
      ctx.fillStyle = PALETTE.bloodDark;
      ctx.fillRect(x + 11, y + 12, 3, 3);
      ctx.fillRect(x + 20, y + 15, 2, 2);
      if (c >= 2) {
        // Severe broken armor hole
        ctx.fillStyle = PALETTE.bloodMid;
        ctx.fillRect(x + 14, y + 14, 4, 4);
      }
    }

    this.heroSheet = canvas;
  }

  // 3. Enemy Sprite Sheet (512x256, 32x32 & 48x48 frames)
  private generateEnemySheet() {
    const [canvas, ctx] = this.createCanvas(512, 256);

    // Row 0: True Pixelated Gelatinous Acid Slimes (Sprite Sheet: Idle[0-1], Move[2-3], Windup/Vibrate[4-7])
    // Helper for slime body
    const drawSlimeFrame = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frameType: 'idle' | 'move' | 'vibrate', frameIdx: number) => {
      const wobble = frameType === 'vibrate' ? (frameIdx % 2 === 0 ? 3 : -3) : 0;
      const stretch = frameType === 'move' ? (frameIdx % 2 === 0 ? 1.2 : 0.8) : 1;
      
      // Slime Shadow (Asymmetric Blob)
      ctx.fillStyle = '#0f291e';
      ctx.fillRect(cx - 8 + wobble, cy + 8, 16, 4);
      
      // Gel Body (Irregular Pixelated Blob Shape)
      ctx.fillStyle = PALETTE.slimeAcidDark;
      ctx.fillRect(cx - 9 * stretch, cy - 1, 18 * stretch, 7);
      ctx.fillRect(cx - 7 * stretch, cy - 3, 14 * stretch, 11);
      ctx.fillRect(cx - 5 * stretch, cy - 5, 10 * stretch, 13);
      
      ctx.fillStyle = PALETTE.slimeAcid;
      ctx.fillRect(cx - 7 * stretch, cy - 2, 14 * stretch, 5);
      ctx.fillRect(cx - 5 * stretch, cy - 4, 10 * stretch, 7);
      
      // Core Glint (Pixelated)
      ctx.fillStyle = PALETTE.slimeAcidGlow;
      ctx.fillRect(cx - 3 + wobble, cy - 3, 2, 1);

      // Pixel Eyes (move with animation)
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(cx - 4 + wobble, cy - 2, 2, 2);
      ctx.fillRect(cx + 1 + wobble, cy - 2, 2, 2);
    };

    // Idle
    for (let i = 0; i < 2; i++) drawSlimeFrame(ctx, i * 32 + 16, 16, 'idle', i);
    // Move
    for (let i = 0; i < 2; i++) drawSlimeFrame(ctx, (i + 2) * 32 + 16, 16, 'move', i);
    // Lunge Windup / Vibrate
    for (let i = 0; i < 4; i++) drawSlimeFrame(ctx, i * 32 + 16, 48, 'vibrate', i);

    // Row 1 (y = 32): Distinctly Bipedal Goblin Warriors
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      const cy = 48;
      const step = i % 2 === 0 ? 1 : -1;

      // Bipedal Legs & Boots (standing on two legs)
      ctx.fillStyle = PALETTE.goblinGreenDark;
      ctx.fillRect(cx - 5, cy + 4, 3, 6);
      ctx.fillRect(cx + 2, cy + 4, 3, 6);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(cx - 6, cy + 9, 4, 3);
      ctx.fillRect(cx + 2, cy + 9, 4, 3);

      // Tattered Leather Tunic / Body
      ctx.fillStyle = PALETTE.clothLeather;
      ctx.fillRect(cx - 6, cy - 3, 12, 8);
      ctx.fillStyle = '#2d1608';
      ctx.fillRect(cx - 5, cy - 2, 10, 6);

      // Bipedal Goblin Head with Large Pointy Ears
      ctx.fillStyle = PALETTE.goblinGreen;
      ctx.fillRect(cx - 5, cy - 12, 10, 9);
      // Pointy Ears sticking out sideways
      ctx.fillRect(cx - 9, cy - 11, 4, 3);
      ctx.fillRect(cx + 5, cy - 11, 4, 3);

      // Glowing Red Eyes & Snout
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 3, cy - 9, 2, 2);
      ctx.fillRect(cx + 1, cy - 9, 2, 2);
      ctx.fillStyle = PALETTE.goblinGreenDark;
      ctx.fillRect(cx - 1, cy - 7, 2, 2); // Snout

      // Weapon (Dagger / Spear in hand)
      ctx.fillStyle = PALETTE.ironMid;
      ctx.fillRect(cx + 6, cy - 4 + step, 2, 10);
      ctx.fillStyle = PALETTE.ironBright;
      ctx.fillRect(cx + 6, cy - 6 + step, 2, 3);
    }

    // Row 2 (y = 64): Crypt Skeletons
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      const cy = 80;
      ctx.fillStyle = PALETTE.boneDark;
      ctx.fillRect(cx - 4, cy + 6, 3, 7);
      ctx.fillRect(cx + 2, cy + 6, 3, 7);
      ctx.fillStyle = PALETTE.boneWhite;
      ctx.fillRect(cx - 5, cy - 3, 10, 2);
      ctx.fillRect(cx - 4, cy, 8, 2);
      ctx.fillRect(cx - 3, cy + 3, 6, 2);
      ctx.fillStyle = PALETTE.boneWhite;
      ctx.fillRect(cx - 5, cy - 13, 10, 9);
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(cx - 4, cy - 10, 3, 3);
      ctx.fillRect(cx + 1, cy - 10, 3, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 3, cy - 9, 1, 1);
      ctx.fillRect(cx + 2, cy - 9, 1, 1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx + 6, cy - 6, 3, 12);
    }

    // Row 3 (y = 96): Cultists & Necromancers
    for (let i = 0; i < 4; i++) {
      const cx = i * 32 + 16;
      const cy = 112;
      const robeColor = i >= 2 ? '#31103f' : '#6b1115';
      ctx.fillStyle = robeColor;
      ctx.fillRect(cx - 7, cy - 5, 14, 18);
      ctx.fillRect(cx - 6, cy - 14, 12, 10);
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(cx - 4, cy - 11, 8, 6);
      ctx.fillStyle = i >= 2 ? '#38bdf8' : '#fbbf24';
      ctx.fillRect(cx - 2, cy - 9, 2, 2);
      ctx.fillRect(cx + 1, cy - 9, 2, 2);
      // Staff
      ctx.fillStyle = '#422006';
      ctx.fillRect(cx + 7, cy - 14, 2, 24);
      ctx.fillStyle = i >= 2 ? '#38bdf8' : '#dc2626';
      ctx.fillRect(cx + 5, cy - 18, 6, 6);
    }

    // Row 4 (y = 128): Flesh Abominations (Larger 48x48)
    for (let i = 0; i < 3; i++) {
      const cx = i * 64 + 32;
      const cy = 160;
      ctx.fillStyle = '#5c4d3c';
      ctx.fillRect(cx - 16, cy - 10, 32, 26);
      ctx.fillStyle = '#3f352b';
      ctx.fillRect(cx - 10, cy - 22, 20, 14);
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(cx - 8, cy - 4, 16, 2);
      // Meat Cleaver
      ctx.fillStyle = PALETTE.ironDark;
      ctx.fillRect(cx + 16, cy - 12, 8, 22);
      ctx.fillStyle = PALETTE.bloodBright;
      ctx.fillRect(cx + 18, cy - 6, 5, 12);
    }

    // Row 5 (y = 192): Boss Malakor the Flayed (Giant 64x64)
    const bx = 48;
    const by = 224;
    ctx.fillStyle = '#1a0505';
    ctx.fillRect(bx - 36, by - 30, 22, 26);
    ctx.fillRect(bx + 14, by - 30, 22, 26);
    ctx.fillStyle = PALETTE.bloodDark;
    ctx.fillRect(bx - 32, by - 26, 16, 20);
    ctx.fillRect(bx + 16, by - 26, 16, 20);
    ctx.fillStyle = '#4a0808';
    ctx.fillRect(bx - 16, by - 14, 32, 26);
    ctx.fillStyle = PALETTE.ironDark;
    ctx.fillRect(bx - 20, by - 16, 6, 10);
    ctx.fillRect(bx + 14, by - 16, 6, 10);
    ctx.fillStyle = '#2d0808';
    ctx.fillRect(bx - 12, by - 28, 24, 15);
    ctx.fillStyle = PALETTE.goldDark;
    ctx.fillRect(bx - 14, by - 34, 4, 8);
    ctx.fillRect(bx + 10, by - 34, 4, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(bx - 7, by - 22, 4, 3);
    ctx.fillRect(bx + 3, by - 22, 4, 3);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(bx + 18, by - 26, 6, 38);
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.fillRect(bx + 20, by - 24, 2, 34);

    this.enemySheet = canvas;
  }

  // 4. Gore & Severed Limbs Sprite Sheet (256x128)
  private generateGoreSheet() {
    const [canvas, ctx] = this.createCanvas(256, 128);

    // Severed Heads: Goblin, Skeleton, Cultist, Demon
    const heads = [
      { x: 16, y: 16, c: PALETTE.goblinGreen },
      { x: 48, y: 16, c: PALETTE.boneWhite },
      { x: 80, y: 16, c: PALETTE.skinHero },
      { x: 112, y: 16, c: PALETTE.demonRed },
    ];
    heads.forEach((h) => {
      ctx.fillStyle = h.c;
      ctx.fillRect(h.x - 5, h.y - 5, 10, 10);
      ctx.fillStyle = PALETTE.bloodBright;
      ctx.fillRect(h.x - 4, h.y + 4, 8, 3); // Neck stump
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(h.x - 3, h.y - 2, 2, 2);
      ctx.fillRect(h.x + 1, h.y - 2, 2, 2);
    });

    // Severed Arms & Bones
    ctx.fillStyle = PALETTE.boneWhite;
    ctx.fillRect(144, 10, 4, 14); // Arm bone
    ctx.fillStyle = PALETTE.bloodBright;
    ctx.fillRect(143, 14, 6, 4);

    // Ribcage
    ctx.fillStyle = PALETTE.boneWhite;
    ctx.fillRect(170, 10, 14, 3);
    ctx.fillRect(172, 14, 10, 3);
    ctx.fillRect(174, 18, 6, 3);
    ctx.fillStyle = PALETTE.bloodDark;
    ctx.fillRect(176, 10, 2, 12);

    // 8 Blood Splatter Decals (Row 1, y = 48)
    for (let s = 0; s < 8; s++) {
      const sx = s * 32 + 16;
      const sy = 48;
      const rad = 4 + (s % 4) * 2;
      ctx.fillStyle = s % 2 === 0 ? PALETTE.bloodBright : PALETTE.bloodDark;
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
      // Droplets around
      ctx.fillRect(sx - rad - 2, sy - 1, 2, 2);
      ctx.fillRect(sx + rad + 1, sy + 2, 2, 2);
      ctx.fillRect(sx, sy - rad - 3, 2, 2);
      ctx.fillRect(sx + 2, sy + rad + 1, 2, 2);
    }

    // Bloody Footprint Decals (Row 2, y = 80)
    ctx.fillStyle = PALETTE.bloodDark;
    ctx.fillRect(16, 80, 4, 7); // Heel & foot
    ctx.fillRect(18, 87, 2, 2);
    ctx.fillRect(32, 80, 4, 7);
    ctx.fillRect(30, 87, 2, 2);

    this.goreSheet = canvas;
  }

  // 5. Items & Equipment Icons Sprite Sheet (256x128, 24x24 icons)
  private generateItemsSheet() {
    const [canvas, ctx] = this.createCanvas(256, 128);

    // Row 0: Swords
    const swords = [PALETTE.ironDark, PALETTE.ironLight, '#334155', '#b91c1c', '#7f1d1d'];
    swords.forEach((color, i) => {
      const ix = i * 24 + 12;
      const iy = 12;
      ctx.fillStyle = color;
      ctx.fillRect(ix - 1, iy - 8, 3, 14); // Blade
      ctx.fillStyle = PALETTE.goldMid;
      ctx.fillRect(ix - 4, iy + 4, 9, 2);  // Crossguard
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(ix, iy + 6, 2, 4);     // Hilt
    });

    // Row 1: Shields
    const shields = [PALETTE.woodMid, PALETTE.ironMid, '#1e293b', '#450a0a', '#0f172a'];
    shields.forEach((color, i) => {
      const ix = i * 24 + 12;
      const iy = 36;
      ctx.fillStyle = color;
      ctx.fillRect(ix - 6, iy - 6, 12, 13);
      ctx.strokeStyle = PALETTE.goldMid;
      ctx.strokeRect(ix - 6, iy - 6, 12, 13);
    });

    // Row 2: Armors
    const armors = [PALETTE.clothLeather, PALETTE.ironDark, PALETTE.ironLight, '#18181b', '#991b1b'];
    armors.forEach((color, i) => {
      const ix = i * 24 + 12;
      const iy = 60;
      ctx.fillStyle = color;
      ctx.fillRect(ix - 6, iy - 6, 12, 12);
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(ix - 5, iy - 5, 10, 3);
    });

    // Potions & Gold
    // Red Health Potion
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(144 - 4, 12 - 2, 8, 8);
    ctx.fillStyle = PALETTE.ironBright;
    ctx.fillRect(144 - 2, 12 - 6, 4, 4);
    // Gold Pouch
    ctx.fillStyle = PALETTE.goldBright;
    ctx.beginPath();
    ctx.arc(168, 12, 5, 0, Math.PI * 2);
    ctx.fill();

    this.itemsSheet = canvas;
  }
}

export const spriteSheets = new SpriteSheetManager();
