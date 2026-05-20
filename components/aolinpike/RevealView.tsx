"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame, Lock, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { applyRevealEvents, buildRevealEvents, getRevealBreakdown, rankScores } from "./scoring";
import { PlayerBreakdownDrawer } from "./PlayerBreakdownDrawer";
import { useAolinpikeState } from "./state";
import { AppShell, Avatar, CountUpNumber, GameArt, LoadingBlock, Pill, ProgressPanel } from "./ui";
import { competitions } from "./data";
import { cn } from "@/lib/utils";

export default function RevealView() {
  const {
    players,
    results,
    vault,
    playerPhotos,
    baseScores,
    completedCount,
    allGamesComplete,
    generateTestData,
    revealState,
    openReveal,
    revealNext,
    unlockAdminBooth,
    loading,
    error,
    mutationError,
    pendingAction,
    isBusy,
    isOffline,
    realtimeStatus,
    lastSyncedAt,
    refresh,
  } = useAolinpikeState();
  const events = useMemo(() => buildRevealEvents(players, results, vault), [players, results, vault]);
  const [adminPin, setAdminPin] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const safeVisibleCount = Math.min(revealState.visibleCount, events.length);
  const ceremonyActive = allGamesComplete && revealState.phase !== "sealed";
  const revealedScores = useMemo(
    () => applyRevealEvents(baseScores, events, safeVisibleCount),
    [baseScores, events, safeVisibleCount]
  );
  const ranked = useMemo(() => rankScores(revealedScores), [revealedScores]);
  const currentEvent = events[safeVisibleCount - 1];
  const ceremonyComplete = ceremonyActive && safeVisibleCount >= events.length;
  const beforeEventScores = useMemo(
    () => applyRevealEvents(baseScores, events, Math.max(safeVisibleCount - 1, 0)),
    [baseScores, events, safeVisibleCount]
  );
  const finalScores = useMemo(() => applyRevealEvents(baseScores, events, events.length), [baseScores, events]);
  const recap = useMemo(() => buildRecap(players, baseScores, finalScores, results, vault), [players, baseScores, finalScores, results, vault]);

  async function unlockAdmin() {
    try {
      await unlockAdminBooth(adminPin);
      setAdminUnlocked(true);
      setAdminError("");
    } catch (unlockError) {
      setAdminError(unlockError instanceof Error ? unlockError.message : "Wrong admin PIN.");
    }
  }

  return (
    <AppShell
      eyebrow="Reveal Ceremony"
      description="Cards reveal one by one. Tap final leaderboard players for the full adjusted score breakdown."
      connection={{
        loading,
        error,
        mutationError,
        pendingAction,
        isOffline,
        realtimeStatus,
        lastSyncedAt,
        onRetry: refresh,
      }}
    >
      {loading && !lastSyncedAt ? <LoadingBlock /> : null}
      <section className="overflow-hidden rounded border border-[#d6aa27] bg-[#fff8e9] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Pill tone="gold">Final Reveal Ceremony</Pill>
            <h2 className="mt-3 text-4xl font-black uppercase text-[#080b0b] sm:text-6xl">Open The Vault</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#26301d]">
              Only this screen exposes Boost and Sabotage effects. The breakdown shows base score, Boost gains, Sabotage damage, and final score.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProgressPanel completedCount={completedCount} />
            {!adminUnlocked && (
              <div className="flex gap-2">
                <input
                  value={adminPin}
                  maxLength={4}
                  inputMode="numeric"
                  type="password"
                  placeholder="PIN"
                  onChange={(event) => setAdminPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="h-14 w-32 rounded border border-[#d6aa27] bg-[#fff8e9] px-4 text-center text-xl font-black tracking-[0.35em] text-[#080b0b] outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={adminPin.length !== 4 || isBusy("unlock-admin") || isOffline}
                  onClick={unlockAdmin}
                  className="inline-flex min-h-14 items-center gap-2 rounded border border-[#080b0b] bg-[#a6da46] px-5 text-sm font-black uppercase tracking-[0.18em] text-[#080b0b] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-[#080b0b] disabled:bg-slate-100 disabled:text-slate-300"
                >
                  <Lock className="size-5" />
                  {isBusy("unlock-admin") ? "Checking" : "Admin"}
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={!adminUnlocked || isBusy("test-data") || isOffline}
              onClick={() => {
                generateTestData(adminPin).catch(() => undefined);
              }}
              className="inline-flex min-h-14 items-center gap-3 rounded border border-[#2c7bbd] bg-[#e9f2f8] px-5 text-sm font-black uppercase tracking-[0.18em] text-[#2c7bbd] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate Test Data
            </button>
            <button
              type="button"
              disabled={!allGamesComplete || !adminUnlocked || isOffline || isBusy("reveal-open") || isBusy("reveal-next")}
              onClick={() => {
                if (revealState.phase === "sealed") {
                  openReveal(adminPin).catch(() => undefined);
                  return;
                }
                revealNext(adminPin, safeVisibleCount + 1 >= events.length).catch(() => undefined);
              }}
              className={cn(
                "inline-flex min-h-14 items-center gap-3 rounded border px-5 text-sm font-black uppercase tracking-[0.18em] transition",
                allGamesComplete && adminUnlocked
                  ? "border-[#080b0b] bg-[#a6da46] text-[#080b0b] shadow-[0_12px_28px_rgba(245,158,11,0.20)] hover:bg-amber-200"
                  : "cursor-not-allowed border-[#080b0b] bg-slate-100 text-slate-300"
              )}
            >
              <Flame className="size-5" />
              {!allGamesComplete ? "Finish All Events" : revealState.phase === "sealed" ? "Enter Reveal Mode" : safeVisibleCount >= events.length ? "Ceremony Complete" : "Reveal Next Card"}
            </button>
          </div>
        </div>
        {(adminError || error) && <div className="mb-4 rounded border border-[#c33625] bg-[#fff0e8] p-3 text-sm font-black text-[#c33625]">{adminError || error}</div>}

        {!ceremonyActive ? (
          <div className="grid min-h-72 place-items-center rounded border-2 border-[#080b0b] bg-[#fff8e9] p-8 text-center">
            <div>
              <Sparkles className="mx-auto mb-4 size-12 text-amber-500" />
              <div className="text-2xl font-black uppercase text-[#080b0b]">The vault is still sealed</div>
              <p className="mt-2 text-sm font-bold text-[#49742e]">
                Reveal mode unlocks after every winner and runner-up is entered.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#49742e]">Reveal Timeline</div>
              <AnimatePresence mode="wait">
                {currentEvent ? (
                  <RevealTimelineCard
                    key={currentEvent.id}
                    event={currentEvent}
                    players={players}
                    beforeScores={beforeEventScores}
                    afterScores={revealedScores}
                  />
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="poster-panel p-5"
                  >
                    <div className="text-3xl font-black uppercase text-[#080b0b]">Lights down.</div>
                    <div className="mt-2 text-sm font-bold text-[#49742e]">Press reveal to flip the first card.</div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#49742e]">
                Card {safeVisibleCount} / {events.length}
              </div>
            </div>

            <div className="poster-panel p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#49742e]">
                  {ceremonyComplete ? "Final Adjusted Leaderboard" : "Live Adjusted Leaderboard"}
                </div>
                {ceremonyComplete && <Pill tone="gold">Final</Pill>}
              </div>
              <AdjustedLeaderboard
                rankedScores={ranked}
                baseScores={baseScores}
                adjustedScores={revealedScores}
                playerPhotos={playerPhotos}
                onPlayerClick={setSelectedPlayer}
              />
            </div>
          </div>
        )}
      </section>

      {ceremonyComplete && <DramaRecap recap={recap} />}

      <PlayerBreakdownDrawer
        player={selectedPlayer}
        players={players}
        results={results}
        vault={vault}
        baseScore={selectedPlayer ? baseScores[selectedPlayer] ?? 0 : 0}
        finalScore={selectedPlayer ? revealedScores[selectedPlayer] ?? 0 : 0}
        mode="reveal"
        onClose={() => setSelectedPlayer(null)}
      />
    </AppShell>
  );
}

function RevealTimelineCard({
  event,
  players,
  beforeScores,
  afterScores,
}: {
  event: ReturnType<typeof buildRevealEvents>[number];
  players: string[];
  beforeScores: Record<string, number>;
  afterScores: Record<string, number>;
}) {
  const affectedPlayers = players
    .filter((player) => event.deltas[player] !== 0 || player === event.player)
    .map((player) => ({
      player,
      before: beforeScores[player] ?? 0,
      after: afterScores[player] ?? 0,
      delta: event.deltas[player] ?? 0,
    }));
  const isBoost = event.kind === "boost";
  const competition = competitions.find((item) => item.id === event.gameId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      className={cn(
        "rounded border p-5",
        isBoost ? "border-[#2c7bbd] bg-[#2c7bbd] text-white" : "border-[#c33625] bg-[#c33625] text-white"
      )}
    >
      {competition && <GameArt competition={competition} compact className="mb-4 min-h-24" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] opacity-60">
            {isBoost ? "Boost Card" : "Sabotage Card"}
          </div>
          <div className="mt-3 text-3xl font-black uppercase leading-tight">{event.headline}</div>
          <div className="mt-3 text-lg font-black">Target game: {event.gameName}</div>
          <div className="mt-1 text-sm font-bold opacity-70">{event.detail}</div>
        </div>
        <div className="rounded bg-[#fff8e9]/20 px-3 py-2 text-right">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] opacity-60">Net</div>
          <div className="text-3xl font-black">{formatDelta(sumDeltas(event.deltas))}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {affectedPlayers.map((item) => (
          <div key={item.player} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded bg-[#fff8e9]/20 p-3">
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{item.player}</div>
              <div className="text-xs font-black uppercase tracking-[0.16em] opacity-60">
                {item.before} before {"->"} {item.after} after
              </div>
            </div>
            <div className={cn("text-2xl font-black tabular-nums", item.delta < 0 ? "text-red-100" : "text-emerald-100")}>
              {formatDelta(item.delta)}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AdjustedLeaderboard({
  rankedScores,
  baseScores,
  adjustedScores,
  playerPhotos,
  onPlayerClick,
}: {
  rankedScores: { name: string; score: number }[];
  baseScores: Record<string, number>;
  adjustedScores: Record<string, number>;
  playerPhotos: Record<string, string>;
  onPlayerClick: (player: string) => void;
}) {
  return (
    <div className="space-y-2">
      {rankedScores.map((player, index) => {
        const base = baseScores[player.name] ?? 0;
        const final = adjustedScores[player.name] ?? 0;
        const net = final - base;

        return (
          <motion.button
            layout
            key={player.name}
            type="button"
            onClick={() => onPlayerClick(player.name)}
            className={cn(
              "grid w-full grid-cols-[3rem_1fr] gap-3 rounded border p-3 text-left transition hover:border-[#080b0b] active:scale-[0.99] sm:grid-cols-[3.25rem_1fr_auto]",
              index === 0 && "border-[#080b0b] bg-[#a6da46] text-[#080b0b] shadow-[0_14px_30px_rgba(245,158,11,0.22)]",
              index === 1 && "border-slate-300 bg-slate-100 text-[#080b0b]",
              index === 2 && "border-orange-200 bg-orange-50 text-[#080b0b]",
              index > 2 && "border-[#080b0b] bg-[#fff8e9] text-[#080b0b]"
            )}
          >
            <div className="relative">
              <Avatar player={player.name} photo={playerPhotos[player.name]} />
              <div className={cn("absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-md text-[0.65rem] font-black", index === 0 ? "bg-slate-950 text-amber-200" : "bg-[#2c7bbd] text-white")}>
                {index + 1}
              </div>
            </div>
            <div className="min-w-0">
              <div className="truncate text-xl font-black sm:text-2xl">{player.name}</div>
              <div className={cn("mt-1 text-xs font-bold uppercase tracking-[0.16em]", index === 0 ? "text-slate-700" : "text-[#49742e]")}>
                Base {base}, Cards {formatDelta(net)}, Final {final}
              </div>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 sm:min-w-64">
              <MiniScore label="Base" value={base} />
              <MiniScore label="Cards" value={net} signed />
              <MiniScore label="Final" value={final} loud />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function MiniScore({ label, value, signed = false, loud = false }: { label: string; value: number; signed?: boolean; loud?: boolean }) {
  return (
    <div className="rounded bg-[#fff8e9]/60 p-2 text-center">
      <div className="text-[0.58rem] font-black uppercase tracking-[0.16em] opacity-55">{label}</div>
      <div className={cn("text-xl font-black tabular-nums", loud && "text-[#49742e]", value < 0 && "text-[#c33625]", value > 0 && signed && "text-emerald-700")}>
        {signed ? formatDelta(value) : <CountUpNumber value={value} />}
      </div>
    </div>
  );
}

function DramaRecap({
  recap,
}: {
  recap: {
    biggestBoost: string;
    mostSabotaged: string;
    mostEvil: string;
    biggestComeback: string;
    closestMargin: string;
  };
}) {
  const cards = [
    ["Biggest Boost", recap.biggestBoost, "green"],
    ["Most Sabotaged Player", recap.mostSabotaged, "red"],
    ["Most Evil Player", recap.mostEvil, "red"],
    ["Biggest Comeback", recap.biggestComeback, "gold"],
    ["Closest Final Margin", recap.closestMargin, "blue"],
  ] as const;

  return (
    <section className="poster-panel p-4 shadow-sm sm:p-6">
      <Pill tone="gold">Drama Recap</Pill>
      <h2 className="mt-3 text-4xl font-black uppercase text-[#080b0b]">Postgame Chaos Report</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, tone]) => (
          <div key={label} className={cn("rounded border p-4", tone === "green" && "border-emerald-200 bg-emerald-50", tone === "red" && "border-[#c33625] bg-[#fff0e8]", tone === "gold" && "border-[#d6aa27] bg-[#f5dda0]", tone === "blue" && "border-[#2c7bbd] bg-[#e9f2f8]")}>
            <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#49742e]">{label}</div>
            <div className="mt-3 text-2xl font-black text-[#080b0b]">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildRecap(
  players: string[],
  baseScores: Record<string, number>,
  finalScores: Record<string, number>,
  results: ReturnType<typeof useAolinpikeState>["results"],
  vault: ReturnType<typeof useAolinpikeState>["vault"]
) {
  const summaries = players.map((player) => {
    const breakdown = getRevealBreakdown(player, players, results, vault);
    return {
      player,
      boost: breakdown.reduce((sum, item) => sum + item.boostDelta, 0),
      sabotageReceived: breakdown.reduce((sum, item) => sum + item.sabotageDelta, 0),
      net: (finalScores[player] ?? 0) - (baseScores[player] ?? 0),
      base: baseScores[player] ?? 0,
      final: finalScores[player] ?? 0,
      sabotageCaused: buildRevealEvents(players, results, vault)
        .filter((event) => event.player === player && event.kind === "sabotage")
        .reduce((sum, event) => sum + Math.abs(sumDeltas(event.deltas)), 0),
    };
  });
  const baseRanks = rankScores(baseScores);
  const finalRanks = rankScores(finalScores);
  const comeback = summaries
    .map((summary) => ({
      ...summary,
      rankGain: baseRanks.findIndex((item) => item.name === summary.player) - finalRanks.findIndex((item) => item.name === summary.player),
    }))
    .sort((a, b) => b.rankGain - a.rankGain || b.net - a.net)[0];
  const finalMargins = finalRanks.slice(0, -1).map((item, index) => ({
    players: `${item.name} / ${finalRanks[index + 1].name}`,
    margin: Math.abs(item.score - finalRanks[index + 1].score),
  }));
  const closest = finalMargins.sort((a, b) => a.margin - b.margin)[0];
  const biggestBoost = [...summaries].sort((a, b) => b.boost - a.boost)[0];
  const mostSabotaged = [...summaries].sort((a, b) => a.sabotageReceived - b.sabotageReceived)[0];
  const mostEvil = [...summaries].sort((a, b) => b.sabotageCaused - a.sabotageCaused)[0];

  return {
    biggestBoost: biggestBoost ? `${biggestBoost.player} ${formatDelta(biggestBoost.boost)}` : "No boosts",
    mostSabotaged: mostSabotaged ? `${mostSabotaged.player} ${formatDelta(mostSabotaged.sabotageReceived)}` : "No sabotage",
    mostEvil: mostEvil ? `${mostEvil.player} dealt ${mostEvil.sabotageCaused}` : "No sabotage",
    biggestComeback: comeback ? `${comeback.player} ${formatDelta(comeback.net)}` : "No comeback",
    closestMargin: closest ? `${closest.players}: ${closest.margin}` : "No margin",
  };
}

function sumDeltas(deltas: Record<string, number>) {
  return Object.values(deltas).reduce((sum, value) => sum + value, 0);
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
