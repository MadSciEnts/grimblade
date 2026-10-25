/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { gameEngine } from '../game/engine';

interface GameCanvasProps {
  onCanvasReady?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Handle high DPI & crisp pixelated integer scaling
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      
      // Native resolution
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      // CSS display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    gameEngine.init(canvas);
    if (onCanvasReady) onCanvasReady();

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [onCanvasReady]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[#050405] touch-none select-none"
    >
      <canvas
        ref={canvasRef}
        className="pixelated w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
};
