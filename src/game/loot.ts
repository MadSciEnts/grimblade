/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EquipmentItem, ItemAffix, ItemRarity, ItemSlot, Player } from './types';
import { PALETTE } from './textures';

const PREFIXES = [
  { name: 'Savage', stat: 'attack' as const, mult: 1.3 },
  { name: 'Bloodforged', stat: 'attack' as const, mult: 1.4 },
  { name: 'Impenetrable', stat: 'defense' as const, mult: 1.35 },
  { name: 'Titanic', stat: 'maxHp' as const, mult: 1.4 },
  { name: 'Quickened', stat: 'speed' as const, mult: 1.25 },
  { name: 'Lethal', stat: 'critChance' as const, mult: 1.5 },
  { name: 'Vampiric', stat: 'lifeSteal' as const, mult: 1.6 },
  { name: 'Spiked', stat: 'thorns' as const, mult: 1.4 },
  { name: 'Demonic', stat: 'attack' as const, mult: 1.5 },
  { name: 'Obsidian', stat: 'defense' as const, mult: 1.5 },
];

const SUFFIXES = [
  { name: 'of Carnage', stat: 'critChance' as const, mult: 1.4 },
  { name: 'of the Bear', stat: 'maxHp' as const, mult: 1.35 },
  { name: 'of Deflection', stat: 'defense' as const, mult: 1.3 },
  { name: 'of Slaughter', stat: 'attack' as const, mult: 1.4 },
  { name: 'of the Bat', stat: 'lifeSteal' as const, mult: 1.5 },
  { name: 'of the Wind', stat: 'speed' as const, mult: 1.3 },
  { name: 'of Retribution', stat: 'thorns' as const, mult: 1.5 },
  { name: 'of Torment', stat: 'attack' as const, mult: 1.45 },
];

const BASE_ITEMS: Record<ItemSlot, { name: string; color: string; baseAtk: number; baseDef: number; baseHp: number; baseDurability: number }[]> = {
  weapon: [
    { name: 'Rusty Blade', color: PALETTE.ironDark, baseAtk: 6, baseDef: 0, baseHp: 0, baseDurability: 40 },
    { name: 'Steel Broadsword', color: PALETTE.ironLight, baseAtk: 12, baseDef: 1, baseHp: 0, baseDurability: 60 },
    { name: 'Executioner Greatsword', color: '#334155', baseAtk: 18, baseDef: 0, baseHp: 10, baseDurability: 75 },
    { name: 'Demonic Flamberge', color: '#b91c1c', baseAtk: 26, baseDef: 2, baseHp: 20, baseDurability: 90 },
    { name: 'Blood Drinker', color: '#7f1d1d', baseAtk: 35, baseDef: 0, baseHp: 30, baseDurability: 110 },
  ],
  shield: [
    { name: 'Round Buckler', color: PALETTE.woodMid, baseAtk: 0, baseDef: 4, baseHp: 5, baseDurability: 50 },
    { name: 'Iron Kite Shield', color: PALETTE.ironMid, baseAtk: 0, baseDef: 8, baseHp: 15, baseDurability: 70 },
    { name: 'Knight Heater Shield', color: '#1e293b', baseAtk: 1, baseDef: 14, baseHp: 25, baseDurability: 90 },
    { name: 'Aegis of Thorns', color: '#450a0a', baseAtk: 3, baseDef: 20, baseHp: 40, baseDurability: 110 },
    { name: 'Gargoyle Bulwark', color: '#0f172a', baseAtk: 2, baseDef: 28, baseHp: 60, baseDurability: 140 },
  ],
  armor: [
    { name: 'Worn Leather Tunic', color: PALETTE.clothLeather, baseAtk: 0, baseDef: 3, baseHp: 10, baseDurability: 45 },
    { name: 'Chainmail Hauberk', color: PALETTE.ironDark, baseAtk: 0, baseDef: 7, baseHp: 25, baseDurability: 65 },
    { name: 'Knight Steel Cuirass', color: PALETTE.ironLight, baseAtk: 0, baseDef: 13, baseHp: 45, baseDurability: 85 },
    { name: 'Dreadplate of the Damned', color: '#18181b', baseAtk: 2, baseDef: 21, baseHp: 75, baseDurability: 110 },
    { name: 'Infernal Bloodmail', color: '#991b1b', baseAtk: 4, baseDef: 30, baseHp: 110, baseDurability: 140 },
  ],
  helmet: [
    { name: 'Leather Coif', color: PALETTE.clothLeather, baseAtk: 0, baseDef: 2, baseHp: 8, baseDurability: 40 },
    { name: 'Iron Bascinet', color: PALETTE.ironMid, baseAtk: 0, baseDef: 5, baseHp: 18, baseDurability: 60 },
    { name: 'Crusader Greathelm', color: PALETTE.ironLight, baseAtk: 1, baseDef: 9, baseHp: 32, baseDurability: 80 },
    { name: 'Horned Demon Visor', color: '#450a0a', baseAtk: 3, baseDef: 15, baseHp: 55, baseDurability: 100 },
    { name: 'Crown of Torment', color: '#d97706', baseAtk: 5, baseDef: 22, baseHp: 85, baseDurability: 130 },
  ],
  boots: [
    { name: 'Tattered Greaves', color: PALETTE.clothLeather, baseAtk: 0, baseDef: 1, baseHp: 5, baseDurability: 40 },
    { name: 'Reinforced Boots', color: PALETTE.ironDark, baseAtk: 0, baseDef: 3, baseHp: 12, baseDurability: 55 },
    { name: 'Knight Sabatons', color: PALETTE.ironLight, baseAtk: 0, baseDef: 7, baseHp: 22, baseDurability: 75 },
    { name: 'Shadow Striders', color: '#172554', baseAtk: 2, baseDef: 11, baseHp: 38, baseDurability: 95 },
    { name: 'Bloodstrider Greaves', color: '#7f1d1d', baseAtk: 3, baseDef: 16, baseHp: 60, baseDurability: 120 },
  ],
};

