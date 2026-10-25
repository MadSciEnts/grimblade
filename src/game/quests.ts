/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ItemRarity, Quest } from './types';

const QUEST_TEMPLATES = [
  {
    title: 'Cleansing the Sunken Slime',
    desc: 'Eradicate the corrosive acid slimes festering in the dungeon waterways.',
    type: 'kill' as const,
    targetType: 'slime',
    countMin: 5,
    countMax: 9,
    goldBase: 60,
    xpBase: 120,
    rarity: 'magic' as ItemRarity,
  },
  {
    title: 'Goblin Blood Tithe',
    desc: 'Hunt down goblin raiders and claim their plunder.',
    type: 'kill' as const,
    targetType: 'goblin',
    countMin: 6,
    countMax: 10,
    goldBase: 90,
    xpBase: 180,
    rarity: 'rare' as ItemRarity,
  },
  {
    title: 'The Restless Bone Crypts',
    desc: 'Smash crypt skeletons back to dust and scatter their cursed relics.',
    type: 'kill' as const,
    targetType: 'skeleton',
    countMin: 7,
    countMax: 12,
    goldBase: 120,
    xpBase: 240,
    rarity: 'rare' as ItemRarity,
  },
  {
    title: 'Acolytes of the Flesh',
    desc: 'Purify the dark cultists and sever their necromantic rites.',
    type: 'kill' as const,
    targetType: 'cultist',
    countMin: 4,
    countMax: 8,
    goldBase: 160,
    xpBase: 320,
    rarity: 'legendary' as ItemRarity,
  },
  {
    title: 'Desecrated Blood Altars',
    desc: 'Sanctify the desecrated sacrificial altars hidden within the deep crypts.',
    type: 'altars' as const,
    countMin: 2,
    countMax: 3,
    goldBase: 200,
    xpBase: 400,
    rarity: 'legendary' as ItemRarity,
  },
  {
    title: 'Slayer of Abominations',
    desc: 'Slay the stitched flesh horrors lurking in the lower oubliette.',
    type: 'kill' as const,
    targetType: 'abomination',
    countMin: 2,
    countMax: 4,
    goldBase: 250,
    xpBase: 500,
    rarity: 'mythic' as ItemRarity,
  },
  {
    title: 'Bounty: Malakor the Flayed',
    desc: 'Vanquish the Arch-Demon Overlord of the Sanguine Sanctum.',
    type: 'boss' as const,
    targetType: 'boss_malakor',
    countMin: 1,
    countMax: 1,
    goldBase: 500,
    xpBase: 1200,
    rarity: 'mythic' as ItemRarity,
  },
];

export function generateDynamicQuests(playerLevel: number, count: number = 3): Quest[] {
  const quests: Quest[] = [];
  const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const tmpl = shuffled[i];
    const targetCount = Math.floor(Math.random() * (tmpl.countMax - tmpl.countMin + 1)) + tmpl.countMin;
    const goldReward = Math.round(tmpl.goldBase * (1 + playerLevel * 0.4));
    const xpReward = Math.round(tmpl.xpBase * (1 + playerLevel * 0.5));

    quests.push({
      id: `quest_${Date.now()}_${i}`,
      title: tmpl.title,
      description: tmpl.desc,
      type: tmpl.type,
      targetEnemyType: tmpl.targetType,
      currentCount: 0,
      targetCount,
      goldReward,
      xpReward,
      rewardItemRarity: tmpl.rarity,
      completed: false,
      claimed: false,
    });
  }

  return quests;
}
