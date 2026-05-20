"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getBaseBreakdown, getRevealBreakdown } from "./scoring";
import { competitions } from "./data";
import { CountUpNumber, GameArt, Pill } from "./ui";
import type { Results, Vault } from "./types";
import { cn } from "@/lib/utils";

export function PlayerBreakdownDrawer({
  player,
  players,
  results,
  vault,
  baseScore,
  finalScore,
  mode,
  onClose,
}: {
  player: string | null;
  players: string[];
  results: Results;
  vault?: Vault;
  baseScore: number;
  finalScore?: number;
  mode: "base" | "reveal";
  onClose: () => void;
}) {
  const isReveal = mode === "reveal";
  const baseItems = player ? getBaseBreakdown(player, results) : [];
  const revealItems = player && vault ? getRevealBreakdown(player, players, results, vault) : [];
  const adjustedScore = finalScore ?? baseScore;
  const boostGains = revealItems.reduce((sum, item) => sum + item.boostDelta, 0);
  const sabotageDamage = revealItems.reduce((sum, item) => sum + item.sabotageDelta, 0);

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          className="fixed inset-0 z-50 grid items-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88vh] overflow-hidden rounded-t-2xl border border-[#080b0b] bg-[#fff8e9] shadow-[0_24px_80px_rgba(15,23,42,0.20)] sm:mx-auto sm:w-full sm:max-w-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#080b0b] p-4 sm:p-5">
              <div>
                <Pill tone={isReveal ? "gold" : "green"}>{isReveal ? "Adjusted Reveal Detail" : "Base Score Detail"}</Pill>
                <h2 className="mt-3 text-3xl font-black uppercase text-[#080b0b]">{player}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-11 place-items-center rounded border-2 border-[#080b0b] bg-[#fff8e9] text-slate-700 transition hover:bg-slate-100"
                aria-label="Close player breakdown"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-6rem)] overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <ScoreTile label="Base Score" value={baseScore} tone="green" />
                {isReveal && <ScoreTile label="Boost Gains" value={boostGains} tone="gold" signed />}
                {isReveal && <ScoreTile label="Sabotage Damage" value={sabotageDamage} tone="red" signed />}
                {isReveal && <ScoreTile label="Final Score" value={adjustedScore} tone="gold" />}
              </div>

              <div className="mt-5 grid gap-2">
                {(isReveal ? revealItems : baseItems).length === 0 ? (
                  <div className="rounded border border-dashed border-slate-300 bg-[#fff8e9] p-5 text-sm font-bold text-[#49742e]">
                    No base points scored yet.
                  </div>
                ) : isReveal ? (
                  revealItems.map((item) => (
                    <div key={item.gameId} className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4">
                      <BreakdownArt gameId={item.gameId} />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black text-[#080b0b]">{item.gameName}</div>
                          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#49742e]">{item.placement}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#2c7bbd]">{formatDelta(item.basePoints)} base</div>
                          <div className={cn("text-2xl font-black tabular-nums", item.finalPoints >= item.basePoints ? "text-[#49742e]" : "text-[#c33625]")}>
                            {formatDelta(item.finalPoints)} final
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <EffectPill tone="blue">Base {formatDelta(item.basePoints)}</EffectPill>
                        {item.boostDelta > 0 && <EffectPill tone="green">Boost {formatDelta(item.boostDelta)}</EffectPill>}
                        {item.sabotageDelta < 0 && <EffectPill tone="red">Sabotage {formatDelta(item.sabotageDelta)}</EffectPill>}
                        {item.effects.length === 0 && <EffectPill tone="blue">No card effect</EffectPill>}
                      </div>
                      <div className="mt-3 text-sm font-bold text-[#49742e]">
                        Base {formatDelta(item.basePoints)} + Boost {formatDelta(item.boostDelta)} + Sabotage {formatDelta(item.sabotageDelta)} = Final {formatDelta(item.finalPoints)}
                      </div>
                    </div>
                  ))
                ) : (
                  baseItems.map((item) => (
                    <div key={item.gameId} className="grid gap-3 rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                      <BreakdownArt gameId={item.gameId} compact />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-black text-[#080b0b]">{item.gameName}</div>
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#49742e]">{item.placement}</div>
                      </div>
                      <div className="text-2xl font-black text-[#2c7bbd]">+{item.basePoints}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScoreTile({
  label,
  value,
  tone,
  signed = false,
}: {
  label: string;
  value: number;
  tone: "green" | "gold" | "red";
  signed?: boolean;
}) {
  const toneClass = {
    green: "text-[#2c7bbd]",
    gold: "text-[#49742e]",
    red: "text-[#c33625]",
  }[tone];

  return (
    <div className="poster-panel p-4 shadow-sm">
      <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">{label}</div>
      <div className={cn("mt-1 text-4xl font-black tabular-nums", toneClass)}>
        {signed && value > 0 ? "+" : ""}
        <CountUpNumber value={value} />
      </div>
    </div>
  );
}

function EffectPill({ children, tone }: { children: React.ReactNode; tone: "green" | "red" | "blue" }) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };

  return <span className={cn("rounded px-3 py-1 text-xs font-black uppercase tracking-[0.14em]", tones[tone])}>{children}</span>;
}

function BreakdownArt({ gameId, compact = false }: { gameId: string; compact?: boolean }) {
  const competition = competitions.find((item) => item.id === gameId);
  if (!competition) return null;

  return <GameArt competition={competition} compact className={compact ? "min-h-16" : "mb-3 min-h-20"} />;
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