const LEGENDARY_SPECIALS = [
  'Slain enemies explode in a 360-degree blood nova.',
  'Shield block reflects 50% of melee damage back to attackers.',
  'Spin Attack charge time reduced by 50% with flame wave.',
  'Striking bleeding enemies grants +25% attack speed.',
  'Restores 8% Max HP on critical strike.',
];

export function generateLootItem(playerLevel: number, forcedRarity?: ItemRarity): EquipmentItem {
  const slots: ItemSlot[] = ['weapon', 'shield', 'armor', 'helmet', 'boots'];
  const slot = slots[Math.floor(Math.random() * slots.length)];

  // Rarity determination
  let rarity: ItemRarity = forcedRarity || 'common';
  if (!forcedRarity) {
    const roll = Math.random();
    if (roll < 0.45) rarity = 'common';
    else if (roll < 0.75) rarity = 'magic';
    else if (roll < 0.92) rarity = 'rare';
    else if (roll < 0.985) rarity = 'legendary';
    else rarity = 'mythic';
  }

  // Pick base tier according to player level
  const baseList = BASE_ITEMS[slot];
  const maxTierIndex = Math.min(baseList.length - 1, Math.floor((playerLevel - 1) / 2));
  const tierIndex = Math.min(baseList.length - 1, Math.floor(Math.random() * (maxTierIndex + 1)));
  const base = baseList[tierIndex];

  // Affixes
  const affixes: ItemAffix[] = [];
  let prefixName = '';
  let suffixName = '';

  const numAffixes = rarity === 'common' ? 0 : rarity === 'magic' ? 1 : rarity === 'rare' ? 2 : rarity === 'legendary' ? 3 : 4;

  const usedStats = new Set<string>();
  for (let i = 0; i < numAffixes; i++) {
    if (i === 0 && Math.random() > 0.3) {
      const p = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
      if (!usedStats.has(p.stat)) {
        usedStats.add(p.stat);
        prefixName = p.name;
        affixes.push({
          name: p.name,
          stat: p.stat,
          value: Math.round(playerLevel * p.mult * 2),
        });
      }
    } else {
      const s = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
      if (!usedStats.has(s.stat)) {
        usedStats.add(s.stat);
        if (!suffixName) suffixName = s.name;
        affixes.push({
          name: s.name,
          stat: s.stat,
          value: Math.round(playerLevel * s.mult * 2),
        });
      }
    }
  }

  let finalName = base.name;
  if (prefixName) finalName = `${prefixName} ${finalName}`;
  if (suffixName) finalName = `${finalName} ${suffixName}`;

  // Stat calculations
  let attack = base.baseAtk + Math.round(playerLevel * 1.5);
  let defense = base.baseDef + Math.round(playerLevel * 1.2);
  let hp = base.baseHp + Math.round(playerLevel * 5);
  let speed = 0;
  let crit = 5;
  let lifeSteal = 0;
  let thorns = 0;

  for (const aff of affixes) {
    if (aff.stat === 'attack') attack += aff.value;
    if (aff.stat === 'defense') defense += aff.value;
    if (aff.stat === 'maxHp') hp += aff.value;
    if (aff.stat === 'speed') speed += aff.value * 0.1;
    if (aff.stat === 'critChance') crit += Math.min(25, aff.value);
    if (aff.stat === 'lifeSteal') lifeSteal += Math.min(15, aff.value);
    if (aff.stat === 'thorns') thorns += aff.value;
  }

  // Durability
  const maxDurability = Math.round(base.baseDurability * (1 + playerLevel * 0.1));
  const durability = maxDurability; // Drops at full durability

  // Color tint based on rarity or base
  let itemColor = base.color;
  if (rarity === 'legendary') itemColor = '#f59e0b';
  if (rarity === 'mythic') itemColor = '#dc2626';

  const specialEffect = rarity === 'legendary' || rarity === 'mythic' ? LEGENDARY_SPECIALS[Math.floor(Math.random() * LEGENDARY_SPECIALS.length)] : undefined;

  const value = Math.round((tierIndex + 1) * 20 * (rarity === 'common' ? 1 : rarity === 'magic' ? 2.5 : rarity === 'rare' ? 5 : rarity === 'legendary' ? 12 : 25));

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: finalName,
    slot,
    rarity,
    level: playerLevel,
    attackBonus: attack,
    defenseBonus: defense,
    hpBonus: hp,
    speedBonus: speed,
    critChance: crit,
    lifeSteal,
    thorns,
    durability,
    maxDurability,
    affixes,
    spriteIndex: tierIndex,
    color: itemColor,
    specialEffect,
    value,
  };
}

