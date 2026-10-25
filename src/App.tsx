/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { VirtualControls } from './components/VirtualControls';
import { InventoryModal } from './components/InventoryModal';
import { QuestsModal } from './components/QuestsModal';
import { ApkExportModal } from './components/ApkExportModal';
import { SpriteSheetModal } from './components/SpriteSheetModal';
import { gameEngine } from './game/engine';
import { EquipmentItem, Player, Quest } from './game/types';
import { RotateCcw, Skull } from 'lucide-react';

type ScreenState = 'TITLE' | 'PLAYING' | 'GAME_OVER';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [players, setPlayers] = useState<Player[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [dungeonName, setDungeonName] = useState('Flooded Warrens');

  // Active Modals
  const [showInventory, setShowInventory] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showApkExport, setShowApkExport] = useState(false);
  const [showSpriteSheets, setShowSpriteSheets] = useState(false);

  // Ambient lighting preset state ('moody' by default for dark fantasy atmosphere)
  const [ambientPreset, setAmbientPreset] = useState<'moody' | 'balanced' | 'bright'>('moody');

  // Virtual on-screen touch controls visibility
  const [virtualControlsVisible, setVirtualControlsVisible] = useState(true);

  useEffect(() => {
    // Default virtual controls on for touch devices or smaller viewports
    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 1024;
    setVirtualControlsVisible(isTouch);
  }, []);

  // Hook into engine updates
  useEffect(() => {
    gameEngine.onStateUpdate = () => {
      setPlayers([...gameEngine.players]);
      setQuests([...gameEngine.quests]);
      setCurrentFloor(gameEngine.currentFloor);
      if (gameEngine.dungeon) {
        setDungeonName(gameEngine.dungeon.name);
      }
    };

    gameEngine.onGameOver = () => {
      setScreen('GAME_OVER');
    };

    return () => {
      gameEngine.destroy();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    setScreen('PLAYING');
    gameEngine.start();
    setPlayers([...gameEngine.players]);
    setQuests([...gameEngine.quests]);
  }, []);

  const handleRestart = () => {
    setScreen('PLAYING');
    gameEngine.start();
  };

  const handleEquipItem = (newItem: EquipmentItem) => {
    const p1 = gameEngine.players[0];
    if (!p1) return;

    // Current item in that slot
    const currentEquipped = p1.equipment[newItem.slot];

    // Remove new item from inventory
    const itemIndex = p1.inventory.findIndex((i) => i.id === newItem.id);
    if (itemIndex >= 0) {
      p1.inventory.splice(itemIndex, 1);
    }

    // Add current back to inventory
    if (currentEquipped) {
      p1.inventory.push(currentEquipped);
    }

    // Equip
    p1.equipment[newItem.slot] = newItem;

    // Recalculate player HP if maxHp increased
    let totalHpBonus = 0;
    Object.values(p1.equipment).forEach((item) => {
      totalHpBonus += item.hpBonus || 0;
    });
    p1.stats.maxHp = 100 + (p1.stats.level - 1) * 20 + totalHpBonus;
    p1.stats.hp = Math.min(p1.stats.hp, p1.stats.maxHp);

    setPlayers([...gameEngine.players]);
  };

  const handleRepairAll = () => {
    const p1 = gameEngine.players[0];
    if (!p1) return;

    const repairCost = Math.round(
      Object.values(p1.equipment).reduce((sum, item) => {
        const lost = item.maxDurability - item.durability;
        return sum + lost * 1.5;
      }, 0)
    );

    if (p1.stats.gold >= repairCost && repairCost > 0) {
      p1.stats.gold -= repairCost;
      Object.values(p1.equipment).forEach((item) => {
        item.durability = item.maxDurability;
      });
      setPlayers([...gameEngine.players]);
    }
  };

  const handleClaimQuest = (questId: string) => {
    const q = gameEngine.quests.find((quest) => quest.id === questId);
    const p1 = gameEngine.players[0];
    if (!q || !p1 || q.claimed) return;

    q.claimed = true;
    p1.stats.gold += q.goldReward;
    p1.stats.xp += q.xpReward;

    // Add reward item
    import('./game/loot').then(({ generateLootItem }) => {
      const rewardItem = generateLootItem(p1.stats.level, q.rewardItemRarity);
      if (p1.inventory.length < 24) {
        p1.inventory.push(rewardItem);
      }
      setPlayers([...gameEngine.players]);
      setQuests([...gameEngine.quests]);
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050405] font-sans">
      {/* 1. Underlying 60fps Game Canvas */}
      <GameCanvas />

      {/* 2. Title Screen State */}
      {screen === 'TITLE' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenApkExport={() => setShowApkExport(true)}
          onOpenSpriteSheets={() => setShowSpriteSheets(true)}
        />
      )}

      {/* 3. Active Playing State */}
      {screen === 'PLAYING' && (
        <>
          <HUD
            player={players[0]}
            quests={quests}
            currentFloor={currentFloor}
            dungeonName={dungeonName}
            virtualControlsVisible={virtualControlsVisible}
            ambientPreset={ambientPreset}
            onCycleAmbientLight={() => setAmbientPreset(gameEngine.cycleAmbientLight())}
            onToggleVirtualControls={() => setVirtualControlsVisible(!virtualControlsVisible)}
            onOpenInventory={() => setShowInventory(true)}
            onOpenQuests={() => setShowQuests(true)}
            onOpenSpriteSheets={() => setShowSpriteSheets(true)}
            onOpenApkExport={() => setShowApkExport(true)}
          />

          {/* On-Screen Mobile Virtual Controls (Joystick & Action Buttons) */}
          {virtualControlsVisible && <VirtualControls />}
        </>
      )}

      {/* 4. Game Over State Modal */}
      {screen === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm select-none">
          <div className="w-full max-w-md bg-[#12090b] border-2 border-red-900 rounded-xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-700 flex items-center justify-center mx-auto mb-4">
              <Skull className="w-8 h-8 text-red-500 animate-pulse" />
            </div>

            <h2 className="font-cinzel font-black text-2xl text-red-400 tracking-wider">
              YOU DIED
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              The darkness of the dungeon claimed your flesh.
            </p>

            {/* Run Stats */}
            <div className="grid grid-cols-2 gap-2 my-5 text-xs font-mono bg-[#1a0c10] p-3 rounded-lg border border-red-950">
              <div className="text-left">
                <span className="text-slate-500">Deepest Floor:</span>
                <div className="text-amber-300 font-bold">{currentFloor}</div>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Enemies Slain:</span>
                <div className="text-red-400 font-bold">{players[0]?.stats.killCount || 0}</div>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Gold Plundered:</span>
                <div className="text-amber-400 font-bold">🪙 {players[0]?.stats.gold || 0}</div>
              </div>
              <div className="text-left">
                <span className="text-slate-500">Hero Level:</span>
                <div className="text-sky-400 font-bold">Lv. {players[0]?.stats.level || 1}</div>
              </div>
            </div>

            <button
              onClick={handleRestart}
              className="w-full py-3 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-cinzel font-bold text-sm tracking-wide rounded-lg flex items-center justify-center gap-2 border border-red-500 shadow-xl transition active:scale-98 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESPAWN &amp; TRY AGAIN</span>
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showInventory && players[0] && (
        <InventoryModal
          player={players[0]}
          onClose={() => setShowInventory(false)}
          onEquipItem={handleEquipItem}
          onRepairAll={handleRepairAll}
        />
      )}

      {showQuests && players[0] && (
        <QuestsModal
          quests={quests}
          player={players[0]}
          onClose={() => setShowQuests(false)}
          onClaimQuest={handleClaimQuest}
        />
      )}

      {showApkExport && (
        <ApkExportModal onClose={() => setShowApkExport(false)} />
      )}

      {showSpriteSheets && (
        <SpriteSheetModal onClose={() => setShowSpriteSheets(false)} />
      )}
    </div>
  );
}
