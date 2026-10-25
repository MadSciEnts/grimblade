/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, Quest } from '../game/types';
import { getRarityColor } from '../game/loot';
import { soundEngine } from '../game/audio';
import { X, Scroll, Award, CheckCircle2 } from 'lucide-react';

interface QuestsModalProps {
  quests: Quest[];
  player: Player;
  onClose: () => void;
  onClaimQuest: (questId: string) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  quests,
  player,
  onClose,
  onClaimQuest,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl bg-[#0e090b] border-2 border-amber-950/80 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-amber-950/60 bg-[#160c0f]">
          <div className="flex items-center gap-2.5">
            <Scroll className="w-5 h-5 text-amber-400" />
            <h2 className="font-cinzel font-bold text-lg text-amber-200 tracking-wide">
              Dynamic Bounties & Quests
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quest List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {quests.map((q) => {
            const isFinished = q.currentCount >= q.targetCount;
            return (
              <div
                key={q.id}
                className={`p-3.5 rounded-lg border bg-[#140e11] transition ${
                  q.claimed
                    ? 'border-slate-800 opacity-60'
                    : isFinished
                    ? 'border-emerald-500 shadow-md shadow-emerald-950/40'
                    : 'border-amber-900/60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-cinzel font-bold text-sm text-slate-100 flex items-center gap-2">
                      {q.title}
                      {isFinished && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{q.description}</p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-amber-400 font-bold shrink-0 ml-3">
                    {q.currentCount} / {q.targetCount}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-2.5 border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${isFinished ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, (q.currentCount / q.targetCount) * 100)}%` }}
                  />
                </div>

                {/* Reward Strip */}
                <div className="mt-3 pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
                    <span className="text-amber-400">🪙 +{q.goldReward} Gold</span>
                    <span className="text-sky-400">✨ +{q.xpReward} XP</span>
                    <span style={{ color: getRarityColor(q.rewardItemRarity) }} className="capitalize font-bold">
                      🎁 {q.rewardItemRarity} Relic
                    </span>
                  </div>

                  {isFinished && !q.claimed ? (
                    <button
                      onClick={() => {
                        onClaimQuest(q.id);
                        soundEngine.playLevelUp();
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded text-xs font-bold shadow hover:brightness-110 active:scale-95 transition cursor-pointer"
                    >
                      Claim Bounty
                    </button>
                  ) : q.claimed ? (
                    <span className="text-slate-500 font-mono text-[10px]">Claimed</span>
                  ) : (
                    <span className="text-amber-500/80 font-mono text-[10px]">In Progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