export function createStarterEquipment(playerIndex: number = 0): Player['equipment'] {
  const isP2 = playerIndex === 1;
  return {
    weapon: {
      id: `starter_weapon_${playerIndex}`,
      name: isP2 ? 'Iron Falchion' : 'Novice Broadsword',
      slot: 'weapon',
      rarity: 'common',
      level: 1,
      attackBonus: 8,
      defenseBonus: 0,
      hpBonus: 0,
      speedBonus: 0,
      critChance: 5,
      lifeSteal: 0,
      thorns: 0,
      durability: 50,
      maxDurability: 50,
      affixes: [],
      spriteIndex: 0,
      color: PALETTE.ironMid,
      value: 15,
    },
    shield: {
      id: `starter_shield_${playerIndex}`,
      name: isP2 ? 'Spiked Buckler' : 'Wooden Heater Shield',
      slot: 'shield',
      rarity: 'common',
      level: 1,
      attackBonus: 0,
      defenseBonus: 6,
      hpBonus: 10,
      speedBonus: 0,
      critChance: 0,
      lifeSteal: 0,
      thorns: isP2 ? 2 : 0,
      durability: 60,
      maxDurability: 60,
      affixes: [],
      spriteIndex: 0,
      color: isP2 ? PALETTE.stoneDark : PALETTE.woodMid,
      value: 15,
    },
    armor: {
      id: `starter_armor_${playerIndex}`,
      name: isP2 ? 'Mercenary Jerkin' : 'Knight Apprentice Tunic',
      slot: 'armor',
      rarity: 'common',
      level: 1,
      attackBonus: 0,
      defenseBonus: 4,
      hpBonus: 15,
      speedBonus: 0,
      critChance: 0,
      lifeSteal: 0,
      thorns: 0,
      durability: 50,
      maxDurability: 50,
      affixes: [],
      spriteIndex: 0,
      color: isP2 ? PALETTE.clothGold : PALETTE.clothCrimson,
      value: 20,
    },
    helmet: {
      id: `starter_helmet_${playerIndex}`,
      name: isP2 ? 'Leather Cap' : 'Iron Apprentice Sallet',
      slot: 'helmet',
      rarity: 'common',
      level: 1,
      attackBonus: 0,
      defenseBonus: 3,
      hpBonus: 5,
      speedBonus: 0,
      critChance: 0,
      lifeSteal: 0,
      thorns: 0,
      durability: 45,
      maxDurability: 45,
      affixes: [],
      spriteIndex: 0,
      color: PALETTE.ironDark,
      value: 10,
    },
    boots: {
      id: `starter_boots_${playerIndex}`,
      name: 'Padded Greaves',
      slot: 'boots',
      rarity: 'common',
      level: 1,
      attackBonus: 0,
      defenseBonus: 2,
      hpBonus: 5,
      speedBonus: 0.2,
      critChance: 0,
      lifeSteal: 0,
      thorns: 0,
      durability: 45,
      maxDurability: 45,
      affixes: [],
      spriteIndex: 0,
      color: PALETTE.clothLeather,
      value: 10,
    },
  };
}

export function getRarityColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'common': return '#e2e8f0';
    case 'magic': return '#60a5fa';
    case 'rare': return '#facc15';
    case 'legendary': return '#fb923c';
    case 'mythic': return '#ef4444';
  }
}
