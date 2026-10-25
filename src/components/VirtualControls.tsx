/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback } from 'react';
import { inputManager } from '../game/input';
import { Shield, Sparkles, Zap, Heart, Sword } from 'lucide-react';

export const VirtualControls: React.FC = () => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);

  const triggerHaptic = (ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore vibration errors
    }
  };

  const updateJoystickFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;

    let nx = dx;
    let ny = dy;
    if (dist > maxRadius) {
      nx = (dx / dist) * maxRadius;
      ny = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: nx, y: ny });

    // Normalize -1.0 to 1.0
    const normX = nx / maxRadius;
    const normY = ny / maxRadius;

    inputManager.mobileJoystick = {
      x: normX,
      y: normY,
    };
  }, []);

  // Pointer Down (Supports both Touch & Mouse Click)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      //
    }
    activePointerIdRef.current = e.pointerId;
    setJoystickActive(true);
    triggerHaptic(10);
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  // Pointer Move (Continuously tracked across whole screen)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      //
    }
    activePointerIdRef.current = null;
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
    inputManager.mobileJoystick = { x: 0, y: 0 };
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex justify-between items-end p-4 md:p-6 pb-6 md:pb-8 touch-none">
      {/* LEFT: Virtual Analog Joystick */}
      <div
        ref={joystickBaseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`pointer-events-auto relative w-32 h-32 rounded-full bg-black/60 border-2 transition-colors flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing touch-none select-none ${
          joystickActive ? 'border-red-500 shadow-red-950/80 bg-red-950/30' : 'border-red-900/60'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Crosshair guide */}
        <div className="w-14 h-14 rounded-full border border-red-500/25 flex items-center justify-center pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
        </div>

        {/* Dynamic Analog Knob */}
        <div
          style={{
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            touchAction: 'none',
          }}
          className={`absolute w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-950 border-2 border-red-400 flex items-center justify-center shadow-xl pointer-events-none transition-shadow ${
            joystickActive ? 'shadow-red-500/60 scale-105' : 'scale-100'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-amber-300/80 shadow-xs" />
        </div>
      </div>

      {/* RIGHT: Action Clusters (Anchored further left to avoid Android edge buttons, Heart button at bottom left) */}
      <div className="pointer-events-auto flex items-end gap-3 touch-none mr-6 md:mr-10">
        {/* Secondary cluster: Dash, Spin, and Heart at bottom left */}
        <div className="flex flex-col justify-end gap-2.5 items-center pb-1">
          {/* Dash / Roll Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(20);
              inputManager.mobileDashJustPressed = true;
            }}
            className="w-12 h-12 rounded-full bg-slate-900/90 border-2 border-sky-400 text-sky-200 flex items-center justify-center shadow-lg active:scale-90 active:bg-sky-800 transition cursor-pointer touch-none"
            title="Dash / Dodge Roll"
            style={{ touchAction: 'none' }}
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* Spin Whirlwind Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(30);
              inputManager.mobileSpinHeld = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputManager.mobileSpinHeld = false;
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              inputManager.mobileSpinHeld = false;
            }}
            className="w-12 h-12 rounded-full bg-amber-950/90 border-2 border-amber-500 text-amber-200 flex items-center justify-center shadow-lg active:scale-90 active:bg-amber-800 transition cursor-pointer touch-none"
            title="Hold to Charge Spin Attack"
            style={{ touchAction: 'none' }}
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Potion Button (Heart) moved to bottom left */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(20);
              inputManager.mobilePotionJustPressed = true;
            }}
            className="w-12 h-12 rounded-full bg-emerald-950/90 border-2 border-emerald-500 text-emerald-300 flex items-center justify-center shadow-lg active:scale-90 active:bg-emerald-800 transition cursor-pointer touch-none mt-1"
            title="Drink Health Potion"
            style={{ touchAction: 'none' }}
          >
            <Heart className="w-5 h-5 fill-emerald-500/50" />
          </button>
        </div>

        {/* Primary cluster: Shield & Sword Attack */}
        <div className="flex flex-col gap-3 items-center touch-none">
          {/* Shield Defend Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(25);
              inputManager.mobileShieldHeld = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputManager.mobileShieldHeld = false;
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              inputManager.mobileShieldHeld = false;
            }}
            className="w-14 h-14 rounded-full bg-blue-950/90 border-2 border-blue-400 text-blue-200 flex flex-col items-center justify-center shadow-xl active:scale-90 active:bg-blue-800 transition cursor-pointer touch-none"
            title="Hold to Raise Shield"
            style={{ touchAction: 'none' }}
          >
            <Shield className="w-6 h-6 fill-blue-500/40" />
          </button>

          {/* Zelda 3 Sword Attack Button (Large Primary) */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerHaptic(30);
              inputManager.mobileAttackHeld = true;
              inputManager.mobileAttackJustPressed = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              inputManager.mobileAttackHeld = false;
            }}
            onPointerCancel={(e) => {
              e.preventDefault();
              inputManager.mobileAttackHeld = false;
            }}
            className="w-18 h-18 rounded-full bg-gradient-to-br from-red-600 to-red-950 border-3 border-amber-400 text-amber-200 flex flex-col items-center justify-center shadow-2xl shadow-red-950 active:scale-92 active:brightness-125 transition cursor-pointer touch-none"
            title="Sword Attack (Tap to Slash, Hold to Charge)"
            style={{ touchAction: 'none' }}
          >
            <Sword className="w-8 h-8 fill-amber-300/40" />
            <span className="text-[9px] font-pixel text-amber-300 mt-0.5">SLASH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
