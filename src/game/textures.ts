/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Direction, EnemyType, EquipmentItem, Player } from './types';
import { spriteSheets } from './spritesheet';

// Palette Constants - 16-Bit Zelda 3 & Diablo Dark Fantasy
export const PALETTE = {
  voidBlack: '#050405',
  dungeonDark: '#0b0e14',

  // Slate Crypt Floor (Cold Blue-Gray Granite Pavers - distinct from walls)
  floorBase: '#101620',
  floorPaverDark: '#192332',
  floorPaverMid: '#253448',
  floorPaverLight: '#3a4e69',
  floorPaverHighlight: '#556f94',
  floorMortar: '#090e15',
  floorMoss: '#1b312b',

  // Legacy stone aliases
  stoneDark: '#192332',
  stoneMid: '#253448',
  stoneLight: '#3a4e69',
  stoneHighlight: '#556f94',

  // Gothic Obsidian Ashlar Masonry Walls (Warm Soot-Iron and Dark Ashlar - distinct from floor)
  wallBase: '#150c10',
  wallFront: '#201219',
  wallBrickDark: '#2b1922',
  wallBrickMid: '#3e2432',
  wallBrickLight: '#573447',
  wallBrickHighlight: '#754860',
  wallMortar: '#0c0609',
  wallTop: '#37202b',
  wallTopHighlight: '#5f3c4c',
  wallCastShadow: '#080305',

  bloodDark: '#4a0505',
  bloodMid: '#8b0f0f',
  bloodBright: '#c51b1b',
  bloodGore: '#2d0404',
  goldDark: '#784e10',
  goldMid: '#c68d24',
  goldBright: '#f3c448',
  woodDark: '#2a1708',
  woodMid: '#5c3818',
  woodLight: '#8c5828',
  ironDark: '#2b303c',
  ironMid: '#51596c',
  ironLight: '#8893aa',
  ironBright: '#cbd5e1',
  clothLeather: '#4e2a14',
  clothCrimson: '#7a1c22',
  clothGold: '#8a6519',
  skinHero: '#d4a373',
  skinHeroShadow: '#9c6644',
  goblinGreen: '#386641',
  goblinGreenDark: '#1b4332',
  slimeAcid: '#40916c',
  slimeAcidDark: '#1b4332',
  slimeAcidGlow: '#74c69d',
  slimeToxic: '#7209b7',
  slimeToxicGlow: '#b5179e',
  boneWhite: '#e9ecef',
  boneDark: '#adb5bd',
  demonRed: '#9e2a2b',
  demonHorn: '#33272a',
};

// 2.5D Dynamic Surface Normal Vectors & Heights per Tile Type
export function getTileNormal(tileType: number): { nx: number; ny: number; nz: number; zHeight: number } {
  switch (tileType) {
    case 3: // Wall Front: vertical masonry face facing south (+Y) toward player/camera
      return { nx: 0, ny: 0.94, nz: 0.34, zHeight: 14 };
    case 2: // Wall Top: horizontal coping face facing up and slightly back (-Y)
      return { nx: 0, ny: -0.28, nz: 0.96, zHeight: 28 };
    case 4: // Pillar: cylindrical column facing south
      return { nx: 0, ny: 0.85, nz: 0.40, zHeight: 20 };
    case 6: // Stairs: stepping downward
      return { nx: 0, ny: -0.45, nz: 0.89, zHeight: 6 };
    case 1: // Floor: horizontal plane facing straight up (+Z)
    case 7: // Ritual floor
    default:
      return { nx: 0, ny: 0, nz: 1.0, zHeight: 0 };
  }
}

// Offscreen canvases cache for lightning-fast rendering
class TextureAtlas {
  private cache: Map<string, HTMLCanvasElement> = new Map();
  private normalDataCache: Map<string, Float32Array> = new Map();
  private scratchCanvas: HTMLCanvasElement | null = null;
  private scratchCtx: CanvasRenderingContext2D | null = null;

