/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EquipmentItem, ItemSlot, Player } from '../game/types';
import { getRarityColor } from '../game/loot';
import { soundEngine } from '../game/audio';
import { X, Wrench, Shield, Sword, Heart, Zap, Sparkles, AlertTriangle, Backpack } from 'lucide-react';

interface InventoryModalProps {
  player: Player;
  onClose: () => void;
  onEquipItem: (item: EquipmentItem) => void;
  onRepairAll: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onEquipItem,
  onRepairAll,
}) => {
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const repairCost = Math.round(
    Object.values(player.equipment).reduce((sum, item) => {
      const lost = item.maxDurability - item.durability;
      return sum + lost * 1.5;
    }, 0)
  );

  const handleEquip = (item: EquipmentItem) => {
    onEquipItem(item);
    soundEngine.playShieldBlock();
    setSelectedItem(null);
  };

  const handleRepair = () => {
    if (player.stats.gold >= repairCost && repairCost > 0) {
      onRepairAll();
      soundEngine.playShieldBlock();
    }
  };

  const renderSlotCard = (slotName: string, item: EquipmentItem) => {
    const durRatio = item.durability / Math.max(1, item.maxDurability);
    const isDamaged = durRatio < 0.5;
    const isSeverelyDamaged = durRatio < 0.25;

    return (
      <div
        onClick={() => setSelectedItem(item)}
        className={`p-2.5 rounded-lg border bg-[#140e11] cursor-pointer transition hover:brightness-110 ${
          selectedItem?.id === item.id ? 'border-amber-400 shadow-md shadow-amber-950/40' : 'border-slate-800'
        }`}
      >
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono uppercase">
          <span>{slotName}</span>
          <span style={{ color: getRarityColor(item.rarity) }} className="capitalize font-bold">
            {item.rarity}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-8 h-8 rounded border flex items-center justify-center shrink-0"
            style={{ borderColor: getRarityColor(item.rarity), backgroundColor: '#1e1418' }}
          >
            <div className="w-4 h-4 rounded-xs" style={{ backgroundColor: item.color }} />
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-slate-100 truncate">{item.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {item.attackBonus > 0 && `+${item.attackBonus} ATK `}
              {item.defenseBonus > 0 && `+${item.defenseBonus} DEF `}
              {item.hpBonus > 0 && `+${item.hpBonus} HP`}
            </div>
          </div>
        </div>

        {/* Durability bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[9px] font-mono mb-0.5">
            <span className={isSeverelyDamaged ? 'text-red-400 font-bold' : isDamaged ? 'text-amber-400' : 'text-slate-400'}>
              {isSeverelyDamaged ? 'BROKEN / CRACKED' : isDamaged ? 'WORN' : 'Durability'}
            </span>
            <span className="tabular-nums text-slate-300">
              {item.durability} / {item.maxDurability}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-xs overflow-hidden">
            <div
              className={`h-full ${
                isSeverelyDamaged ? 'bg-red-500 animate-pulse' : isDamaged ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${durRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-xs select-none">
      <div className="w-full max-w-3xl bg-[#0e090b] border-2 border-red-950/80 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-red-950/60 bg-[#160c0f]">
          <div className="flex items-center gap-3">
            <h2 className="font-cinzel font-bold text-lg text-amber-200 tracking-wide">
              {player.name} · Equipment & Inventory
            </h2>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
              🪙 {player.stats.gold} Gold
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Repair All Button */}
            <button
              onClick={handleRepair}
              disabled={repairCost === 0 || player.stats.gold < repairCost}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition ${
                repairCost > 0 && player.stats.gold >= repairCost
                  ? 'bg-amber-900/60 border-amber-500 text-amber-200 hover:bg-amber-800 cursor-pointer'
                  : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              title="Repair all equipment durability at Blacksmith Anvil"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Repair All ({repairCost} Gold)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: 2 Columns (Left: Equipped Paper-Doll, Right: Inventory & Inspection) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: EQUIPPED PAPER-DOLL SLOTS */}
          <div className="space-y-2.5">
            <h3 className="font-cinzel text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Equipped Armament (Visual Layers)
            </h3>
            {renderSlotCard('Weapon', player.equipment.weapon)}
            {renderSlotCard('Shield', player.equipment.shield)}
            {renderSlotCard('Chest Armor', player.equipment.armor)}
            {renderSlotCard('Helmet', player.equipment.helmet)}
            {renderSlotCard('Boots', player.equipment.boots)}
          </div>

          {/* RIGHT: INVENTORY GRID & INSPECTED ITEM DETAIL */}
          <div className="flex flex-col gap-3">
            <h3 className="font-cinzel text-xs font-bold text-slate-300 uppercase tracking-wider">
              Loot Satchel ({player.inventory.length}/24)
            </h3>

            {/* Inventory Grid */}
            <div className="grid grid-cols-6 gap-2 bg-[#120b0e] p-2.5 rounded-lg border border-slate-800/80 min-h-[140px]">
              {Array.from({ length: 24 }).map((_, idx) => {
                const item = player.inventory[idx];
                const isSelected = item && selectedItem?.id === item.id;

                if (!item) {
                  return (
                    <div
                      key={idx}
                      className="aspect-square rounded border border-slate-900/80 bg-[#160e12]/40"
                    />
                  );
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{ borderColor: getRarityColor(item.rarity) }}
                    className={`aspect-square rounded border-2 bg-[#1e1317] flex items-center justify-center cursor-pointer relative hover:brightness-125 transition ${
                      isSelected ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <div className="w-4 h-4 rounded-xs" style={{ backgroundColor: item.color }} />
                    {/* Durability indicator dot */}
                    {item.durability < item.maxDurability * 0.3 && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Item Tooltip Inspection */}
            {selectedItem ? (
              <div
                className="bg-[#140e11] border-2 rounded-lg p-3 flex-1 flex flex-col justify-between"
                style={{ borderColor: getRarityColor(selectedItem.rarity) }}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4
                        className="font-bold text-sm"
                        style={{ color: getRarityColor(selectedItem.rarity) }}
                      >
                        {selectedItem.name}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-400 capitalize">
                        {selectedItem.rarity} {selectedItem.slot} · Item Level {selectedItem.level}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-400">🪙 {selectedItem.value}</span>
                  </div>

                  {/* Core Stats */}
                  <div className="mt-2 space-y-1 text-xs font-mono">
                    {selectedItem.attackBonus > 0 && (
                      <div className="text-amber-200">⚔ +{selectedItem.attackBonus} Attack Damage</div>
                    )}
                    {selectedItem.defenseBonus > 0 && (
                      <div className="text-blue-200">🛡 +{selectedItem.defenseBonus} Armor Defense</div>
                    )}
                    {selectedItem.hpBonus > 0 && (
                      <div className="text-emerald-200">❤ +{selectedItem.hpBonus} Max Health</div>
                    )}
                    {selectedItem.critChance > 0 && (
                      <div className="text-yellow-200">⚡ +{selectedItem.critChance}% Critical Chance</div>
                    )}
                    {selectedItem.lifeSteal > 0 && (
                      <div className="text-rose-300">🩸 +{selectedItem.lifeSteal}% Life Steal on Hit</div>
                    )}
                    {selectedItem.thorns > 0 && (
                      <div className="text-orange-300">🌵 +{selectedItem.thorns} Thorns Reflect Damage</div>
                    )}
                  </div>

                  {/* Legendary Special Affix */}
                  {selectedItem.specialEffect && (
                    <div className="mt-2 p-2 bg-amber-950/30 border border-amber-700/40 rounded text-xs text-amber-300 italic">
                      ✨ {selectedItem.specialEffect}
                    </div>
                  )}

                  {/* Durability Condition */}
                  <div className="mt-2 text-[11px] font-mono text-slate-400">
                    Durability: {selectedItem.durability} / {selectedItem.maxDurability}
                    {selectedItem.durability < selectedItem.maxDurability * 0.3 && (
                      <span className="text-red-400 ml-2 font-bold">⚠️ Damaged / Cracked</span>
                    )}
                  </div>
                </div>

                {/* Equip Button if from inventory */}
                {player.inventory.some((i) => i.id === selectedItem.id) && (
                  <button
                    onClick={() => handleEquip(selectedItem)}
                    className="mt-3 w-full py-2 bg-gradient-to-r from-red-700 to-red-900 border border-red-500 rounded-md text-xs font-bold text-white hover:brightness-110 active:scale-98 transition cursor-pointer"
                  >
                    Equip to {selectedItem.slot.toUpperCase()}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#140e11] border border-slate-800 rounded-lg p-4 flex-1 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <Backpack className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                Select any piece of equipment or inventory loot to inspect stats, durability, and affixes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
