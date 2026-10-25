/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { spriteSheets } from '../game/spritesheet';
import { X, Grid, Layers, Eye } from 'lucide-react';

interface SpriteSheetModalProps {
  onClose: () => void;
}

export const SpriteSheetModal: React.FC<SpriteSheetModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'tiles' | 'normals' | 'hero' | 'enemies' | 'gore' | 'items'>('tiles');

  const sheets = [
    { id: 'tiles' as const, label: 'Dungeon Tiles (32x32)', canvas: spriteSheets.tileSheet, desc: 'Zelda 3 2.5D North wall tops, brick front faces, cold slate flagstones, runic blood altars, chests, and torches.' },
    { id: 'normals' as const, label: 'Normal Maps (Lighting)', canvas: spriteSheets.normalSheet, desc: 'RGB Tangent-Space Surface Normal Maps (R=Nx, G=Ny, B=Nz) driving dynamic wall vs floor directional lighting.' },
    { id: 'hero' as const, label: 'Hero & Equipment', canvas: spriteSheets.heroSheet, desc: '4-Directional walk cycles (Down, Up, Left, Right), sword slashes, shield defense poses, spin attacks, and damaged armor crack overlays.' },
    { id: 'enemies' as const, label: 'Monsters & Boss', canvas: spriteSheets.enemySheet, desc: 'Acid slimes with wobble frames, goblins, crypt skeletons, cultists, flesh abominations, and Malakor the Flayed with proportional dismemberment.' },
    { id: 'gore' as const, label: 'Gore & Severed Limbs', canvas: spriteSheets.goreSheet, desc: 'Severed heads, arms, shattered ribcage bones, blood splatters, and bloody footprints.' },
    { id: 'items' as const, label: 'Item Icons & Loot', canvas: spriteSheets.itemsSheet, desc: 'Diablo procedural weapons, shields, armors, helmets, boots, potions, and gold pouches.' },
  ];

  const currentSheet = sheets.find((s) => s.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-6 backdrop-blur-xs select-none">
      <div className="w-full max-w-3xl bg-[#0e090b] border-2 border-red-950/80 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-red-950/60 bg-[#160c0f]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-cinzel font-bold text-base md:text-lg text-amber-200 tracking-wide">
                16-Bit Pre-Baked Sprite Sheets &amp; Tiles
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Generated in advance for 60fps performance and authentic pixel art
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-4 py-2 bg-[#120b0e] border-b border-slate-900 overflow-x-auto">
          {sheets.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === s.id
                  ? 'bg-red-900/60 text-amber-200 border border-red-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Sheet Viewer Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-[#070506]">
          {currentSheet && (
            <div className="flex flex-col items-center w-full max-w-xl">
              <p className="text-xs text-slate-400 text-center mb-3 font-mono leading-relaxed">
                {currentSheet.desc}
              </p>

              {/* Pixel-scaled canvas container */}
              <div className="p-3 bg-[#110d10] border-2 border-slate-800 rounded-lg shadow-xl overflow-auto max-w-full">
                {currentSheet.canvas ? (
                  <img
                    src={currentSheet.canvas.toDataURL()}
                    alt={currentSheet.label}
                    className="pixelated block mx-auto border border-red-950/40"
                    style={{
                      transform: 'scale(2.5)',
                      transformOrigin: 'top center',
                      margin: '24px auto',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <div className="text-slate-500 font-mono text-xs py-8">Generating spritesheet...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