  private createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return [canvas, ctx];
  }

  // Pre-generate all static 16-bit textures
  public init() {
    spriteSheets.generateAll();
    this.generateTiles();
    this.generateNormalMaps();
    this.generateDecorations();

    this.scratchCanvas = document.createElement('canvas');
    this.scratchCanvas.width = 72;
    this.scratchCanvas.height = 72;
    this.scratchCtx = this.scratchCanvas.getContext('2d')!;
    this.scratchCtx.imageSmoothingEnabled = false;
  }

  public get(key: string): HTMLCanvasElement | undefined {
    return this.cache.get(key);
  }

  private storeNormalData(key: string, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, 32, 32);
    const data = imgData.data;
    const normals = new Float32Array(32 * 32 * 3);
    for (let i = 0; i < 32 * 32; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      normals[i * 3] = (r - 128) / 127;
      normals[i * 3 + 1] = (g - 128) / 127;
      normals[i * 3 + 2] = (b - 128) / 127;
    }
    this.normalDataCache.set(key, normals);
  }

  public getNormalAt(key: string, localX: number, localY: number, target: { nx: number; ny: number; nz: number }) {
    const normals = this.normalDataCache.get(key);
    const lx = Math.max(0, Math.min(31, Math.floor(localX)));
    const ly = Math.max(0, Math.min(31, Math.floor(localY)));
    if (!normals) {
      target.nx = 0;
      target.ny = 0;
      target.nz = 1;
      return;
    }
    const idx = (ly * 32 + lx) * 3;
    target.nx = normals[idx];
    target.ny = normals[idx + 1];
    target.nz = normals[idx + 2];
  }

  // Generate 2.5D Zelda 3 Tiles (32x32 pixels each) with distinct material palettes
  private generateTiles() {
    // 1. Dungeon Floor: Cold Slate-Granite Pavers (Blue-Gray Hue)
    const [floor, fCtx] = this.createCanvas(32, 32);
    fCtx.fillStyle = PALETTE.floorBase;
    fCtx.fillRect(0, 0, 32, 32);
    // Draw 4 distinct slate pavers
    fCtx.fillStyle = PALETTE.floorPaverMid;
    fCtx.fillRect(1, 1, 14, 14);
    fCtx.fillRect(17, 1, 14, 14);
    fCtx.fillRect(1, 17, 14, 14);
    fCtx.fillRect(17, 17, 14, 14);
    // Beveled edges & chisel highlights (Cold slate)
    fCtx.fillStyle = PALETTE.floorPaverHighlight;
    fCtx.fillRect(1, 1, 13, 2);
    fCtx.fillRect(1, 1, 2, 13);
    fCtx.fillRect(17, 1, 13, 2);
    fCtx.fillRect(17, 1, 2, 13);
    fCtx.fillRect(1, 17, 13, 2);
    fCtx.fillRect(1, 17, 2, 13);
    fCtx.fillRect(17, 17, 13, 2);
    fCtx.fillRect(17, 17, 2, 13);
    // Dark bottom shadows on pavers
    fCtx.fillStyle = PALETTE.floorPaverDark;
    fCtx.fillRect(1, 13, 14, 2);
    fCtx.fillRect(13, 1, 2, 14);
    fCtx.fillRect(17, 13, 14, 2);
    fCtx.fillRect(29, 1, 2, 14);
    fCtx.fillRect(1, 29, 14, 2);
    fCtx.fillRect(13, 17, 2, 14);
    fCtx.fillRect(17, 29, 14, 2);
    fCtx.fillRect(29, 17, 2, 14);
    // Mortar recesses & slate fissures
    fCtx.fillStyle = PALETTE.floorMortar;
    fCtx.fillRect(0, 15, 32, 2);
    fCtx.fillRect(15, 0, 2, 32);
    fCtx.fillStyle = PALETTE.voidBlack;
    fCtx.fillRect(5, 5, 5, 1);
    fCtx.fillRect(9, 6, 2, 2);
    fCtx.fillRect(21, 21, 6, 1);
    // Damp slate moss accents
    fCtx.fillStyle = PALETTE.floorMoss;
    fCtx.fillRect(14, 14, 3, 2);
    fCtx.fillRect(2, 16, 2, 2);
    this.cache.set('tile_floor', floor);

    // 2. Blood Altar Floor (Runic crimson ritual stone)
    const [altarFloor, afCtx] = this.createCanvas(32, 32);
    afCtx.drawImage(floor, 0, 0);
    // Bloodstone center wash
    afCtx.fillStyle = 'rgba(74, 5, 5, 0.45)';
    afCtx.fillRect(2, 2, 28, 28);
    afCtx.strokeStyle = PALETTE.bloodMid;
    afCtx.lineWidth = 1;
    afCtx.beginPath();
    afCtx.arc(16, 16, 11, 0, Math.PI * 2);
    afCtx.stroke();
    // Inner pentagram runes
    afCtx.fillStyle = PALETTE.bloodBright;
    afCtx.fillRect(15, 6, 2, 3);
    afCtx.fillRect(24, 14, 3, 2);
    afCtx.fillRect(21, 22, 2, 3);
    afCtx.fillRect(9, 22, 2, 3);
    afCtx.fillRect(5, 14, 3, 2);
    this.cache.set('tile_ritual_floor', altarFloor);

    // 3. Zelda 3 2.5D North Wall Top Coping (32x32, Heavy Granite/Ironstone Cap)
    const [wallTop, wtCtx] = this.createCanvas(32, 32);
    wtCtx.fillStyle = PALETTE.wallTop;
    wtCtx.fillRect(0, 0, 32, 32);
    wtCtx.fillStyle = PALETTE.wallTopHighlight;
    wtCtx.fillRect(0, 0, 32, 3);
    wtCtx.fillStyle = PALETTE.wallBrickLight;
    wtCtx.fillRect(0, 3, 32, 5);
    // Vertical coping stone joints
    wtCtx.fillStyle = PALETTE.wallMortar;
    wtCtx.fillRect(10, 0, 2, 27);
    wtCtx.fillRect(22, 0, 2, 27);
    // Underside deep drop shadow cast on wall/floor below
    wtCtx.fillStyle = PALETTE.wallCastShadow;
    wtCtx.fillRect(0, 27, 32, 5);
    this.cache.set('tile_wall_top', wallTop);

    // 4. Zelda 3 2.5D Wall Front (Facing camera with Gothic Obsidian Ashlar Bricks)
    const [wallFront, wfCtx] = this.createCanvas(32, 32);
    wfCtx.fillStyle = PALETTE.wallBase;
    wfCtx.fillRect(0, 0, 32, 32);
    // Row 1 ashlar bricks
    wfCtx.fillStyle = PALETTE.wallBrickMid;
    wfCtx.fillRect(1, 1, 14, 8);
    wfCtx.fillRect(17, 1, 14, 8);
    // Row 2 ashlar bricks (staggered running bond)
    wfCtx.fillRect(1, 11, 6, 8);
    wfCtx.fillRect(9, 11, 14, 8);
    wfCtx.fillRect(25, 11, 6, 8);
    // Row 3 ashlar bricks
    wfCtx.fillRect(1, 21, 14, 8);
    wfCtx.fillRect(17, 21, 14, 8);
    // Chiseled brick top bevels (Gothic ashlar highlights)
    wfCtx.fillStyle = PALETTE.wallBrickHighlight;
    wfCtx.fillRect(1, 1, 14, 1);
    wfCtx.fillRect(17, 1, 14, 1);
    wfCtx.fillRect(1, 11, 6, 1);
    wfCtx.fillRect(9, 11, 14, 1);
    wfCtx.fillRect(25, 11, 6, 1);
    wfCtx.fillRect(1, 21, 14, 1);
    wfCtx.fillRect(17, 21, 14, 1);
    // Chipped brick corners
    wfCtx.fillStyle = PALETTE.wallBrickDark;
    wfCtx.fillRect(1, 7, 14, 2);
    wfCtx.fillRect(17, 7, 14, 2);
    wfCtx.fillRect(9, 17, 14, 2);
    // Deep soot mortar lines
    wfCtx.fillStyle = PALETTE.wallMortar;
    wfCtx.fillRect(0, 0, 32, 1);
    wfCtx.fillRect(0, 9, 32, 2);
    wfCtx.fillRect(0, 19, 32, 2);
    wfCtx.fillRect(0, 29, 32, 3);
    wfCtx.fillRect(15, 0, 2, 10);
    wfCtx.fillRect(7, 10, 2, 10);
    wfCtx.fillRect(23, 10, 2, 10);
    wfCtx.fillRect(15, 20, 2, 10);
    this.cache.set('tile_wall_front', wallFront);

    // 5. Pillar Column (32x32)
    const [pillar, pCtx] = this.createCanvas(32, 32);
    pCtx.drawImage(floor, 0, 0);
    pCtx.fillStyle = PALETTE.wallBase;
    pCtx.fillRect(4, 2, 24, 28);
    pCtx.fillStyle = PALETTE.wallBrickMid;
    pCtx.fillRect(6, 4, 20, 24);
    pCtx.fillStyle = PALETTE.wallBrickLight;
    pCtx.fillRect(8, 6, 8, 20);
    pCtx.fillStyle = PALETTE.wallBrickHighlight;
    pCtx.fillRect(8, 6, 3, 20);
    pCtx.fillStyle = PALETTE.wallMortar;
    pCtx.fillRect(22, 6, 4, 20);
    this.cache.set('tile_pillar', pillar);

    // 6. Dungeon Stairs Down (Entrance to deeper levels with prominent stone border & dark abyss gradient)
    const [stairs, sCtx] = this.createCanvas(32, 32);
    // Base pitch black void
    sCtx.fillStyle = PALETTE.voidBlack;
    sCtx.fillRect(0, 0, 32, 32);

    // Outer masonry frame / threshold border (3px stone coping)
    sCtx.fillStyle = '#1e293b'; // Slate border
    sCtx.fillRect(0, 0, 32, 32);

    // Chiseled highlights on outer frame (top & left outer rim)
    sCtx.fillStyle = '#64748b';
    sCtx.fillRect(0, 0, 32, 2);
    sCtx.fillRect(0, 0, 2, 32);
    sCtx.fillStyle = '#94a3b8';
    sCtx.fillRect(1, 1, 30, 1);
    sCtx.fillRect(1, 1, 1, 30);

    // Dark shadow crevice on inside of stone frame (bottom & right)
    sCtx.fillStyle = '#090d16';
    sCtx.fillRect(0, 30, 32, 2);
    sCtx.fillRect(30, 0, 2, 32);

    // 4 Iron/Bronze Corner Reinforcement Brackets with rivets
    const corners = [
      { x: 0, y: 0 },
      { x: 28, y: 0 },
      { x: 0, y: 28 },
      { x: 28, y: 28 },
    ];
    for (const c of corners) {
      sCtx.fillStyle = '#334155'; // Dark iron bracket
      sCtx.fillRect(c.x, c.y, 4, 4);
      sCtx.fillStyle = '#d97706'; // Bronze/gold rivet in center
      sCtx.fillRect(c.x + 1, c.y + 1, 2, 2);
    }

    // Interior Stairwell Pit (descending flight from y=3 to y=29, x=3 to 28)
    // Step 1 (top): Cold slate paver
    sCtx.fillStyle = PALETTE.floorPaverLight;
    sCtx.fillRect(3, 3, 26, 6);
    sCtx.fillStyle = '#93c5fd'; // Sharp chisel step lip
    sCtx.fillRect(3, 3, 26, 1);

    // Step 2: Mid slate
    sCtx.fillStyle = PALETTE.floorPaverMid;
    sCtx.fillRect(3, 9, 26, 6);
    sCtx.fillStyle = PALETTE.floorPaverHighlight;
    sCtx.fillRect(3, 9, 26, 1);
    sCtx.fillStyle = PALETTE.floorMortar;
    sCtx.fillRect(3, 14, 26, 1); // Riser shadow

    // Step 3: Dark slate
    sCtx.fillStyle = PALETTE.floorPaverDark;
    sCtx.fillRect(3, 15, 26, 6);
    sCtx.fillStyle = PALETTE.floorPaverMid;
    sCtx.fillRect(3, 15, 26, 1);
    sCtx.fillStyle = '#06090e';
    sCtx.fillRect(3, 20, 26, 1);

    // Step 4: Deep abyss floor
    sCtx.fillStyle = '#0c1017';
    sCtx.fillRect(3, 21, 26, 8);
    sCtx.fillStyle = PALETTE.floorPaverDark;
    sCtx.fillRect(3, 21, 26, 1);

    // Side stone curbs / guide rails
    sCtx.fillStyle = '#1e293b';
    sCtx.fillRect(3, 3, 2, 26);
    sCtx.fillRect(27, 3, 2, 26);
    sCtx.fillStyle = '#334155';
    sCtx.fillRect(4, 3, 1, 26);
    sCtx.fillRect(27, 3, 1, 26);

    // The dark gradient on the lower side of the stairs (descending into the deep black void)
    const stairGrad = sCtx.createLinearGradient(0, 11, 0, 29);
    stairGrad.addColorStop(0, 'rgba(3, 2, 5, 0.0)');
    stairGrad.addColorStop(0.35, 'rgba(3, 2, 5, 0.45)');
    stairGrad.addColorStop(0.7, 'rgba(3, 2, 5, 0.85)');
    stairGrad.addColorStop(1, 'rgba(2, 1, 3, 0.98)');
    sCtx.fillStyle = stairGrad;
    sCtx.fillRect(3, 11, 26, 18);

    // Carved glowing descent rune / chevron at the entrance threshold
    sCtx.fillStyle = '#f59e0b';
    sCtx.fillRect(15, 4, 2, 1);
    sCtx.fillRect(14, 5, 4, 1);
    sCtx.fillRect(15, 6, 2, 1);

    this.cache.set('tile_stairs', stairs);
  }

  // Pre-generate standard Tangent-Space RGB Normal Maps for dynamic lighting (R=Nx, G=Ny, B=Nz) matching textures 1:1
  private generateNormalMaps() {
    // 1. Floor Normal Map: matches tile_floor geometry precisely
    const [floorNorm, fnCtx] = this.createCanvas(32, 32);
    fnCtx.fillStyle = 'rgb(128, 128, 255)'; // Base horizontal +Z normal
    fnCtx.fillRect(0, 0, 32, 32);

    // Mortar recesses
    fnCtx.fillStyle = 'rgb(128, 128, 200)';
    fnCtx.fillRect(0, 15, 32, 2);
    fnCtx.fillRect(15, 0, 2, 32);

    // 4 Pavers bevels matching tile_floor exactly
    const pavers = [
      { x: 1, y: 1, w: 14, h: 14 },
      { x: 17, y: 1, w: 14, h: 14 },
      { x: 1, y: 17, w: 14, h: 14 },
      { x: 17, y: 17, w: 14, h: 14 },
    ];
    for (const p of pavers) {
      // Top bevel
      fnCtx.fillStyle = 'rgb(128, 77, 204)';
      fnCtx.fillRect(p.x, p.y, p.w, 2);
      // Left bevel
      fnCtx.fillStyle = 'rgb(51, 128, 204)';
      fnCtx.fillRect(p.x, p.y, 2, p.h);
      // Bottom shadow
      fnCtx.fillStyle = 'rgb(128, 179, 204)';
      fnCtx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
      // Right shadow
      fnCtx.fillStyle = 'rgb(204, 128, 204)';
      fnCtx.fillRect(p.x + p.w - 2, p.y, 2, p.h);
    }
    this.cache.set('tile_floor_normal', floorNorm);
    this.storeNormalData('tile_floor_normal', floorNorm);

    // 2. Wall Front Normal Map: matches tile_wall_front geometry precisely (3 rows of staggered ashlar bricks)
    const [wallFrontNorm, wfnCtx] = this.createCanvas(32, 32);
    wfnCtx.fillStyle = 'rgb(128, 242, 178)'; // Base wall face (+Y)
    wfnCtx.fillRect(0, 0, 32, 32);

    // Mortar grooves
    wfnCtx.fillStyle = 'rgb(128, 192, 219)';
    wfnCtx.fillRect(0, 0, 32, 1);
    wfnCtx.fillRect(0, 9, 32, 2);
    wfnCtx.fillRect(0, 19, 32, 2);
    wfnCtx.fillRect(0, 29, 32, 3);
    wfnCtx.fillRect(15, 0, 2, 10);
    wfnCtx.fillRect(7, 10, 2, 10);
    wfnCtx.fillRect(23, 10, 2, 10);
    wfnCtx.fillRect(15, 20, 2, 10);

    const bricks = [
      // Row 1
      { x: 1, y: 1, w: 14, h: 8 },
      { x: 17, y: 1, w: 14, h: 8 },
      // Row 2
      { x: 1, y: 11, w: 6, h: 8 },
      { x: 9, y: 11, w: 14, h: 8 },
      { x: 25, y: 11, w: 6, h: 8 },
      // Row 3
      { x: 1, y: 21, w: 14, h: 8 },
      { x: 17, y: 21, w: 14, h: 8 },
    ];
    for (const b of bricks) {
      // Top bevel
      wfnCtx.fillStyle = 'rgb(128, 179, 230)';
      wfnCtx.fillRect(b.x, b.y, b.w, 1);
      // Bottom overhang
      wfnCtx.fillStyle = 'rgb(128, 249, 166)';
      wfnCtx.fillRect(b.x, b.y + b.h - 2, b.w, 2);
      // Left bevel
      wfnCtx.fillStyle = 'rgb(64, 230, 173)';
      wfnCtx.fillRect(b.x, b.y, 1, b.h - 1);
      // Right bevel
      wfnCtx.fillStyle = 'rgb(192, 230, 173)';
      wfnCtx.fillRect(b.x + b.w - 1, b.y, 1, b.h - 1);
    }
    this.cache.set('tile_wall_front_normal', wallFrontNorm);
    this.storeNormalData('tile_wall_front_normal', wallFrontNorm);

    // 3. Wall Top Normal Map: matches tile_wall_top coping surface & vertical joints
    const [wallTopNorm, wtnCtx] = this.createCanvas(32, 32);
    wtnCtx.fillStyle = 'rgb(128, 89, 249)'; // Coping top
    wtnCtx.fillRect(0, 0, 32, 32);

    // Vertical coping stone joints
    wtnCtx.fillStyle = 'rgb(100, 89, 230)';
    wtnCtx.fillRect(10, 0, 2, 27);
    wtnCtx.fillRect(22, 0, 2, 27);

    // Front lip overhang at bottom
    wtnCtx.fillStyle = 'rgb(128, 230, 204)';
    wtnCtx.fillRect(0, 27, 32, 5);
    this.cache.set('tile_wall_top_normal', wallTopNorm);
    this.storeNormalData('tile_wall_top_normal', wallTopNorm);

    // 4. Pillar Normal Map: matches tile_pillar column geometry
    const [pillarNorm, pnCtx] = this.createCanvas(32, 32);
    pnCtx.fillStyle = 'rgb(128, 128, 255)';
    pnCtx.fillRect(0, 0, 32, 32);
    pnCtx.fillStyle = 'rgb(51, 179, 204)'; // Left cylinder curvature
    pnCtx.fillRect(4, 2, 6, 28);
    pnCtx.fillStyle = 'rgb(128, 242, 178)'; // Center column face
    pnCtx.fillRect(10, 2, 12, 28);
    pnCtx.fillStyle = 'rgb(204, 179, 204)'; // Right cylinder curvature
    pnCtx.fillRect(22, 2, 6, 28);
    this.cache.set('tile_pillar_normal', pillarNorm);
    this.storeNormalData('tile_pillar_normal', pillarNorm);

    // 5. Stairs Normal Map: Descending slope (Ny=-0.45, Nz=0.89) with vertical risers (Ny=0.92, Nz=0.38) and stone side curbs
    const [stairsNorm, snCtx] = this.createCanvas(32, 32);
    // Base slope: Ny=-0.45, Nz=0.89 -> RGB(128, 71, 241)
    snCtx.fillStyle = 'rgb(128, 71, 241)';
    snCtx.fillRect(0, 0, 32, 32);
    // Left curb facing right (+X): Nx=0.7, Nz=0.7 -> RGB(217, 128, 217)
    snCtx.fillStyle = 'rgb(217, 128, 217)';
    snCtx.fillRect(0, 0, 4, 32);
    // Right curb facing left (-X): Nx=-0.7, Nz=0.7 -> RGB(39, 128, 217)
    snCtx.fillStyle = 'rgb(39, 128, 217)';
    snCtx.fillRect(28, 0, 4, 32);
    // Risers (facing south +Y): Ny=0.92, Nz=0.38 -> RGB(128, 245, 176)
    snCtx.fillStyle = 'rgb(128, 245, 176)';
    snCtx.fillRect(4, 8, 24, 2);
    snCtx.fillRect(4, 14, 24, 2);
    snCtx.fillRect(4, 20, 24, 2);
    snCtx.fillRect(4, 26, 24, 2);
    this.cache.set('tile_stairs_normal', stairsNorm);
    this.storeNormalData('tile_stairs_normal', stairsNorm);
  }

  private generateDecorations() {
    // 1. Treasure Chest (Closed)
    const [chest, cCtx] = this.createCanvas(24, 20);
    cCtx.fillStyle = PALETTE.woodDark;
    cCtx.fillRect(2, 4, 20, 14);
    cCtx.fillStyle = PALETTE.woodMid;
    cCtx.fillRect(4, 6, 16, 10);
    // Gold metal brackets
    cCtx.fillStyle = PALETTE.goldMid;
    cCtx.fillRect(2, 4, 4, 14);
    cCtx.fillRect(18, 4, 4, 14);
    cCtx.fillRect(2, 9, 20, 3);
    // Lock keyhole
    cCtx.fillStyle = PALETTE.goldBright;
    cCtx.fillRect(10, 8, 4, 5);
    cCtx.fillStyle = PALETTE.voidBlack;
    cCtx.fillRect(11, 10, 2, 2);
    this.cache.set('chest_closed', chest);

    // 2. Treasure Chest (Opened)
    const [chestOpen, coCtx] = this.createCanvas(24, 24);
    coCtx.fillStyle = PALETTE.woodDark;
    coCtx.fillRect(2, 8, 20, 14);
    coCtx.fillStyle = PALETTE.woodMid;
    coCtx.fillRect(4, 10, 16, 10);
    // Open Lid
    coCtx.fillStyle = PALETTE.woodLight;
    coCtx.fillRect(2, 0, 20, 8);
    coCtx.fillStyle = PALETTE.goldBright;
    coCtx.fillRect(8, 6, 8, 8); // Gold treasure glowing inside!
    this.cache.set('chest_open', chestOpen);

    // 3. Torch Sconce (with animated flicker frames 0, 1, 2)
    for (let f = 0; f < 3; f++) {
      const [torch, tCtx] = this.createCanvas(16, 24);
      // Bracket
      tCtx.fillStyle = PALETTE.ironDark;
      tCtx.fillRect(6, 14, 4, 8);
      tCtx.fillRect(4, 12, 8, 3);
      // Fire
      tCtx.fillStyle = '#dc2626';
      tCtx.fillRect(5 - (f === 1 ? 1 : 0), 4, 6 + (f === 2 ? 1 : 0), 8);
      tCtx.fillStyle = '#f59e0b';
      tCtx.fillRect(6, 2 + (f === 0 ? 1 : 0), 4, 7);
      tCtx.fillStyle = '#fef08a';
      tCtx.fillRect(7, 3, 2, 4);
      this.cache.set(`torch_${f}`, torch);
    }
  }

  // Draw 16-Bit Hero Paper-Doll with full 4-Directional Visuals (Down, Up, Left, Right)
  public renderPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    facing: Direction,
    animFrame: number,
    colorScheme: 'crimson' | 'ashen',
    equipment: Player['equipment'],
    isShielding: boolean,
    isAttacking: boolean,
    attackProgress: number, // 0 to 1
    isSpinAttacking: boolean,
    spinAngle: number,
    isDashing: boolean
  ) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    // Shadow on floor
    const shadowWidth = (facing === 'left' || facing === 'right') ? 8 : 10;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 12, shadowWidth, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dash motion blur ghost
    if (isDashing) {
      ctx.fillStyle = colorScheme === 'crimson' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(203, 213, 225, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-facingToVector(facing).x * 12, 10, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isSpinAttacking) {
      // Rotate whole torso in spin attack
      ctx.rotate(spinAngle);
    }

    const walkBob = animFrame % 2 === 1 ? -1 : 0;
    const legOffset = (animFrame % 4 === 1 ? 2 : animFrame % 4 === 3 ? -2 : 0);

    const tunicColor = colorScheme === 'crimson' ? PALETTE.clothCrimson : '#1e2430';
    const armorColor = equipment.armor.color || PALETTE.ironMid;
    const armorDurabilityRatio = equipment.armor.durability / Math.max(1, equipment.armor.maxDurability);
    const helmDurabilityRatio = equipment.helmet ? equipment.helmet.durability / Math.max(1, equipment.helmet.maxDurability) : 1;
    const helmColor = equipment.helmet?.color || PALETTE.ironLight;

    // =========================================================================
    // 1. DIRECTION: DOWN (Frontal View - Hero facing viewer)
    // =========================================================================
    if (facing === 'down') {
      // Boots: Frontal with toe caps
      ctx.fillStyle = equipment.boots.color || PALETTE.ironDark;
      ctx.fillRect(-6, 8 + walkBob + legOffset, 4, 5);
      ctx.fillRect(2, 8 + walkBob - legOffset, 4, 5);
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(-6, 11 + walkBob + legOffset, 4, 2);
      ctx.fillRect(2, 11 + walkBob - legOffset, 4, 2);

      // Tunic
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-7, -4 + walkBob, 14, 13);

      // Front Breastplate
      ctx.fillStyle = armorColor;
      ctx.fillRect(-6, -3 + walkBob, 12, 10);
      // Frontal Heraldic Crest & Trim
      ctx.fillStyle = equipment.armor.rarity === 'legendary' || equipment.armor.rarity === 'mythic' ? PALETTE.goldMid : PALETTE.ironLight;
      ctx.fillRect(-6, -3 + walkBob, 12, 2);
      ctx.fillRect(-1, -1 + walkBob, 2, 7);
      // Golden Belt & Brass Buckle
      ctx.fillStyle = PALETTE.clothLeather;
      ctx.fillRect(-6, 5 + walkBob, 12, 2);
      ctx.fillStyle = PALETTE.goldBright;
      ctx.fillRect(-2, 5 + walkBob, 4, 2);

      // Damaged armor cracks on chest
      if (armorDurabilityRatio < 0.6) {
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-3, 0 + walkBob, 3, 1);
        ctx.fillRect(2, 2 + walkBob, 3, 1);
        ctx.fillStyle = PALETTE.bloodDark;
        ctx.fillRect(-4, 1 + walkBob, 2, 2);
      }
      if (armorDurabilityRatio < 0.25) {
        ctx.fillStyle = PALETTE.bloodMid;
        ctx.fillRect(-2, 1 + walkBob, 3, 3);
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-1, 2 + walkBob, 2, 2);
      }

      // Head & Face: Visible skin, eyes, nose
      ctx.fillStyle = PALETTE.skinHero;
      ctx.fillRect(-5, -13 + walkBob, 10, 8);
      ctx.fillStyle = PALETTE.skinHeroShadow;
      ctx.fillRect(-5, -6 + walkBob, 10, 1);
      // Dark piercing eyes
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(-3, -9 + walkBob, 2, 2);
      ctx.fillRect(2, -9 + walkBob, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -9 + walkBob, 1, 1);
      ctx.fillRect(2, -9 + walkBob, 1, 1);

      // Front Barbute Helmet
      if (equipment.helmet) {
        ctx.fillStyle = helmColor;
        ctx.fillRect(-6, -16 + walkBob, 12, 5); // Skull dome
        ctx.fillRect(-6, -16 + walkBob, 3, 10); // Left cheek guard
        ctx.fillRect(3, -16 + walkBob, 3, 10);  // Right cheek guard
        ctx.fillStyle = PALETTE.ironBright;
        ctx.fillRect(-6, -12 + walkBob, 12, 1); // Brow line
        if (equipment.helmet.rarity === 'legendary' || equipment.helmet.rarity === 'mythic') {
          ctx.fillStyle = PALETTE.goldBright;
          ctx.fillRect(-8, -18 + walkBob, 3, 4);
          ctx.fillRect(5, -18 + walkBob, 3, 4);
        }
        if (helmDurabilityRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-1, -15 + walkBob, 2, 2);
        }
      }

      // Shield on left arm & Weapon in right hand
      this.renderShield(ctx, facing, isShielding, walkBob, equipment.shield);
      this.renderWeapon(ctx, facing, isAttacking, attackProgress, walkBob, equipment.weapon);
    }

    // =========================================================================
    // 2. DIRECTION: UP (Back View - Hero looking into dungeon darkness)
    // =========================================================================
    else if (facing === 'up') {
      // 1. Shield on left arm facing UP (Drawn FIRST so player back/head sits in front)
      this.renderShield(ctx, facing, isShielding, walkBob, equipment.shield);

      // 2. Boots: Back of calves & heels pointing up
      ctx.fillStyle = equipment.boots.color || PALETTE.ironDark;
      ctx.fillRect(-6, 8 + walkBob - legOffset, 4, 5);
      ctx.fillRect(2, 8 + walkBob + legOffset, 4, 5);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-5, 11 + walkBob - legOffset, 2, 2);
      ctx.fillRect(3, 11 + walkBob + legOffset, 2, 2);

      // 3. Back of Tunic / Mantle
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-7, -4 + walkBob, 14, 13);

      // 4. SOLID BACKPLATE: Spine seam and shoulder blade plating (NO front emblem)
      ctx.fillStyle = armorColor;
      ctx.fillRect(-6, -3 + walkBob, 12, 10);
      // Dark spinal rivet seam
      ctx.fillStyle = PALETTE.ironDark;
      ctx.fillRect(-1, -3 + walkBob, 2, 10);
      // Shoulder blade reinforcement ridges
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(-5, -2 + walkBob, 3, 4);
      ctx.fillRect(2, -2 + walkBob, 3, 4);
      // Leather mantle shoulder clasps
      ctx.fillStyle = PALETTE.clothLeather;
      ctx.fillRect(-6, -4 + walkBob, 3, 2);
      ctx.fillRect(3, -4 + walkBob, 3, 2);

      // Damaged armor cracks on backplate
      if (armorDurabilityRatio < 0.6) {
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-3, 1 + walkBob, 3, 1);
        ctx.fillRect(1, 3 + walkBob, 3, 1);
      }

      // 5. HEAD & HELMET: Solid metal skull dome with central crest ridge
      ctx.fillStyle = PALETTE.ironDark; // Dark chainmail coif protecting neck
      ctx.fillRect(-5, -8 + walkBob, 10, 4);

      ctx.fillStyle = equipment.helmet ? helmColor : '#2b1810';
      ctx.fillRect(-6, -16 + walkBob, 12, 10);
      if (equipment.helmet) {
        ctx.fillStyle = PALETTE.ironBright;
        ctx.fillRect(-1, -16 + walkBob, 2, 9);
        if (equipment.helmet.rarity === 'legendary' || equipment.helmet.rarity === 'mythic') {
          ctx.fillStyle = PALETTE.goldBright;
          ctx.fillRect(-7, -18 + walkBob, 2, 5);
          ctx.fillRect(5, -18 + walkBob, 2, 5);
        }
        if (helmDurabilityRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(2, -13 + walkBob, 2, 2);
        }
      }

      // 6. Weapon pointing up into dungeon
      this.renderWeapon(ctx, facing, isAttacking, attackProgress, walkBob, equipment.weapon);
    }

    // =========================================================================
    // 3. DIRECTION: LEFT (Side Profile View - Hero facing left)
    // =========================================================================
    else if (facing === 'left') {
      // Staggered walking legs (narrower side profile: 5px)
      ctx.fillStyle = equipment.boots.color || PALETTE.ironDark;
      ctx.fillRect(-4 + legOffset, 8 + walkBob, 4, 5);
      ctx.fillRect(1 - legOffset, 8 + walkBob, 4, 5);
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(-5 + legOffset, 11 + walkBob, 2, 2); // Left pointed toe

      // Side Profile Torso (8px wide, from -5 to +3)
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-5, -4 + walkBob, 9, 13);

      // Side Cuirass: Leading shoulder pauldron protecting left arm!
      ctx.fillStyle = armorColor;
      ctx.fillRect(-5, -3 + walkBob, 8, 10);
      // Heavy Left Shoulder Pauldron
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(-6, -4 + walkBob, 4, 6);
      ctx.fillStyle = PALETTE.ironBright;
      ctx.fillRect(-6, -4 + walkBob, 4, 1);
      // Leather flank cinch straps & hip pouch on back right
      ctx.fillStyle = PALETTE.clothLeather;
      ctx.fillRect(2, 3 + walkBob, 3, 4);

      if (armorDurabilityRatio < 0.6) {
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-4, 0 + walkBob, 3, 1);
      }

      // Head: Profile facing left! Nose profile jutting out at -6
      ctx.fillStyle = PALETTE.skinHero;
      ctx.fillRect(-5, -13 + walkBob, 8, 8);
      ctx.fillRect(-6, -10 + walkBob, 2, 3); // Nose tip pointing LEFT
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(-4, -9 + walkBob, 2, 2); // Single left eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -9 + walkBob, 1, 1);

      // Profile Helmet: Visor beak jutting forward to left (-7), nape guard at back (+3)
      if (equipment.helmet) {
        ctx.fillStyle = helmColor;
        ctx.fillRect(-6, -16 + walkBob, 10, 6); // Dome
        ctx.fillRect(-7, -12 + walkBob, 3, 4); // Visor beak pointing left
        ctx.fillRect(-2, -10 + walkBob, 3, 6); // Ear plate
        ctx.fillRect(2, -13 + walkBob, 2, 8);  // Back nape guard
        ctx.fillStyle = PALETTE.ironBright;
        ctx.fillRect(-7, -13 + walkBob, 10, 1); // Brow bevel
        if (equipment.helmet.rarity === 'legendary' || equipment.helmet.rarity === 'mythic') {
          ctx.fillStyle = PALETTE.goldBright;
          ctx.fillRect(-6, -19 + walkBob, 3, 4); // Forward-swept horn
        }
        if (helmDurabilityRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-5, -14 + walkBob, 2, 1);
        }
      }

      // Shield leading in foreground!
      this.renderShield(ctx, facing, isShielding, walkBob, equipment.shield);
      this.renderWeapon(ctx, facing, isAttacking, attackProgress, walkBob, equipment.weapon);
    }

    // =========================================================================
    // 4. DIRECTION: RIGHT (Side Profile View - Hero facing right)
    // =========================================================================
    else {
      // 1. Shield in background on left arm (far side from camera when facing right)
      this.renderShield(ctx, facing, isShielding, walkBob, equipment.shield);

      // 2. Staggered walking legs (narrower side profile: 5px)
      ctx.fillStyle = equipment.boots.color || PALETTE.ironDark;
      ctx.fillRect(-2 - legOffset, 8 + walkBob, 4, 5);
      ctx.fillRect(3 + legOffset, 8 + walkBob, 4, 5);
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(5 + legOffset, 11 + walkBob, 2, 2); // Right pointed toe

      // 3. Side Profile Torso (8px wide, from -3 to +5)
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -4 + walkBob, 9, 13);

      // 4. Side Cuirass: Leading shoulder pauldron protecting right sword arm!
      ctx.fillStyle = armorColor;
      ctx.fillRect(-3, -3 + walkBob, 8, 10);
      // Heavy Right Shoulder Pauldron
      ctx.fillStyle = PALETTE.ironLight;
      ctx.fillRect(2, -4 + walkBob, 4, 6);
      ctx.fillStyle = PALETTE.ironBright;
      ctx.fillRect(2, -4 + walkBob, 4, 1);
      // Leather flank cinch straps & scabbard on rear left hip
      ctx.fillStyle = PALETTE.clothLeather;
      ctx.fillRect(-4, 3 + walkBob, 3, 4);

      if (armorDurabilityRatio < 0.6) {
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(1, 0 + walkBob, 3, 1);
      }

      // 5. Head: Profile facing right! Nose profile jutting out at +6
      ctx.fillStyle = PALETTE.skinHero;
      ctx.fillRect(-3, -13 + walkBob, 8, 8);
      ctx.fillRect(4, -10 + walkBob, 2, 3); // Nose tip pointing RIGHT
      ctx.fillStyle = PALETTE.voidBlack;
      ctx.fillRect(2, -9 + walkBob, 2, 2); // Single right eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -9 + walkBob, 1, 1);

      // 6. Profile Helmet: Visor beak jutting forward to right (+7), nape guard at back (-4)
      if (equipment.helmet) {
        ctx.fillStyle = helmColor;
        ctx.fillRect(-4, -16 + walkBob, 10, 6); // Dome
        ctx.fillRect(4, -12 + walkBob, 3, 4);  // Visor beak pointing right
        ctx.fillRect(-1, -10 + walkBob, 3, 6); // Ear plate
        ctx.fillRect(-4, -13 + walkBob, 2, 8); // Back nape guard
        ctx.fillStyle = PALETTE.ironBright;
        ctx.fillRect(-3, -13 + walkBob, 10, 1); // Brow bevel
        if (equipment.helmet.rarity === 'legendary' || equipment.helmet.rarity === 'mythic') {
          ctx.fillStyle = PALETTE.goldBright;
          ctx.fillRect(3, -19 + walkBob, 3, 4); // Forward-swept horn
        }
        if (helmDurabilityRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(1, -14 + walkBob, 2, 1);
        }
      }

      // 7. Weapon forward in foreground!
      this.renderWeapon(ctx, facing, isAttacking, attackProgress, walkBob, equipment.weapon);
    }

    ctx.restore();
  }

  private renderShield(
    ctx: CanvasRenderingContext2D,
    facing: Direction,
    isShielding: boolean,
    walkBob: number,
    shield: EquipmentItem
  ) {
    ctx.save();
    const shieldColor = shield.color || PALETTE.ironMid;
    const durRatio = shield.durability / Math.max(1, shield.maxDurability);
    const isLegendary = shield.rarity === 'legendary' || shield.rarity === 'mythic';
    const rimColor = isLegendary ? PALETTE.goldBright : PALETTE.ironBright;

    if (isShielding) {
      // ACTIVE BLOCKING STANCE: 4 DISTINCT DIRECTIONAL GRAPHICS WHEN HOLDING SHIELD
      ctx.save();

      if (facing === 'left') {
        // LEFT RAISING BLOCK STANCE: Large angled shield wall extended left (-12px)
        ctx.translate(-12, -2 + walkBob);

        // Protective energy deflection arc on left side
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(-3, 0, 16, Math.PI * 0.55, Math.PI * 1.45);
        ctx.fill();

        // Forearm Strap holding shield from right side
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(2, -3, 6, 5);
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(4, -3, 2, 5);

        // Angled Side Profile Shield Plate (10px wide by 18px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(4, -9);
        ctx.lineTo(-4, -7);
        ctx.lineTo(-4, 5);
        ctx.lineTo(2, 9);
        ctx.lineTo(5, 6);
        ctx.lineTo(2, 0);
        ctx.closePath();
        ctx.fill();

        // Outer Metallic Rim Guard facing left
        ctx.fillStyle = rimColor;
        ctx.fillRect(-5, -7, 2, 12);
        ctx.fillRect(-4, -8, 8, 2);
        ctx.fillRect(-4, 8, 6, 2);

        // Boss Stud jutting far out to the left
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(-8, -2, 4, 5);

        // Heraldic Trim on angled plate
        ctx.fillStyle = isLegendary ? PALETTE.goldMid : PALETTE.ironLight;
        ctx.fillRect(-1, -5, 2, 10);

        if (durRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-3, -1, 3, 2);
        }
      } else if (facing === 'right') {
        // RIGHT RAISING BLOCK STANCE: Large angled shield wall extended right (+12px)
        ctx.translate(12, -2 + walkBob);

        // Protective energy deflection arc on right side
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(3, 0, 16, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.fill();

        // Forearm Strap holding shield from left side
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(-8, -3, 6, 5);
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(-6, -3, 2, 5);

        // Angled Side Profile Shield Plate (10px wide by 18px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(-4, -9);
        ctx.lineTo(4, -7);
        ctx.lineTo(4, 5);
        ctx.lineTo(-2, 9);
        ctx.lineTo(-5, 6);
        ctx.lineTo(-2, 0);
        ctx.closePath();
        ctx.fill();

        // Outer Metallic Rim Guard facing right
        ctx.fillStyle = rimColor;
        ctx.fillRect(3, -7, 2, 12);
        ctx.fillRect(-4, -8, 8, 2);
        ctx.fillRect(-2, 8, 6, 2);

        // Boss Stud jutting far out to the right
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(4, -2, 4, 5);

        // Heraldic Trim on angled plate
        ctx.fillStyle = isLegendary ? PALETTE.goldMid : PALETTE.ironLight;
        ctx.fillRect(-1, -5, 2, 10);

        if (durRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(0, -1, 3, 2);
        }
      } else if (facing === 'up') {
        // REAR RAISING BLOCK STANCE: Shield raised high facing away into darkness (north)
        ctx.translate(0, -15 + walkBob);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -2, 16, Math.PI * 1.1, Math.PI * 1.9); // Barrier arc facing north
        ctx.fill();

        // Large Heater/Kite Shield Body (16px wide by 16px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(8, 2);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 2);
        ctx.closePath();
        ctx.fill();

        // Back Planking / Wood Grain Texture facing camera
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(-7, -7, 14, 9);
        ctx.fillStyle = PALETTE.woodMid;
        ctx.fillRect(-5, -6, 4, 7);
        ctx.fillRect(1, -6, 4, 7);

        // Outer Bright Metallic Rim Frame
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Leather Arm Loop & Bronze Brackets
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(-6, -1, 12, 3);
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(-3, -1, 2, 3);
        ctx.fillRect(1, -1, 2, 3);
      } else {
        // DOWN / FORWARD RAISING BLOCK STANCE: Front face of heater shield
        ctx.translate(0, 3 + walkBob);

        // Active blocking protective aura glow
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // Shield Main Body (Kite / Heater Shape)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(8, 3);
        ctx.lineTo(0, 10);
        ctx.lineTo(-8, 3);
        ctx.closePath();
        ctx.fill();

        // Metallic Rim Guard
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Heraldic Cross / Emblem
        ctx.fillStyle = isLegendary ? PALETTE.goldMid : PALETTE.ironLight;
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillRect(-6, -2, 12, 4);

        // Center Iron Boss Stud
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(-3, -3, 6, 6);

        if (durRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-3, -1, 3, 2);
          ctx.fillRect(-1, 1, 2, 2);
        }
      }
      ctx.restore();
    } else {
      // HELD AT REST - 4 DISTINCT LARGE DIRECTIONAL TEXTURES
      if (facing === 'down') {
        // 1. DOWN (Hero facing viewer): Left arm holding heater shield facing camera
        const x = -13;
        const y = -5 + walkBob;

        // Front Face of Heater Shield (12px wide by 15px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 7, y);
        ctx.lineTo(x + 7, y + 10);
        ctx.lineTo(x + 3.5, y + 15);
        ctx.lineTo(x, y + 10);
        ctx.closePath();
        ctx.fill();

        // Metallic Rim
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Heraldic Crest / Emblem
        ctx.fillStyle = isLegendary ? PALETTE.goldBright : PALETTE.ironLight;
        ctx.fillRect(x + 2, y + 2, 3, 9);
        ctx.fillRect(x + 1, y + 5, 5, 2);

        // Center Boss
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(x + 2, y + 5, 3, 3);

        if (durRatio < 0.5) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(x + 1, y + 7, 3, 2);
        }
      } else if (facing === 'up') {
        // 2. UP (Hero facing away into dungeon): LARGE SLUNG SHIELD ON BACK / LEFT SHOULDER
        const x = -13;
        const y = -8 + walkBob;

        // LARGE Full-Sized Back-Slung Shield Body (14px wide by 16px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14, y);
        ctx.lineTo(x + 14, y + 10);
        ctx.lineTo(x + 7, y + 16);
        ctx.lineTo(x, y + 10);
        ctx.closePath();
        ctx.fill();

        // Dark Oak Wood Planking
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 1, y + 1, 12, 10);
        ctx.fillStyle = PALETTE.woodMid;
        ctx.fillRect(x + 2, y + 2, 4, 8);
        ctx.fillRect(x + 8, y + 2, 4, 8);

        // Bright Metallic Perimeter Rim Frame (makes back shield POP!)
        ctx.strokeStyle = rimColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Leather Cross-Straps & Bronze Rivets
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(x, y + 5, 14, 3);
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(x + 2, y + 5, 2, 3);
        ctx.fillRect(x + 10, y + 5, 2, 3);

        // Center Iron Boss Stud on back
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(x + 5, y + 5, 4, 3);
      } else if (facing === 'left') {
        // 3. LEFT (Hero facing left): BOLD PROMINENT FOREGROUND SHIELD WALL!
        const x = -14;
        const y = -6 + walkBob;

        // Curved 3/4 Side Profile Shield Plate (11px wide by 17px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(x + 5, y);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x, y + 12);
        ctx.lineTo(x + 5, y + 17);
        ctx.lineTo(x + 11, y + 14);
        ctx.lineTo(x + 8, y + 8);
        ctx.lineTo(x + 11, y + 3);
        ctx.closePath();
        ctx.fill();

        // Leading Metallic Rim Guard (3px wide bright edge facing left)
        ctx.fillStyle = rimColor;
        ctx.fillRect(x, y + 3, 3, 10);
        ctx.fillRect(x, y + 2, 6, 2);
        ctx.fillRect(x, y + 12, 6, 2);

        // Gold Boss Profile jutting left
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(x - 2, y + 6, 3, 5);

        // Vertical Heraldic Stripe
        ctx.fillStyle = isLegendary ? PALETTE.goldBright : PALETTE.ironBright;
        ctx.fillRect(x + 5, y + 3, 2, 10);

        // Leather Forearm Strap Wrap connecting back to arm
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(x + 7, y + 5, 4, 5);
      } else {
        // 4. RIGHT (Hero facing right): BOLD PROMINENT SHIELD ON RIGHT FLANK/ARM!
        const x = 3;
        const y = -6 + walkBob;

        // Curved 3/4 Side Profile Shield Plate (11px wide by 17px tall)
        ctx.fillStyle = shieldColor;
        ctx.beginPath();
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 11, y + 3);
        ctx.lineTo(x + 11, y + 12);
        ctx.lineTo(x + 6, y + 17);
        ctx.lineTo(x, y + 14);
        ctx.lineTo(x + 3, y + 8);
        ctx.lineTo(x, y + 3);
        ctx.closePath();
        ctx.fill();

        // Outer Metallic Rim Guard (3px wide bright edge facing right)
        ctx.fillStyle = rimColor;
        ctx.fillRect(x + 8, y + 3, 3, 10);
        ctx.fillRect(x + 5, y + 2, 6, 2);
        ctx.fillRect(x + 5, y + 12, 6, 2);

        // Gold Boss Profile jutting right
        ctx.fillStyle = PALETTE.goldBright;
        ctx.fillRect(x + 10, y + 6, 3, 5);

        // Vertical Heraldic Stripe
        ctx.fillStyle = isLegendary ? PALETTE.goldBright : PALETTE.ironBright;
        ctx.fillRect(x + 4, y + 3, 2, 10);

        // Leather Forearm Strap Wrap
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(x, y + 5, 4, 5);
      }
    }
    ctx.restore();
  }

  private renderWeapon(
    ctx: CanvasRenderingContext2D,
    facing: Direction,
    isAttacking: boolean,
    attackProgress: number,
    walkBob: number,
    weapon: EquipmentItem
  ) {
    ctx.save();
    const bladeColor = weapon.color || PALETTE.ironLight;
    const durRatio = weapon.durability / Math.max(1, weapon.maxDurability);

    if (isAttacking) {
      // Zelda 3 Sword Slash Arc!
      const baseAngle = facing === 'down' ? Math.PI / 2 : facing === 'up' ? -Math.PI / 2 : facing === 'left' ? Math.PI : 0;
      const sweep = (attackProgress - 0.5) * Math.PI * 0.9;
      const angle = baseAngle + sweep;

      ctx.rotate(angle);

      // Sword Blade
      ctx.fillStyle = bladeColor;
      ctx.fillRect(4, -2, 16, 4);
      // Sword Tip
      ctx.fillStyle = PALETTE.ironBright;
      ctx.fillRect(20, -1, 3, 2);
      // Sword Hilt & Crossguard
      ctx.fillStyle = PALETTE.goldMid;
      ctx.fillRect(3, -5, 2, 10);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(0, -1, 3, 2);

      // Slash Trail Arc FX
      ctx.strokeStyle = weapon.rarity === 'mythic' ? 'rgba(239, 68, 68, 0.7)' : weapon.rarity === 'legendary' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -0.6, 0.6);
      ctx.stroke();

      // Damaged weapon notch
      if (durRatio < 0.5) {
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(12, -2, 2, 2);
      }
    } else {
      // Resting sword position based on directional facing
      if (facing === 'down') {
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(7, -3 + walkBob, 2, 6); // Crossguard
        ctx.fillStyle = bladeColor;
        ctx.fillRect(7, 3 + walkBob, 2, 10); // Blade pointing down
      } else if (facing === 'up') {
        // Pointing up into the room
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(7, 0 + walkBob, 2, 6);
        ctx.fillStyle = bladeColor;
        ctx.fillRect(7, -10 + walkBob, 2, 10); // Blade pointing up
      } else if (facing === 'left') {
        // Background behind torso
        ctx.fillStyle = bladeColor;
        ctx.fillRect(4, -2 + walkBob, 2, 8);
      } else {
        // Right facing: Held forward in FOREGROUND ready to strike
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(6, -2 + walkBob, 2, 6);
        ctx.fillStyle = bladeColor;
        ctx.fillRect(8, -1 + walkBob, 8, 2); // Blade pointing forward right
      }
    }
    ctx.restore();
  }

  // Legacy renderEnemy wrapper
  public renderEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: {
      type: EnemyType;
      x: number;
      y: number;
      facing: Direction;
      animFrame: number;
      hitFlashTimer: number;
      isBoss?: boolean;
      hp: number;
      maxHp: number;
    }
  ) {
    this.renderEnemyWithLighting(ctx, enemy, []);
  }

  // Draw 16-Bit Enemies with Dynamic Normal-Mapped Lighting (diffuse Lambert + directional wrap + specular rim glint)
  public renderEnemyWithLighting(
    ctx: CanvasRenderingContext2D,
    enemy: {
      type: EnemyType;
      x: number;
      y: number;
      facing: Direction;
      animFrame: number;
      hitFlashTimer: number;
      isBoss?: boolean;
      hp: number;
      maxHp: number;
    },
    lights: { x: number; y: number; z: number; radius: number; intensity: number; r: number; g: number; b: number }[]
  ) {
    if (!this.scratchCanvas || !this.scratchCtx) {
      this.scratchCanvas = document.createElement('canvas');
      this.scratchCanvas.width = 72;
      this.scratchCanvas.height = 72;
      this.scratchCtx = this.scratchCanvas.getContext('2d')!;
      this.scratchCtx.imageSmoothingEnabled = false;
    }

    const sCanvas = this.scratchCanvas;
    const sCtx = this.scratchCtx;
    sCtx.clearRect(0, 0, 72, 72);

    // 1. Shadow drawn directly onto dungeon floor canvas
    const shadowRadius = enemy.isBoss ? 24 : enemy.type === 'abomination' ? 16 : 10;
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.beginPath();
    ctx.ellipse(Math.round(enemy.x), Math.round(enemy.y) + 10, shadowRadius, shadowRadius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw enemy sprite onto scratch canvas centered at (36, 36)
    sCtx.save();
    sCtx.translate(36, 36);
    if (enemy.hitFlashTimer > 0) {
      sCtx.filter = 'brightness(2.5)';
    }
    this.drawEnemySprite(sCtx, enemy);
    sCtx.restore();

    // 3. Normal-Mapped Lighting (diffuse Lambert + directional wrap + specular rim glint)
    // Using source-atop ensures lighting and shadows strictly conform to the enemy sprite silhouette!
    sCtx.globalCompositeOperation = 'source-atop';

    const halfW = enemy.isBoss ? 22 : enemy.type === 'abomination' ? 16 : 11;
    const halfH = enemy.isBoss ? 24 : enemy.type === 'abomination' ? 18 : 14;
    const blockSize = 2;
    const enemyZ = 14;

    for (let dy = -halfH; dy <= halfH; dy += blockSize) {
      for (let dx = -halfW; dx <= halfW; dx += blockSize) {
        // Cylindrical & spherical surface normal vector of the enemy
        const nx = Math.max(-1, Math.min(1, dx / halfW));
        const ny = Math.max(-1, Math.min(1, (dy / halfH) * 0.45));
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        const worldX = enemy.x + dx;
        const worldY = enemy.y + dy;

        let totalDirect = 0;
        let directR = 0;
        let directG = 0;
        let directB = 0;
        let maxSpecular = 0;

        for (const light of lights) {
          const ldx = light.x - worldX;
          const ldy = light.y - worldY;
          const ldz = light.z - enemyZ;
          const distSq = ldx * ldx + ldy * ldy + ldz * ldz;
          const radSq = light.radius * light.radius;

          if (distSq < radSq) {
            const dist = Math.sqrt(distSq);
            const lx = ldx / dist;
            const ly = ldy / dist;
            const lz = ldz / dist;

            const ndotl = nx * lx + ny * ly + nz * lz;
            const atten = Math.max(0, 1 - dist / light.radius);

            // Half-Lambert wrap for smooth normal mapping response
            const wrapped = Math.max(0, (ndotl + 0.35) / 1.35);
            const irradiance = wrapped * atten * light.intensity;

            totalDirect += irradiance;
            directR += light.r * irradiance;
            directG += light.g * irradiance;
            directB += light.b * irradiance;

            if (ndotl > 0.55 && atten > 0.3) {
              const spec = Math.pow(ndotl, 3) * atten * light.intensity;
              maxSpecular = Math.max(maxSpecular, spec);
            }
          }
        }

        // Apply normal mapped lighting or shadow
        if (totalDirect < 0.22) {
          // Unlit/shadowed side - deep directional occlusion shadow
          const shadowAlpha = Math.min(0.68, (0.22 - totalDirect) * 2.5);
          sCtx.fillStyle = `rgba(5, 3, 8, ${shadowAlpha.toFixed(2)})`;
          sCtx.fillRect(36 + dx, 36 + dy, blockSize, blockSize);
        } else {
          // Lit side - directional illumination from light sources
          const lightAlpha = Math.min(0.55, (totalDirect - 0.22) * 0.65);
          const r = Math.min(255, Math.round(directR / totalDirect));
          const g = Math.min(255, Math.round(directG / totalDirect));
          const b = Math.min(255, Math.round(directB / totalDirect));
          sCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${lightAlpha.toFixed(2)})`;
          sCtx.fillRect(36 + dx, 36 + dy, blockSize, blockSize);

          // Specular rim glint on edge facing closest light
          if (maxSpecular > 0.3) {
            const specAlpha = Math.min(0.65, maxSpecular * 0.5);
            sCtx.fillStyle = `rgba(255, 245, 225, ${specAlpha.toFixed(2)})`;
            sCtx.fillRect(36 + dx, 36 + dy, 1, blockSize);
          }
        }
      }
    }

    sCtx.globalCompositeOperation = 'source-over';

    // 4. Draw illuminated enemy onto dungeon canvas
    ctx.drawImage(sCanvas, Math.round(enemy.x - 36), Math.round(enemy.y - 36));
  }

  // Draw 16-Bit Enemies with Proportional Chunk Removal on Damage & Directional Facing
  public drawEnemySprite(
    ctx: CanvasRenderingContext2D,
    enemy: {
      type: EnemyType;
      x: number;
      y: number;
      facing: Direction;
      animFrame: number;
      hitFlashTimer: number;
      isBoss?: boolean;
      hp: number;
      maxHp: number;
    }
  ) {
    const bob = enemy.animFrame % 2 === 1 ? -1 : 0;
    // Calculate proportional damage ratio: 0 (pristine) to 1 (near death)
    const damageRatio = Math.max(0, Math.min(1, 1 - enemy.hp / Math.max(1, enemy.maxHp)));

    switch (enemy.type) {
      case 'slime': {
        // Green Acid Slime with wobble squash
        const squash = enemy.animFrame % 2 === 1 ? 1.2 : 0.9;
        ctx.fillStyle = PALETTE.slimeAcidDark;
        ctx.beginPath();
        ctx.ellipse(0, 4, 11 * squash, 8 / squash, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.slimeAcid;
        ctx.beginPath();
        ctx.ellipse(0, 2, 9 * squash, 6 / squash, 0, 0, Math.PI * 2);
        ctx.fill();

        // Slime eyes
        if (damageRatio < 0.7) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-4, -1, 2, 3);
          ctx.fillRect(2, -1, 2, 3);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-4, -1, 1, 1);
          ctx.fillRect(2, -1, 1, 1);
        }

        // PROPORTIONAL CHUNK REMOVAL ON SLIME
        if (damageRatio >= 0.20) {
          // Left lower lobe bitten/sheared away with dark acid cavity
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-9, 1, 4, 5);
          ctx.fillStyle = PALETTE.slimeAcidDark;
          ctx.fillRect(-8, 3, 3, 4);
          ctx.fillStyle = PALETTE.slimeAcidGlow;
          ctx.fillRect(-10, 6, 2, 2); // Dripping acid droplet
        }
        if (damageRatio >= 0.45) {
          // Top right crest hacked off, exposed leaking core
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(3, -4, 5, 5);
          ctx.fillStyle = '#10281b';
          ctx.fillRect(2, -2, 4, 4);
          ctx.fillStyle = PALETTE.slimeAcidGlow;
          ctx.fillRect(7, -1, 2, 2);
        }
        if (damageRatio >= 0.70) {
          // Over 50% collapsed into a ragged, bubbling acid stump with exposed necrotic nucleus
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-6, -6, 12, 6);
          ctx.fillRect(2, 0, 8, 8);
          ctx.fillStyle = '#0a1a12';
          ctx.fillRect(-3, 0, 6, 5); // Necrotic core
          ctx.fillStyle = PALETTE.slimeAcidGlow;
          ctx.fillRect(-5, 4, 2, 2);
          ctx.fillRect(4, 5, 2, 2);
        }
        break;
      }

      case 'goblin':
      case 'goblin_spear': {
        // Goblin Skirmisher / Spearman
        ctx.fillStyle = PALETTE.clothLeather;
        ctx.fillRect(-5, 6 + bob, 4, 6);
        ctx.fillRect(1, 6 + bob, 4, 6);
        // Tunic
        ctx.fillStyle = enemy.type === 'goblin_spear' ? '#7f1d1d' : '#334155';
        ctx.fillRect(-6, -4 + bob, 12, 11);
        // Green head
        ctx.fillStyle = PALETTE.goblinGreen;
        ctx.fillRect(-5, -12 + bob, 10, 8);

        // Goblin ears (severed if damaged!)
        if (damageRatio < 0.20) {
          ctx.fillRect(-8, -10 + bob, 3, 3); // Left ear
          ctx.fillRect(5, -10 + bob, 3, 3);  // Right ear
        } else {
          // Left ear sliced off! Ragged bloody ear stump
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-6, -10 + bob, 2, 3);
          ctx.fillStyle = PALETTE.goblinGreen;
          ctx.fillRect(5, -10 + bob, 3, 3);  // Right ear remains
        }

        // Glowing red wicked eyes
        ctx.fillStyle = '#ef4444';
        const eyeOffset = enemy.facing === 'left' ? -1 : enemy.facing === 'right' ? 1 : 0;
        ctx.fillRect(-3 + eyeOffset, -9 + bob, 2, 2);
        ctx.fillRect(2 + eyeOffset, -9 + bob, 2, 2);

        // Weapon
        if (damageRatio < 0.45) {
          if (enemy.type === 'goblin_spear') {
            ctx.fillStyle = PALETTE.woodMid;
            ctx.fillRect(7, -14 + bob, 2, 24);
            ctx.fillStyle = PALETTE.ironLight;
            ctx.fillRect(6, -18 + bob, 4, 5);
          } else {
            ctx.fillStyle = PALETTE.ironMid;
            ctx.fillRect(6, 0 + bob, 3, 8); // Dagger
          }
        } else {
          // Weapon arm broken / severed! Exposed bloody stump
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(6, -2 + bob, 3, 4);
          ctx.fillStyle = PALETTE.boneWhite;
          ctx.fillRect(7, 0 + bob, 1, 2); // Bone fragment
        }

        // PROPORTIONAL CHUNK REMOVAL ON GOBLIN
        if (damageRatio >= 0.20) {
          // Chest slashed open with deep bloody gash
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-3, -2 + bob, 6, 2);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-2, -1 + bob, 4, 1);
        }
        if (damageRatio >= 0.45) {
          // Forehead sliced open with blood streaming down face
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-2, -12 + bob, 3, 4);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-4, 1 + bob, 5, 3);
        }
        if (damageRatio >= 0.70) {
          // Massive chunk of left torso and ribs gouged out!
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-6, -3 + bob, 5, 7);
          ctx.fillStyle = PALETTE.bloodGore;
          ctx.fillRect(-5, -2 + bob, 4, 5);
          ctx.fillStyle = PALETTE.boneWhite;
          ctx.fillRect(-4, -1 + bob, 2, 1); // Broken rib tip
        }
        break;
      }

      case 'skeleton': {
        // Crypt Skeleton
        ctx.fillStyle = PALETTE.boneDark;
        ctx.fillRect(-4, 6 + bob, 3, 7);
        ctx.fillRect(2, 6 + bob, 3, 7);

        // Ribs (shattered as damage increases!)
        ctx.fillStyle = PALETTE.boneWhite;
        if (damageRatio < 0.20) {
          ctx.fillRect(-5, -3 + bob, 10, 2);
          ctx.fillRect(-4, 0 + bob, 8, 2);
          ctx.fillRect(-3, 3 + bob, 6, 2);
        } else if (damageRatio < 0.70) {
          // Right ribs shattered! Broken jagged bone stumps
          ctx.fillRect(-5, -3 + bob, 5, 2);
          ctx.fillRect(-4, 0 + bob, 4, 2);
          ctx.fillRect(-3, 3 + bob, 3, 2);
          ctx.fillStyle = PALETTE.boneDark;
          ctx.fillRect(1, -3 + bob, 2, 2); // Broken stump
        } else {
          // Catastrophic rib destruction: only 1 broken rib left
          ctx.fillRect(-4, 0 + bob, 3, 2);
        }

        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-1, -4 + bob, 2, 10); // Spine

        // Skull (cracks and fractures as damage increases!)
        ctx.fillStyle = PALETTE.boneWhite;
        if (damageRatio < 0.70) {
          ctx.fillRect(-5, -13 + bob, 10, 9);
          // Dark eye sockets
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-4, -10 + bob, 3, 3);
          ctx.fillRect(1, -10 + bob, 3, 3);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-3, -9 + bob, 1, 1);
          ctx.fillRect(2, -9 + bob, 1, 1);
        } else {
          // Cranium fractured in half! Top-right skull chunk missing
          ctx.fillRect(-5, -13 + bob, 5, 9);
          ctx.fillRect(0, -9 + bob, 5, 5);
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-4, -10 + bob, 3, 3);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-3, -9 + bob, 1, 1); // Only 1 socket remains active
          ctx.fillStyle = PALETTE.boneDark;
          ctx.fillRect(0, -11 + bob, 2, 2); // Jagged fracture edge
        }

        // Arm & Rusted Falchion
        if (damageRatio < 0.45) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(6, -8 + bob, 3, 14);
        } else {
          // Entire right arm severed at shoulder socket! Hollow marrow cavity
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(4, -3 + bob, 3, 3);
          ctx.fillStyle = PALETTE.boneDark;
          ctx.fillRect(4, -4 + bob, 2, 1);
        }
        break;
      }

      case 'ghoul': {
        // Rotting Ghoul
        ctx.fillStyle = '#475569';
        ctx.fillRect(-6, -4 + bob, 12, 12);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-5, -13 + bob, 10, 9);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-3, -9 + bob, 2, 2);
        ctx.fillRect(2, -9 + bob, 2, 2);

        // Claws
        if (damageRatio < 0.45) {
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-9, 2 + bob, 3, 5);
          ctx.fillRect(6, 2 + bob, 3, 5);
        } else {
          // Left arm severed at elbow with protruding humerus bone
          ctx.fillStyle = PALETTE.boneWhite;
          ctx.fillRect(-8, 0 + bob, 2, 3);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-9, 1 + bob, 3, 2);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(6, 2 + bob, 3, 5); // Right claw remains
        }

        // PROPORTIONAL CHUNK REMOVAL ON GHOUL
        if (damageRatio >= 0.20) {
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-3, -2 + bob, 6, 4);
          ctx.fillStyle = '#6b21a8';
          ctx.fillRect(-2, -1 + bob, 4, 2); // Exposed rotting viscera
        }
        if (damageRatio >= 0.70) {
          // Lower jaw ripped away, neck chunk missing
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-4, -6 + bob, 8, 4);
          ctx.fillStyle = PALETTE.bloodGore;
          ctx.fillRect(-3, -5 + bob, 6, 3);
        }
        break;
      }

      case 'cultist':
      case 'necromancer': {
        const robeColor = enemy.type === 'necromancer' ? '#31103f' : '#6b1115';
        ctx.fillStyle = robeColor;
        ctx.fillRect(-7, -5 + bob, 14, 18);
        ctx.fillRect(-6, -14 + bob, 12, 10);
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-4, -11 + bob, 8, 6);
        ctx.fillStyle = enemy.type === 'necromancer' ? '#38bdf8' : '#fbbf24';
        ctx.fillRect(-2, -9 + bob, 2, 2);
        ctx.fillRect(1, -9 + bob, 2, 2);

        // Staff
        if (damageRatio < 0.45) {
          ctx.fillStyle = '#422006';
          ctx.fillRect(8, -16 + bob, 2, 26);
          ctx.fillStyle = enemy.type === 'necromancer' ? '#38bdf8' : '#dc2626';
          ctx.fillRect(6, -20 + bob, 6, 6);
        } else {
          // Staff snapped in half!
          ctx.fillStyle = '#422006';
          ctx.fillRect(8, 0 + bob, 2, 10);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(7, -2 + bob, 3, 3);
        }

        // PROPORTIONAL CHUNK REMOVAL ON CULTIST
        if (damageRatio >= 0.20) {
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-4, -1 + bob, 7, 3);
        }
        if (damageRatio >= 0.70) {
          // Entire left robe side torn away with gaping wound
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-7, -3 + bob, 6, 12);
          ctx.fillStyle = PALETTE.bloodGore;
          ctx.fillRect(-6, -2 + bob, 4, 10);
        }
        break;
      }

      case 'abomination': {
        // Stitched Flesh Hulk
        ctx.fillStyle = '#5c4d3c';
        ctx.fillRect(-12, -8 + bob, 24, 20);
        ctx.fillStyle = '#3f352b';
        ctx.fillRect(-7, -18 + bob, 14, 11);
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-6, -3 + bob, 12, 1);
        ctx.fillRect(-2, -12 + bob, 1, 8);

        // Cleaver
        if (damageRatio < 0.45) {
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(12, -10 + bob, 6, 18);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(14, -4 + bob, 4, 10);
        } else {
          // Chipped broken cleaver
          ctx.fillStyle = PALETTE.ironDark;
          ctx.fillRect(12, 0 + bob, 6, 8);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(11, -2 + bob, 4, 4);
        }

        // PROPORTIONAL CHUNK REMOVAL ON ABOMINATION
        if (damageRatio >= 0.20) {
          // Belly stitches burst, viscera chunk missing
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-4, -2 + bob, 8, 5);
          ctx.fillStyle = PALETTE.bloodGore;
          ctx.fillRect(-3, -1 + bob, 6, 3);
        }
        if (damageRatio >= 0.45) {
          // Shoulder chunk gouged out
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-12, -7 + bob, 6, 7);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-11, -6 + bob, 4, 5);
        }
        if (damageRatio >= 0.70) {
          // Massive diagonal fissure tearing through torso with missing muscle chunks
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-8, -4 + bob, 16, 7);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-6, -3 + bob, 12, 4);
          ctx.fillStyle = PALETTE.boneWhite;
          ctx.fillRect(-2, -2 + bob, 4, 2); // Exposed giant vertebrae
        }
        break;
      }

      case 'blood_demon': {
        // Crimson Horned Demon with Wings
        // Wings (torn as damage is taken)
        if (damageRatio < 0.65) {
          ctx.fillStyle = '#220808';
          ctx.fillRect(-20, -18 + bob, 10, 14);
          ctx.fillRect(10, -18 + bob, 10, 14);
          if (damageRatio >= 0.20) {
            // Jagged tears in left wing
            ctx.fillStyle = PALETTE.voidBlack;
            ctx.fillRect(-18, -14 + bob, 4, 5);
          }
        } else {
          // Left wing severed!
          ctx.fillStyle = '#220808';
          ctx.fillRect(10, -18 + bob, 10, 14); // Only right wing remains
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-14, -14 + bob, 5, 6); // Wing stump
        }

        // Body
        ctx.fillStyle = PALETTE.demonRed;
        ctx.fillRect(-8, -6 + bob, 16, 17);
        ctx.fillRect(-7, -17 + bob, 14, 11);

        // Horns
        ctx.fillStyle = PALETTE.demonHorn;
        ctx.fillRect(-10, -22 + bob, 3, 7);
        if (damageRatio < 0.40) {
          ctx.fillRect(7, -22 + bob, 3, 7);
        } else {
          // Right horn snapped off!
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(7, -18 + bob, 3, 3);
        }

        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-4, -13 + bob, 3, 2);
        ctx.fillRect(2, -13 + bob, 3, 2);

        // PROPORTIONAL CHUNK REMOVAL ON DEMON
        if (damageRatio >= 0.20) {
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-4, -2 + bob, 8, 4);
        }
        if (damageRatio >= 0.70) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-6, -4 + bob, 12, 8);
          ctx.fillStyle = '#ef4444'; // Glowing lava/hellfire heart
          ctx.fillRect(-3, -2 + bob, 6, 4);
        }
        break;
      }

      case 'boss_malakor': {
        // Giant Demon Overlord: Malakor the Flayed
        // Demonic Wings
        if (damageRatio < 0.65) {
          ctx.fillStyle = '#1a0505';
          ctx.fillRect(-36, -30 + bob, 22, 26);
          ctx.fillRect(14, -30 + bob, 22, 26);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-32, -26 + bob, 16, 20);
          ctx.fillRect(16, -26 + bob, 16, 20);
          if (damageRatio >= 0.20) {
            // Holes torn in wings
            ctx.fillStyle = PALETTE.voidBlack;
            ctx.fillRect(-28, -20 + bob, 8, 8);
          }
        } else {
          // Left wing sheared off! Bleeding stump
          ctx.fillStyle = '#1a0505';
          ctx.fillRect(14, -30 + bob, 22, 26);
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(16, -26 + bob, 16, 20);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-22, -20 + bob, 8, 12);
        }

        // Torso
        ctx.fillStyle = '#4a0808';
        ctx.fillRect(-16, -14 + bob, 32, 26);
        ctx.fillStyle = PALETTE.ironDark;
        ctx.fillRect(-20, -16 + bob, 6, 10);
        ctx.fillRect(14, -16 + bob, 6, 10);

        // Horned Crown
        ctx.fillStyle = '#2d0808';
        ctx.fillRect(-12, -28 + bob, 24, 15);
        ctx.fillStyle = PALETTE.goldDark;
        ctx.fillRect(-14, -34 + bob, 4, 8);
        if (damageRatio < 0.40) {
          ctx.fillRect(10, -34 + bob, 4, 8);
        } else {
          // Right horn sheared off!
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(10, -28 + bob, 4, 4);
        }

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-7, -22 + bob, 4, 3);
        ctx.fillRect(3, -22 + bob, 4, 3);

        // Greatblade
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(18, -26 + bob, 6, 38);
        ctx.fillStyle = PALETTE.bloodBright;
        ctx.fillRect(20, -24 + bob, 2, 34);

        // PROPORTIONAL CHUNK REMOVAL ON BOSS MALAKOR
        if (damageRatio >= 0.20) {
          ctx.fillStyle = PALETTE.bloodDark;
          ctx.fillRect(-8, -6 + bob, 16, 6);
        }
        if (damageRatio >= 0.50) {
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-12, -8 + bob, 10, 8);
          ctx.fillStyle = PALETTE.bloodBright;
          ctx.fillRect(-10, -7 + bob, 7, 5);
        }
        if (damageRatio >= 0.75) {
          // Visibly eviscerated, chest core glowing with exposed burning hellfire
          ctx.fillStyle = PALETTE.voidBlack;
          ctx.fillRect(-10, -10 + bob, 20, 14);
          ctx.fillStyle = '#fbbf24'; // Molten core
          ctx.fillRect(-6, -7 + bob, 12, 8);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(-4, -5 + bob, 8, 4);
        }
        break;
      }
    }

    ctx.restore();
  }

  // Draw Dismembered Limb Chunks with Rotation & Gore Trails
  public renderSeveredLimb(
    ctx: CanvasRenderingContext2D,
    limb: {
      type: 'head' | 'arm' | 'weapon' | 'ribs' | 'leg' | 'slime_chunk';
      x: number;
      y: number;
      z: number;
      rotation: number;
      color: string;
      enemyType: EnemyType;
    }
  ) {
    ctx.save();
    ctx.translate(Math.round(limb.x), Math.round(limb.y - limb.z));
    ctx.rotate(limb.rotation);

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(0, limb.z, 5, 0, Math.PI * 2);
    ctx.fill();

    switch (limb.type) {
      case 'head':
        ctx.fillStyle = limb.color;
        ctx.fillRect(-4, -4, 8, 8);
        // Severed neck bloody stump
        ctx.fillStyle = PALETTE.bloodBright;
        ctx.fillRect(-3, 3, 6, 2);
        ctx.fillStyle = PALETTE.voidBlack;
        ctx.fillRect(-2, -2, 2, 2);
        ctx.fillRect(1, -2, 2, 2);
        break;

      case 'arm':
        ctx.fillStyle = limb.color;
        ctx.fillRect(-2, -6, 4, 10);
        // Bone protruding & blood
        ctx.fillStyle = PALETTE.boneWhite;
        ctx.fillRect(-1, -7, 2, 2);
        ctx.fillStyle = PALETTE.bloodBright;
        ctx.fillRect(-2, -5, 4, 2);
        break;

      case 'ribs':
        ctx.fillStyle = PALETTE.boneWhite;
        ctx.fillRect(-5, -4, 10, 2);
        ctx.fillRect(-4, -1, 8, 2);
        ctx.fillRect(-3, 2, 6, 2);
        ctx.fillStyle = PALETTE.bloodDark;
        ctx.fillRect(-1, -4, 2, 8);
        break;

      case 'weapon':
        ctx.fillStyle = PALETTE.ironMid;
        ctx.fillRect(-1, -8, 2, 14);
        ctx.fillStyle = PALETTE.goldMid;
        ctx.fillRect(-4, 0, 8, 2);
        break;

      case 'slime_chunk':
        ctx.fillStyle = limb.color;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        ctx.fillStyle = limb.color;
        ctx.fillRect(-3, -3, 6, 6);
        break;
    }

    ctx.restore();
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

export const textureAtlas = new TextureAtlas();
