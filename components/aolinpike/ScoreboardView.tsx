"use client";

import { Bell, CheckCircle2, Megaphone, Radio, Shield, Sparkles, Trophy, UserRound } from "lucide-react";
import { competitions } from "./data";
import { useAolinpikeState } from "./state";
import { AppShell, Avatar, GameArt, LoadingBlock, Pill, ProgressPanel } from "./ui";
import type { Competition, RankedScore, SystemUpdate, SystemUpdateKind } from "./types";
import { cn } from "@/lib/utils";

const kindStyles: Record<SystemUpdateKind, { label: string; className: string; icon: React.ReactNode }> = {
  score: { label: "Score", className: "bg-[#d6aa27] text-[#080b0b]", icon: <Trophy className="size-4" /> },
  player: { label: "Player", className: "bg-[#2c7bbd] text-white", icon: <UserRound className="size-4" /> },
  admin: { label: "Admin", className: "bg-[#c33625] text-[#fff8e9]", icon: <Shield className="size-4" /> },
  cards: { label: "Cards", className: "bg-[#73b53c] text-[#080b0b]", icon: <Sparkles className="size-4" /> },
  reveal: { label: "Reveal", className: "bg-[#080b0b] text-[#fff8e9]", icon: <Megaphone className="size-4" /> },
  system: { label: "System", className: "bg-[#fff8e9] text-[#080b0b]", icon: <Bell className="size-4" /> },
};

export default function ScoreboardView() {
  const {
    results,
    rankedBaseScores,
    completedCount,
    playerPhotos,
    updates,
    loading,
    error,
    mutationError,
    pendingAction,
    isOffline,
    realtimeStatus,
    lastSyncedAt,
    refresh,
  } = useAolinpikeState();
  const latestResult = [...competitions].reverse().find((competition) => {
    const result = results[competition.id];
    return Boolean(result?.winner || result?.runnerUp);
  });
  const nextUnscoredEvent = competitions.find((competition) => {
    const result = results[competition.id];
    return !result?.winner || !result?.runnerUp;
  });
  const latestUpdate = updates[0];

  return (
    <AppShell
      eyebrow="Broadcast"
      description="Live updates, system messages, and a rolling score strip for every connected phone."
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

      <ScoreTicker rankedScores={rankedBaseScores} playerPhotos={playerPhotos} />

      <section className="grid items-stretch gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="poster-ink updating-panel relative flex h-full max-h-[56rem] min-h-[28rem] flex-col overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-x-0 top-0 z-10 grid h-2 grid-cols-4">
            <div className="bg-[#73b53c]" />
            <div className="bg-[#fff8e9]" />
            <div className="bg-[#2c7bbd]" />
            <div className="bg-[#c33625]" />
          </div>
          <div className="relative z-10 mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Pill tone="green">Live Wire</Pill>
              <h2 className="mt-4 text-4xl font-black uppercase leading-none text-[#fff8e9] sm:text-6xl">Broadcast Feed</h2>
            </div>
            <div className="rounded border-2 border-[#fff8e9] bg-[#fff8e9]/10 px-4 py-3 text-right">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#a6da46]">Updates</div>
              <div className="text-3xl font-black text-[#fff8e9]">{updates.length}</div>
            </div>
          </div>

          <div className="relative z-10 grid flex-1 gap-3 overflow-y-auto pr-2">
            {updates.length === 0 ? (
              <EmptyBroadcast />
            ) : (
              updates.map((update, index) => <BroadcastItem key={update.id} update={update} featured={index === 0} />)
            )}
          </div>
        </div>

        <aside className="grid h-fit gap-4">
          <div className="poster-panel updating-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <Pill tone="blue">Signal Check</Pill>
                <h2 className="distressed-title mt-3 text-3xl font-black uppercase">Game Pulse</h2>
              </div>
              <ProgressPanel completedCount={completedCount} />
            </div>
            <div className="grid gap-3">
              <PulseCard label="Latest Update" value={latestUpdate?.title ?? "Standing by"} />
              <PulseCard label="Last Scored Event" value={latestResult?.name ?? "No scores yet"} />
              <PulseCard label="Reveal Status" value={completedCount === competitions.length ? "Ready when admin is" : `${competitions.length - completedCount} events left`} />
            </div>
          </div>

          <NextEventPanel nextEvent={nextUnscoredEvent} completedCount={completedCount} latestResult={latestResult} />
        </aside>
      </section>
    </AppShell>
  );
}

