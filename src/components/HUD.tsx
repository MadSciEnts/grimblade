/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Player, Quest } from '../game/types';
import { soundEngine } from '../game/audio';
import {
  Backpack,
  Scroll,
  Layers,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Gamepad2,
  Moon,
  Sun,
  GripHorizontal,
  Sliders,
} from 'lucide-react';

interface HUDProps {
  player: Player | undefined;
  quests: Quest[];
  currentFloor: number;
  dungeonName: string;
  virtualControlsVisible: boolean;
  ambientPreset: 'moody' | 'balanced' | 'bright';
  onCycleAmbientLight: () => void;
  onToggleVirtualControls: () => void;
  onOpenInventory: () => void;
  onOpenSpriteSheets: () => void;
  onClaimQuest?: (questId: string) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  quests,
  currentFloor,
  dungeonName,
  virtualControlsVisible,
  ambientPreset,
  onCycleAmbientLight,
  onToggleVirtualControls,
  onOpenInventory,
  onOpenSpriteSheets,
  onClaimQuest,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [questsExpanded, setQuestsExpanded] = useState(false);
  const [systemMenuExpanded, setSystemMenuExpanded] = useState(false);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const p1 = player;

  const getDurabilityColor = (item: { durability: number; maxDurability: number }) => {
    const ratio = item.durability / Math.max(1, item.maxDurability);
    if (ratio > 0.6) return 'text-slate-400';
    if (ratio > 0.25) return 'text-amber-400 font-bold';
    return 'text-red-500 font-bold animate-pulse';
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 md:p-4">
      {/* TOP BAR: Health Orb, Reduced Level Title + Quests Beside It, Expandable System Menu */}
      <div className="flex justify-between items-start w-full">
        {/* Left: Player Status Cluster */}
        <div className="flex flex-col gap-2 max-w-[280px] md:max-w-sm pointer-events-auto">
          {p1 && (
            <div className="bg-[#120d0f]/95 border border-red-950/80 rounded-lg p-2 md:p-2.5 shadow-xl backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-cinzel font-bold text-red-200 tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                  {p1.name} (Lv.{p1.stats.level})
                </span>
                <span className="font-mono tabular-nums text-[11px] text-red-400 font-bold">
                  {p1.stats.hp} / {p1.stats.maxHp} HP
                </span>
              </div>

              {/* HP Bar */}
              <div className="w-full h-3 bg-red-950/80 rounded-xs overflow-hidden border border-red-900/50 mb-1">
                <div
                  className="h-full bg-gradient-to-r from-red-700 via-red-600 to-red-500 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (p1.stats.hp / p1.stats.maxHp) * 100))}%` }}
                />
              </div>

              {/* Stamina & XP Bar */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 font-mono tabular-nums">
                <div className="flex items-center gap-1">
                  <span>STM</span>
                  <div className="flex-1 h-1.5 bg-emerald-950 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${(p1.stats.stamina / p1.stats.maxStamina) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span>XP</span>
                  <div className="flex-1 h-1.5 bg-amber-950 rounded-xs overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-75"
                      style={{ width: `${(p1.stats.xp / p1.stats.nextLevelXp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Durability Chips (Live Damaged Armour Tracker) */}
              <div className="mt-1.5 pt-1.5 border-t border-red-950/60 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-mono tabular-nums font-bold">🪙 {p1.stats.gold}</span>
                  <span className="text-red-300 font-mono tabular-nums font-bold">🧪 {p1.stats.potions}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[9px]">
                  <span className={getDurabilityColor(p1.equipment.weapon)} title="Weapon Durability">
                    W:{Math.round((p1.equipment.weapon.durability / p1.equipment.weapon.maxDurability) * 100)}%
                  </span>
                  <span className={getDurabilityColor(p1.equipment.shield)} title="Shield Durability">
                    S:{Math.round((p1.equipment.shield.durability / p1.equipment.shield.maxDurability) * 100)}%
                  </span>
                  <span className={getDurabilityColor(p1.equipment.armor)} title="Armor Durability">
                    A:{Math.round((p1.equipment.armor.durability / p1.equipment.armor.maxDurability) * 100)}%
                  </span>
                  {(p1.equipment.armor.durability < p1.equipment.armor.maxDurability * 0.3 ||
                    p1.equipment.weapon.durability < p1.equipment.weapon.maxDurability * 0.3) && (
                    <AlertTriangle className="w-3 h-3 text-red-500 inline-block animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Reduced Level Title & Quests Window Side-by-Side */}
        <div className="hidden sm:flex items-center gap-2 pointer-events-auto">
          {/* Reduced Level Title (greatly reduced in text size & Y height) */}
          <div className="bg-[#120d0f]/95 border border-red-950/60 px-2 py-1 rounded-md shadow-xs flex items-center gap-1">
            <span className="font-cinzel font-bold text-amber-200 text-[10px] tracking-wide">{dungeonName}</span>
            <span className="text-[9px] text-slate-400 font-mono">· F.{currentFloor}</span>
          </div>

          {/* Quests Window Beside It */}
          <div>
            {!questsExpanded ? (
              <div
                onClick={() => setQuestsExpanded(true)}
                className="flex items-center gap-1 bg-[#120d0f]/95 hover:bg-[#120d0f] border border-amber-900/60 rounded-md px-2 py-1 shadow-xs cursor-pointer active:scale-95 transition text-[9px] text-amber-200"
                title="Tap to expand quests"
              >
                <Scroll className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-cinzel font-bold tracking-wide">
                  Quests ({quests.filter((q) => q.completed).length}/{quests.length})
                </span>
              </div>
            ) : (
              <div className="w-[160px] md:w-[180px] bg-[#120d0f]/95 border border-amber-900/70 rounded-lg p-1.5 shadow-2xl backdrop-blur-xs text-[9px] text-slate-200">
                <div
                  onClick={() => setQuestsExpanded(false)}
                  className="flex items-center justify-between pb-1 mb-1 border-b border-amber-950/60 cursor-pointer hover:text-amber-300 transition"
                  title="Tap anywhere to collapse"
                >
                  <div className="flex items-center gap-1 font-cinzel font-bold text-amber-200 text-[9px]">
                    <Scroll className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Quests ({quests.filter((q) => q.completed).length}/{quests.length})</span>
                  </div>
                  <ChevronUp className="w-3 h-3 text-amber-400 shrink-0" />
                </div>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                  {quests.map((q) => (
                    <div key={q.id} className="bg-black/50 p-1 rounded border border-amber-950/50">
                      <div className="flex justify-between items-center text-slate-200 font-medium mb-0.5">
                        <span className="truncate max-w-[100px] font-cinzel text-[8px]" title={q.description}>
                          {q.title}
                        </span>
                        <span className={`font-mono tabular-nums text-[8px] ${q.completed ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                          {q.completed ? 'DONE' : `${q.currentCount}/${q.targetCount}`}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-amber-950/40">
                        <div
                          className={`h-full transition-all duration-300 ${q.completed ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                          style={{ width: `${Math.min(100, (q.currentCount / q.targetCount) * 100)}%` }}
                        />
                      </div>
                      {q.completed && !q.claimed && onClaimQuest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClaimQuest(q.id);
                          }}
                          className="mt-1 w-full py-0.5 px-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded text-[8px] cursor-pointer transition active:scale-95 flex items-center justify-center gap-0.5 shadow-sm font-cinzel"
                        >
                          <span>Claim (+{q.goldReward}g)</span>
                        </button>
                      )}
                      {q.claimed && (
                        <span className="text-[7px] text-emerald-400/80 font-mono block mt-0.5 text-right">✓ Claimed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Expandable Overlay System Buttons Bar */}
        <div className="relative pointer-events-auto flex items-center">
          <button
            onClick={() => setSystemMenuExpanded(!systemMenuExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181113] border border-amber-900/60 text-amber-200 text-xs font-medium hover:bg-amber-950/40 active:scale-95 transition shadow-md cursor-pointer"
            title="Toggle System Menu"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Menu</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${systemMenuExpanded ? 'rotate-180' : ''}`} />
          </button>

          {systemMenuExpanded && (
            <div className="absolute right-0 top-10 flex items-center gap-1.5 p-2 bg-[#120d0f]/95 border border-amber-950/80 rounded-lg shadow-2xl backdrop-blur-xs z-40">
              {/* Inventory Button */}
              <button
                onClick={() => { onOpenInventory(); setSystemMenuExpanded(false); }}
                className="p-2 rounded-md bg-[#181113] border border-amber-900/60 text-amber-200 hover:bg-amber-950/40 active:scale-95 transition shadow-sm cursor-pointer"
                title="Character & Inventory"
              >
                <Backpack className="w-4 h-4 text-amber-400" />
              </button>

              {/* Sprites Viewer */}
              <button
                onClick={() => { onOpenSpriteSheets(); setSystemMenuExpanded(false); }}
                className="p-2 rounded-md bg-[#181113] border border-purple-900/60 text-purple-200 hover:bg-purple-950/40 active:scale-95 transition shadow-sm cursor-pointer"
                title="16-Bit Sprite Sheets"
              >
                <Layers className="w-4 h-4 text-purple-400" />
              </button>

              {/* Ambient Light */}
              <button
                onClick={onCycleAmbientLight}
                className="p-2 rounded-md bg-[#181113] border border-amber-900/50 text-amber-300 hover:bg-amber-950/40 active:scale-95 transition shadow-sm cursor-pointer"
                title={`Ambient Light: ${ambientPreset.toUpperCase()}`}
              >
                {ambientPreset === 'moody' ? (
                  <Moon className="w-4 h-4 text-amber-400" />
                ) : ambientPreset === 'balanced' ? (
                  <Moon className="w-4 h-4 text-sky-400" />
                ) : (
                  <Sun className="w-4 h-4 text-yellow-400" />
                )}
              </button>

              {/* Virtual Controls */}
              <button
                onClick={onToggleVirtualControls}
                className={`p-2 rounded-md border active:scale-95 transition shadow-sm cursor-pointer ${
                  virtualControlsVisible
                    ? 'bg-red-950/80 border-red-600 text-red-200'
                    : 'bg-[#181113] border-slate-800 text-slate-400'
                }`}
                title="Toggle Virtual Controls"
              >
                <Gamepad2 className="w-4 h-4" />
              </button>

              {/* Audio Mute */}
              <button
                onClick={toggleSound}
                className="p-2 rounded-md bg-[#181113] border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to maintain vertical balance */}
      <div className="shrink-0" />
    </div>
  );
};
