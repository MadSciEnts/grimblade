/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { soundEngine } from '../game/audio';
import { Play, Smartphone, Volume2, VolumeX, Layers } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onOpenApkExport: () => void;
  onOpenSpriteSheets: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenApkExport,
  onOpenSpriteSheets,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between items-center p-6 md:p-10 select-none overflow-hidden bg-gradient-to-b from-[#0b0709] via-[#140b0f] to-[#080406]">
      {/* Background Decorative Vignette */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/25 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-amber-900/15 rounded-full blur-3xl" />
      </div>

      {/* Top Bar: Sound toggle, Sprite Sheets & Android APK prompt */}
      <div className="w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenApkExport}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-600/70 text-emerald-300 text-xs font-medium hover:bg-emerald-900/80 active:scale-95 transition cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Install Android APK</span>
          </button>

          <button
            onClick={onOpenSpriteSheets}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-700/60 text-purple-200 text-xs font-medium hover:bg-purple-900/80 active:scale-95 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>16-Bit Sprites</span>
          </button>
        </div>

        <button
          onClick={toggleSound}
          className="p-2 rounded-full bg-black/40 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Center: Bespoke Inline SVG Title Lockup with 30-40% Negative Space */}
      <div className="z-10 flex flex-col items-center text-center my-auto max-w-2xl">
        {/* Heraldic Crossed Swords & Crest Lockup */}
        <div className="relative mb-3">
          <svg
            className="w-20 h-20 md:w-28 md:h-28 drop-shadow-[0_10px_20px_rgba(220,38,38,0.5)]"
            viewBox="0 0 100 100"
            fill="none"
          >
            {/* Blood glow */}
            <circle cx="50" cy="50" r="35" fill="#7f1d1d" opacity="0.45" filter="blur(8px)" />
            {/* Sword 1 */}
            <line x1="20" y1="20" x2="80" y2="80" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
            <line x1="16" y1="28" x2="28" y2="16" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            {/* Sword 2 */}
            <line x1="80" y1="20" x2="20" y2="80" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
            <line x1="72" y1="16" x2="84" y2="28" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
            {/* Shield Center */}
            <path d="M 50 30 L 68 38 L 64 62 L 50 78 L 36 62 L 32 38 Z" fill="#2d0b10" stroke="#dc2626" strokeWidth="2.5" />
            <path d="M 50 36 L 62 42 L 59 58 L 50 70 L 41 58 L 38 42 Z" fill="#170608" stroke="#f59e0b" strokeWidth="1.5" />
            {/* Skull Center */}
            <circle cx="50" cy="50" r="7" fill="#f8fafc" />
            <rect x="46" y="55" width="8" height="4" fill="#f8fafc" rx="1" />
            <circle cx="48" cy="49" r="1.5" fill="#0b0709" />
            <circle cx="52" cy="49" r="1.5" fill="#0b0709" />
          </svg>
        </div>

        {/* Title Lockup Prose */}
        <h1 className="font-cinzel text-4xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-red-200 to-red-600 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          GRIMBLADE
        </h1>
        <div className="font-cinzel text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-amber-500/90 mt-2">
          16-Bit Action RPG · Zelda 3 &amp; Diablo
        </div>

        <p className="mt-4 text-xs md:text-sm text-slate-300 max-w-md font-sans leading-relaxed">
          Fluid sword &amp; shield combat, procedural Diablo loot, visceral gore dismemberment, and infinite catacombs exploration.
        </p>

        {/* Action Button (Single Player Start) */}
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onStartGame}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-red-700 via-red-600 to-red-800 hover:from-red-600 hover:to-red-700 text-amber-100 rounded-lg font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-2xl shadow-red-950 border border-red-500/80 active:scale-98 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-amber-200" />
            <span>START GAME</span>
          </button>
        </div>
      </div>

      {/* Flat Control-Hint Line (Per Game Craft Guidelines) */}
      <div className="z-10 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-center gap-2 md:gap-3 text-center">
        <span>WASD / Touch Joystick Move</span>
        <span>·</span>
        <span>Space Sword Attack</span>
        <span>·</span>
        <span>Shift Shield Block</span>
        <span>·</span>
        <span>Q Spin Attack</span>
        <span>·</span>
        <span>E Dash</span>
      </div>
    </div>
  );
};