function NextEventPanel({
  nextEvent,
  completedCount,
  latestResult,
}: {
  nextEvent?: Competition;
  completedCount: number;
  latestResult?: Competition;
}) {
  const remainingCount = Math.max(competitions.length - completedCount, 0);

  return (
    <div className="poster-panel updating-panel flex flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Pill tone="gold">Next Up</Pill>
          <h2 className="distressed-title mt-3 text-3xl font-black uppercase">Event Board</h2>
        </div>
        <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] px-3 py-2 text-right shadow-[3px_3px_0_rgba(8,11,11,0.8)]">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#49742e]">Remaining</div>
          <div className="text-2xl font-black leading-none text-[#c33625]">{remainingCount}</div>
        </div>
      </div>

      {nextEvent ? (
        <>
          <GameArt competition={nextEvent} className="min-h-40 sm:min-h-48" />
          <div className="mt-4 rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4 shadow-[4px_4px_0_rgba(8,11,11,0.8)]">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">Next Unscored Event</div>
            <div className="mt-2 text-3xl font-black uppercase leading-none text-[#080b0b]">{nextEvent.name}</div>
            <p className="mt-3 text-sm font-black uppercase leading-5 text-[#26301d]">{nextEvent.note}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <PointBadge label="Winner" value={nextEvent.points[0] ?? 0} />
              <PointBadge label="Runner-Up" value={nextEvent.points[1] ?? 0} />
            </div>
          </div>
          {latestResult ? (
            <div className="mt-3 rounded border-2 border-[#080b0b] bg-[#73b53c] px-3 py-2 text-sm font-black uppercase text-[#080b0b] shadow-[3px_3px_0_rgba(8,11,11,0.75)]">
              Last scored: {latestResult.name}
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid flex-1 place-items-center rounded border-2 border-[#080b0b] bg-[#080b0b] p-6 text-center text-[#fff8e9] shadow-[4px_4px_0_rgba(115,181,60,0.75)]">
          <div>
            <Trophy className="mx-auto mb-4 size-12 text-[#d6aa27]" />
            <div className="text-3xl font-black uppercase leading-none">All Events Scored</div>
            <p className="mt-3 text-sm font-black uppercase leading-6 text-[#d6e7b8]">Reveal is ready when admin is.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PointBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border-2 border-[#080b0b] bg-[#d6aa27] px-3 py-2 text-center shadow-[2px_2px_0_rgba(8,11,11,0.75)]">
      <div className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-[#26301d]">{label}</div>
      <div className="mt-1 text-2xl font-black leading-none text-[#080b0b]">{value} pts</div>
    </div>
  );
}

function ScoreTicker({
  rankedScores,
  playerPhotos,
}: {
  rankedScores: RankedScore[];
  playerPhotos: Record<string, string>;
}) {
  const tickerItems = rankedScores.length > 0 ? rankedScores : [];
  const cards = Array.from({ length: 2 }, () => tickerItems).flat();

  return (
    <section className="poster-panel grid grid-cols-[auto_1fr] overflow-hidden bg-[#080b0b] p-0 text-[#fff8e9]" aria-label="Rolling live score banner">
      <div className="relative z-10 flex items-center border-r-2 border-[#fff8e9] bg-[#c33625] px-4 py-3 text-sm font-black uppercase tracking-[0.2em] shadow-[5px_0_0_rgba(8,11,11,0.9)]">
        Live
      </div>
      <div className="relative min-w-0 overflow-hidden py-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#080b0b] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#080b0b] to-transparent" />
        <div className="score-ticker flex w-max items-center gap-5 whitespace-nowrap px-5">
          {cards.length > 0 ? (
            cards.map((player, index) => (
              <div
                key={`${player.name}-${index}`}
                className="grid min-w-72 grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 py-2 text-[#080b0b] shadow-[4px_4px_0_rgba(115,181,60,0.75)]"
              >
                <div className="relative">
                  <Avatar player={player.name} photo={playerPhotos[player.name]} />
                  <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-sm border border-[#080b0b] bg-[#73b53c] text-[0.65rem] font-black text-[#080b0b]">
                    {(index % tickerItems.length) + 1}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-black uppercase leading-none">{player.name}</div>
                  <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#49742e]">Current Score</div>
                </div>
                <div className="rounded-sm border-2 border-[#080b0b] bg-[#d6aa27] px-3 py-1 text-2xl font-black leading-none text-[#080b0b]">
                  {player.score}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 py-2 text-lg font-black uppercase text-[#080b0b]">
              Waiting for scores
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BroadcastItem({ update, featured }: { update: SystemUpdate; featured: boolean }) {
  const style = kindStyles[update.kind] ?? kindStyles.system;
  const content = (
    <BroadcastItemContent
      update={update}
      featured={featured}
      label={style.label}
      icon={style.icon}
      labelClassName={style.className}
    />
  );

  return (
    <article
      className={cn(
        "rounded border-2 border-[#fff8e9] bg-[#fff8e9]/10 p-4 shadow-[4px_4px_0_rgba(115,181,60,0.5)] backdrop-blur",
        featured && "bg-[#fff8e9] text-[#080b0b] shadow-[6px_6px_0_rgba(115,181,60,0.9)]"
      )}
    >
      {content}
    </article>
  );
}

function BroadcastItemContent({
  update,
  featured,
  label,
  icon,
  labelClassName,
}: {
  update: SystemUpdate;
  featured: boolean;
  label: string;
  icon: React.ReactNode;
  labelClassName: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-2 rounded-sm border-2 border-[#080b0b] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em]", labelClassName)}>
            {icon}
            {label}
          </span>
          <span className={cn("text-[0.65rem] font-black uppercase tracking-[0.18em]", featured ? "text-[#49742e]" : "text-[#a6da46]")}>
            {formatUpdateTime(update.createdAt)}
          </span>
        </div>
        <h3 className={cn("mt-3 text-2xl font-black uppercase leading-tight", featured ? "text-[#080b0b]" : "text-[#fff8e9]")}>{update.title}</h3>
        {update.detail ? <p className={cn("mt-2 text-sm font-black uppercase leading-5", featured ? "text-[#26301d]" : "text-[#d6e7b8]")}>{update.detail}</p> : null}
      </div>
      <div className={cn("text-right text-xs font-black uppercase tracking-[0.16em]", featured ? "text-[#c33625]" : "text-[#fff8e9]/70")}>{update.actor}</div>
    </div>
  );
}

function EmptyBroadcast() {
  return (
    <div className="rounded border-2 border-dashed border-[#fff8e9] bg-[#fff8e9]/10 p-6 text-center">
      <Radio className="mx-auto mb-3 size-10 text-[#a6da46]" />
      <div className="text-2xl font-black uppercase text-[#fff8e9]">Broadcast booth is quiet</div>
      <p className="mt-2 text-sm font-black uppercase leading-6 text-[#d6e7b8]">
        New scores, PIN changes, profile saves, card updates, resets, and reveal moves will land here live.
      </p>
    </div>
  );
}

function PulseCard({ label, value }: { label: string; value: string }) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">
        <CheckCircle2 className="size-4" />
        {label}
      </div>
      <div className="mt-2 text-lg font-black uppercase leading-tight text-[#080b0b]">{value}</div>
    </>
  );

  return (
    <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-3 shadow-[3px_3px_0_rgba(8,11,11,0.8)]">
      {content}
    </div>
  );
}

function formatUpdateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
