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
  const [questsExpanded, setQuestsExpanded] = useState(true);

  // Interactively draggable quest tracker state
  const [questPos, setQuestPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingQuest = useRef(false);
  const dragOrigin = useRef({ pointerX: 0, pointerY: 0, startX: 0, startY: 0 });
  const didDrag = useRef(false);

  const onPointerDownQuest = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingQuest.current = true;
    didDrag.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: questPos?.x ?? rect.left,
      startY: questPos?.y ?? rect.top,
    };
  };

  const onPointerMoveQuest = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingQuest.current) return;
    const dx = e.clientX - dragOrigin.current.pointerX;
    const dy = e.clientY - dragOrigin.current.pointerY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDrag.current = true;
    }

    const newX = Math.max(8, Math.min(window.innerWidth - 250, dragOrigin.current.startX + dx));
    const newY = Math.max(50, Math.min(window.innerHeight - 80, dragOrigin.current.startY + dy));
    setQuestPos({ x: newX, y: newY });
  };

  const onPointerUpQuest = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingQuest.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingQuest.current = false;
  };

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
      {/* TOP BAR: Health Orb, Floor Title, Action Buttons */}
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

        {/* Center: Floor Indicator */}
        <div className="hidden sm:flex flex-col items-center bg-[#120d0f]/95 border border-red-950/60 px-4 py-1.5 rounded-lg shadow-md pointer-events-auto">
          <span className="font-cinzel font-bold text-amber-200 text-sm tracking-wider">{dungeonName}</span>
          <span className="text-[11px] text-slate-300 font-mono">Floor {currentFloor} · Zelda 3 &amp; Diablo ARPG</span>
        </div>

        {/* Right: Quick Action Buttons (Inventory, Quests List, Sprites, Controls, Mute) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Inventory Button */}
          <button
            onClick={onOpenInventory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181113] border border-amber-900/60 text-amber-200 text-xs font-medium hover:bg-amber-950/40 active:scale-95 transition shadow-md cursor-pointer"
            title="Open Character & Inventory"
          >
            <Backpack className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Gear</span>
          </button>

          {/* Quests List Toggle Button */}
          <button
            onClick={() => setQuestsExpanded(!questsExpanded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium active:scale-95 transition shadow-md cursor-pointer ${
              questsExpanded
                ? 'bg-red-950/80 border-red-600 text-red-200'
                : 'bg-[#181113] border-red-900/60 text-red-200 hover:bg-red-950/40'
            }`}
            title="Toggle Quests List"
          >
            <Scroll className="w-4 h-4 text-red-400" />
            <span className="hidden md:inline">Quests</span>
          </button>

          {/* 16-Bit Sprite Sheets Viewer */}
          <button
            onClick={onOpenSpriteSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#181113] border border-purple-900/60 text-purple-200 text-xs font-medium hover:bg-purple-950/40 active:scale-95 transition shadow-md cursor-pointer"
            title="View Pre-Baked 16-Bit Sprite Sheets & Tiles"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">Sprites</span>
          </button>

          {/* Ambient Lighting Preset Button */}
          <button
            onClick={onCycleAmbientLight}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#181113] border border-amber-900/50 text-amber-300 text-xs font-medium hover:bg-amber-950/40 active:scale-95 transition shadow-md cursor-pointer"
            title={`Ambient Light: ${ambientPreset.toUpperCase()} (Click to toggle)`}
          >
            {ambientPreset === 'moody' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : ambientPreset === 'balanced' ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-400" />
            )}
            <span className="hidden md:inline capitalize">{ambientPreset}</span>
          </button>

          {/* Virtual Controls Toggle Button */}
          <button
            onClick={onToggleVirtualControls}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium active:scale-95 transition shadow-md cursor-pointer ${
              virtualControlsVisible
                ? 'bg-red-950/80 border-red-600 text-red-200'
                : 'bg-[#181113] border-slate-800 text-slate-400'
            }`}
            title="Toggle On-Screen Virtual Touch Joystick"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-md bg-[#181113] border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* INTERACTIVELY DRAGGABLE & COLLAPSIBLE DYNAMIC QUEST TRACKER */}
      <div
        onPointerDown={onPointerDownQuest}
        onPointerMove={onPointerMoveQuest}
        onPointerUp={onPointerUpQuest}
        onPointerCancel={onPointerUpQuest}
        style={
          questPos
            ? { position: 'fixed', left: `${questPos.x}px`, top: `${questPos.y}px`, zIndex: 35 }
            : undefined
        }
        className={`pointer-events-auto touch-none select-none transition-shadow ${
          questPos ? '' : 'absolute top-16 right-4'
        } max-w-[230px] md:max-w-[250px] bg-[#120d0f]/95 hover:bg-[#120d0f] border border-amber-950/80 rounded-lg p-2 shadow-2xl backdrop-blur-xs text-xs`}
      >
        {/* Drag Handle & Header */}
        <div className="flex items-center justify-between cursor-grab active:cursor-grabbing pb-1 border-b border-amber-950/40">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!didDrag.current) setQuestsExpanded(!questsExpanded);
            }}
            className="flex items-center gap-1.5 font-cinzel font-bold text-amber-200/90 text-[10px] tracking-wide cursor-pointer flex-1"
          >
            <Scroll className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Quests ({quests.filter((q) => q.completed).length}/{quests.length})</span>
            {questsExpanded ? (
              <ChevronUp className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
            )}
          </div>
          <div className="flex items-center pl-1.5 text-slate-400 hover:text-amber-300" title="Touch & Drag anywhere to move out of the way">
            <GripHorizontal className="w-4 h-4 shrink-0" />
          </div>
        </div>

        {questsExpanded && (
          <div className="mt-1.5 space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {quests.map((q) => (
              <div key={q.id} className="text-[10px] bg-black/40 p-1.5 rounded border border-amber-950/40">
                <div className="flex justify-between items-center text-slate-200 font-medium mb-0.5">
                  <span className="truncate max-w-[140px]" title={q.description}>{q.title}</span>
                  <span className={`font-mono tabular-nums ${q.completed ? 'text-emerald-400 font-bold' : 'text-amber-400'}`}>
                    {q.completed ? '✓' : `${q.currentCount}/${q.targetCount}`}
                  </span>
                </div>
                {/* Micro progress bar */}
                <div className="w-full h-1 bg-slate-900 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${q.completed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, (q.currentCount / q.targetCount) * 100)}%` }}
                  />
                </div>
                {/* Claim reward button if completed but unclaimed */}
                {q.completed && !q.claimed && onClaimQuest && (
                  <button
                    onClick={() => onClaimQuest(q.id)}
                    className="mt-1 w-full py-0.5 px-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-bold rounded text-[9px] cursor-pointer transition active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>Claim Reward (+{q.goldReward}g)</span>
                  </button>
                )}
                {q.claimed && (
                  <span className="text-[9px] text-emerald-400/80 font-mono block mt-0.5">Reward Claimed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer to maintain vertical balance */}
      <div className="shrink-0" />
    </div>
  );
};
