"use client";

import { ChevronLeft, ChevronRight, Lock, Medal, Trophy } from "lucide-react";
import { competitions } from "./data";
import { PlayerBreakdownDrawer } from "./PlayerBreakdownDrawer";
import { useAolinpikeState } from "./state";
import { AppShell, GameArt, LeaderboardRows, LoadingBlock, Pill, ProgressPanel } from "./ui";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function GamesView() {
  const {
    players,
    results,
    vault,
    playerPhotos,
    baseScores,
    rankedBaseScores,
    completedCount,
    updateResult,
    resetAll,
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
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [adminPin, setAdminPin] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState("");
  const competition = competitions[activeIndex];
  const result = results[competition.id];
  const isComplete = Boolean(result.winner && result.runnerUp);

  function goTo(offset: number) {
    setActiveIndex((index) => (index + offset + competitions.length) % competitions.length);
  }

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
      eyebrow="Result Entry"
      description="Winner and runner-up only. Big taps, base points, no card spoilers."
      resetAll={adminUnlocked ? () => resetAll(adminPin).catch(() => undefined) : undefined}
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
      {!adminUnlocked ? (
        <section className="poster-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Pill tone="gold">Admin Locked</Pill>
              <h2 className="distressed-title mt-3 text-3xl font-black uppercase">Result Control</h2>
              <p className="mt-2 text-sm font-black uppercase text-[#49742e]">Enter the admin PIN to edit scores.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={adminPin}
                maxLength={4}
                inputMode="numeric"
                type="password"
                placeholder="PIN"
                onChange={(event) => setAdminPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-12 w-32 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-center text-xl font-black tracking-[0.35em] text-[#080b0b] outline-none focus:border-[#73b53c]"
              />
              <button
                type="button"
                disabled={adminPin.length !== 4 || isBusy("unlock-admin") || isOffline}
                onClick={unlockAdmin}
                className="poster-button inline-flex h-12 items-center gap-2 px-4 text-sm font-black uppercase tracking-[0.14em] transition hover:bg-[#73b53c] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Lock className="size-4" />
                Unlock
              </button>
            </div>
          </div>
          {(adminError || error) && <div className="mt-3 rounded border-2 border-[#080b0b] bg-[#c33625] p-3 text-sm font-black uppercase text-[#fff8e9]">{adminError || error}</div>}
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="poster-panel p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Pill tone="green">Base Scores Only</Pill>
              <h2 className="distressed-title mt-3 text-3xl font-black uppercase">Live Ranking</h2>
            </div>
            <ProgressPanel completedCount={completedCount} />
          </div>
          <LeaderboardRows rankedScores={rankedBaseScores} playerPhotos={playerPhotos} onPlayerClick={setSelectedPlayer} />
        </div>

        <section className="poster-panel p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Pill tone="blue">Fast Event Entry</Pill>
              <h2 className="distressed-title mt-3 text-3xl font-black uppercase">Winner + Runner-up</h2>
            </div>
            <div className="text-sm font-black uppercase text-[#49742e]">Tap big. Move on.</div>
          </div>

          <article
            className={cn(
              "rounded border-2 bg-[#fff8e9] p-3 transition shadow-[4px_4px_0_rgba(8,11,11,0.85)]",
              isComplete ? "border-[#73b53c]" : "border-[#080b0b]"
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goTo(-1)}
                className="poster-button grid size-12 place-items-center text-[#080b0b] transition hover:bg-[#73b53c]"
                aria-label="Previous game"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="min-w-0 text-center">
                <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#49742e]">
                  Event {activeIndex + 1} / {competitions.length}
                </div>
                <div className="mt-1 truncate text-sm font-black uppercase text-[#080b0b]/70">{competition.note}</div>
              </div>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="poster-button grid size-12 place-items-center text-[#080b0b] transition hover:bg-[#73b53c]"
                aria-label="Next game"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>

            <GameArt competition={competition} className="mb-3 min-h-64" />

            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="rounded border-2 border-[#080b0b] bg-[#d6aa27] px-3 py-2 text-center">
                <div className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#080b0b]/70">Winner</div>
                <div className="text-lg font-black text-[#080b0b]">{competition.points[0]} pts</div>
              </div>
              <div className="rounded border-2 border-[#080b0b] bg-[#2c7bbd] px-3 py-2 text-center text-white">
                <div className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/70">Runner-up</div>
                <div className="text-lg font-black text-white">{competition.points[1]} pts</div>
              </div>
              <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] px-3 py-2 text-center">
                <div className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#49742e]">Status</div>
                <div className={cn("text-lg font-black", isComplete ? "text-[#49742e]" : "text-[#080b0b]/45")}>
                  {isComplete ? "Done" : "Open"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PlayerPick
                label="Winner"
                icon={<Trophy className="size-4" />}
                players={players}
                playerPhotos={playerPhotos}
                selected={result.winner}
                disabledPlayer={result.runnerUp}
                disabled={!adminUnlocked || loading || isOffline || isBusy(`result-${competition.id}-winner`)}
                onSelect={(player) => updateResult(competition.id, "winner", player, adminPin).catch(() => undefined)}
                tone="gold"
              />
              <PlayerPick
                label="Runner-up"
                icon={<Medal className="size-4" />}
                players={players}
                playerPhotos={playerPhotos}
                selected={result.runnerUp}
                disabledPlayer={result.winner}
                disabled={!adminUnlocked || loading || isOffline || isBusy(`result-${competition.id}-runnerUp`)}
                onSelect={(player) => updateResult(competition.id, "runnerUp", player, adminPin).catch(() => undefined)}
                tone="green"
              />
            </div>
          </article>
        </section>
      </section>

      <PlayerBreakdownDrawer
        player={selectedPlayer}
        players={players}
        results={results}
        vault={vault}
        baseScore={selectedPlayer ? baseScores[selectedPlayer] ?? 0 : 0}
        mode="base"
        onClose={() => setSelectedPlayer(null)}
      />
    </AppShell>
  );
}

function PlayerPick({
  label,
  icon,
  players,
  playerPhotos,
  selected,
  disabledPlayer,
  onSelect,
  disabled = false,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  players: string[];
  playerPhotos: Record<string, string>;
  selected: string;
  disabledPlayer: string;
  onSelect: (player: string) => void;
  disabled?: boolean;
  tone: "green" | "gold";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#49742e]">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => {
          const isSelected = selected === player;
          const isDisabled = disabledPlayer === player;

          return (
            <button
              key={player}
              type="button"
              disabled={isDisabled || disabled}
              onClick={() => onSelect(isSelected ? "" : player)}
              className={cn(
                "flex min-h-14 items-center gap-2 rounded border-2 px-3 py-2 text-left text-sm font-black transition active:scale-[0.98]",
                isSelected && tone === "gold" && "border-[#080b0b] bg-[#d6aa27] text-[#080b0b] shadow-[4px_4px_0_rgba(8,11,11,0.9)]",
                isSelected && tone === "green" && "border-[#080b0b] bg-[#73b53c] text-[#080b0b] shadow-[4px_4px_0_rgba(8,11,11,0.9)]",
                !isSelected && "border-[#080b0b] bg-[#fff8e9] text-[#080b0b] hover:bg-[#080b0b] hover:text-[#fff8e9]",
                (isDisabled || disabled) && "cursor-not-allowed opacity-25"
              )}
            >
              {playerPhotos[player] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playerPhotos[player]} alt="" className="size-8 rounded-md object-cover" />
              ) : (
                <span className="grid size-8 place-items-center rounded-sm border border-[#080b0b] bg-[#f4ead7] text-xs">{player.slice(0, 2)}</span>
              )}
              <span className="line-clamp-2">{player}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
