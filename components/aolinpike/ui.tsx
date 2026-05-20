"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Camera, CheckCircle2, Crown, Loader2, Menu, RefreshCw, RotateCcw, Upload, WifiOff, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { competitions } from "./data";
import type { Competition } from "./types";
import { cn } from "@/lib/utils";

export function CountUpNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const start = displayRef.current;
    const distance = value - start;
    const startedAt = performance.now();
    const duration = 520;
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(start + distance * eased);
      displayRef.current = nextValue;
      setDisplay(nextValue);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{display}</span>;
}

export function Pill({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "gold" | "red" | "blue";
}) {
  const tones = {
    green: "brush-label px-3 py-1 text-[#a6da46]",
    gold: "brush-label px-3 py-1 text-[#f4ead7]",
    red: "border-2 border-[#080b0b] bg-[#c33625] text-[#fff8e9] shadow-[3px_3px_0_#080b0b]",
    blue: "border-2 border-[#080b0b] bg-[#2c7bbd] text-[#fff8e9] shadow-[3px_3px_0_#080b0b]",
  };

  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1 text-xs font-black uppercase tracking-[0.22em]", tones[tone])}>
      <span>{children}</span>
    </span>
  );
}

const navItems = [
  { href: "/", label: "Broadcast" },
  { href: "/games", label: "Games" },
  { href: "/player", label: "Player" },
  { href: "/booth", label: "Admin" },
  { href: "/reveal", label: "Reveal" },
];

export function AppShell({
  children,
  eyebrow = "Broadcast Mode",
  description = "Fast scoring now. Betrayal later. The board tells the truth only until the cards come out.",
  resetAll,
  connection,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  description?: string;
  resetAll?: () => void;
  connection?: {
    loading: boolean;
    error: string;
    mutationError?: string;
    pendingAction?: string;
    isOffline: boolean;
    realtimeStatus: "idle" | "connecting" | "subscribed" | "closed" | "error";
    lastSyncedAt: Date | null;
    onRetry: () => void;
  };
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4ead7] text-[#080b0b]">
      <div className="fixed inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(180deg,rgba(44,123,189,0.26),transparent)]" />
      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-4 sm:px-6 sm:py-8">
        <header className="poster-panel relative overflow-hidden p-5 sm:p-8">
          <div className="absolute inset-x-0 top-0 z-10 grid h-2 grid-cols-4">
            <div className="bg-[#73b53c]" />
            <div className="bg-[#080b0b]" />
            <div className="bg-[#2c7bbd]" />
            <div className="bg-[#c33625]" />
          </div>
          <div className="pointer-events-none absolute -right-12 top-8 hidden rotate-6 select-none text-[10rem] font-black leading-none text-[#73b53c]/20 sm:block">
            AWD
          </div>
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill tone="green">4WD Aolinpike</Pill>
                <Pill tone={pathname === "/booth" ? "red" : "gold"}>{eyebrow}</Pill>
              </div>
              <h1 className="distressed-title mt-5 text-5xl font-black leading-none sm:text-7xl">
                四驱兄弟 十周年 奥林匹克运动会
              </h1>
              <p className="mt-3 max-w-2xl text-base font-black uppercase leading-6 text-[#26301d] sm:text-lg">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {resetAll && (
                <button
                  type="button"
                  onClick={resetAll}
                  className="poster-button inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-black uppercase tracking-[0.16em] transition hover:bg-[#c33625] hover:text-[#fff8e9]"
                >
                  <RotateCcw className="size-4" />
                  Reset Event
                </button>
              )}
              <button
                type="button"
                onClick={() => setNavOpen((value) => !value)}
                className="poster-button inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-black uppercase tracking-[0.16em] transition sm:hidden"
              >
                {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
                Menu
              </button>
            </div>
          </div>

          <nav className={cn("mt-6 grid gap-2 sm:flex", navOpen ? "grid" : "hidden sm:flex")}>
            {navItems.map((item) => {
              const active = pathname === item.href;
              const booth = item.href === "/booth";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 text-center text-xs font-black uppercase tracking-[0.18em] transition",
                    active
                      ? booth
                        ? "poster-button-active bg-[#c33625] text-[#fff8e9]"
                        : "poster-button-active"
                      : "poster-button hover:bg-[#080b0b] hover:text-[#fff8e9]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {connection && <ConnectionPanel connection={connection} />}
        {children}
      </div>
    </main>
  );
}

function ConnectionPanel({
  connection,
}: {
  connection: NonNullable<Parameters<typeof AppShell>[0]["connection"]>;
}) {
  const hasProblem = connection.isOffline || connection.realtimeStatus === "error" || connection.realtimeStatus === "closed" || Boolean(connection.error);
  const tone = connection.isOffline || connection.error ? "red" : connection.realtimeStatus === "subscribed" ? "green" : "gold";
  const message = connection.isOffline
    ? "Offline on this phone. Live updates and saves are paused."
    : connection.loading
      ? "Loading shared game room..."
      : connection.realtimeStatus === "subscribed"
        ? "Live sync connected."
        : connection.realtimeStatus === "connecting"
          ? "Reconnecting live sync..."
          : "Live sync is degraded. The app will keep retrying.";

  return (
    <section
      className={cn(
        "poster-panel flex flex-wrap items-center justify-between gap-3 p-3",
        tone === "red" && "bg-[#fff0e8]",
        tone === "gold" && "bg-[#f5dda0]",
        tone === "green" && "bg-[#e7f2ce]"
      )}
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            tone === "red" && "bg-[#c33625] text-white",
            tone === "gold" && "bg-[#d6aa27] text-[#080b0b]",
            tone === "green" && "bg-[#73b53c] text-[#080b0b]"
          )}
        >
          {connection.loading || connection.realtimeStatus === "connecting" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : connection.isOffline ? (
            <WifiOff className="size-5" />
          ) : hasProblem ? (
            <AlertTriangle className="size-5" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-[0.14em] text-[#080b0b]">{message}</div>
          <div className="mt-1 text-xs font-black uppercase text-[#26301d]">
            {connection.pendingAction
              ? "Saving change..."
              : connection.lastSyncedAt
                ? `Last sync ${connection.lastSyncedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                : "Waiting for first sync"}
          </div>
          {(connection.error || connection.mutationError) && (
            <div className="mt-1 text-xs font-black text-[#c33625]">{connection.mutationError || connection.error}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={connection.onRetry}
        disabled={connection.loading}
        className="poster-button inline-flex h-10 items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45"
      >
        <RefreshCw className={cn("size-4", connection.loading && "animate-spin")} />
        Retry Sync
      </button>
    </section>
  );
}

export function LoadingBlock({ label = "Loading shared game room..." }: { label?: string }) {
  return (
    <div className="poster-panel grid min-h-48 place-items-center p-6 text-center">
      <div>
        <Loader2 className="mx-auto mb-3 size-8 animate-spin text-[#73b53c]" />
        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#080b0b]">{label}</div>
      </div>
    </div>
  );
}

export function PlayerEditor({
  players,
  playerPhotos,
  onRename,
  onPhotoChange,
}: {
  players: string[];
  playerPhotos: Record<string, string>;
  onRename: (index: number, next: string) => void;
  onPhotoChange: (player: string, photo: string) => void;
}) {
  function handleFile(player: string, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPhotoChange(player, reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="poster-panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Pill tone="blue">Player Setup</Pill>
          <h2 className="mt-3 text-3xl font-black uppercase text-[#080b0b]">Names + Profile Photos</h2>
        </div>
        <div className="text-sm font-black uppercase text-[#49742e]">Synced to the room</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {players.map((player, index) => (
          <div key={index} className="group grid gap-3 rounded border-2 border-[#080b0b] bg-[#fff8e9] p-3 shadow-[4px_4px_0_rgba(8,11,11,0.85)]">
            <div className="flex items-center gap-3">
              <Avatar player={player} photo={playerPhotos[player]} size="lg" />
              <label className="min-w-0 flex-1">
                <span className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#49742e]">Player {index + 1}</span>
                <input
                  value={player}
                  onChange={(event) => onRename(index, event.target.value || `Player ${index + 1}`)}
                  className="mt-1 w-full min-w-0 bg-transparent text-lg font-black text-[#080b0b] outline-none transition group-focus-within:text-[#49742e]"
                  aria-label={`Player ${index + 1} name`}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="poster-button inline-flex h-10 cursor-pointer items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-[#73b53c]">
                <Upload className="size-3.5" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleFile(player, event.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => onPhotoChange(player, "")}
                className="poster-button h-10 px-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-[#c33625] hover:text-[#fff8e9]"
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Avatar({
  player,
  photo,
  size = "md",
}: {
  player: string;
  photo?: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-16" : "size-11";

  return (
    <div className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded border-2 border-[#080b0b] bg-[#fff8e9] text-sm font-black uppercase text-[#080b0b] shadow-[3px_3px_0_rgba(8,11,11,0.85)]", sizeClass)}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={`${player} profile`} className="h-full w-full object-cover" />
      ) : (
        <div className="grid gap-0.5 text-center">
          <Camera className="mx-auto size-4 opacity-60" />
          <span>{player.slice(0, 2)}</span>
        </div>
      )}
    </div>
  );
}

export function LeaderboardRows({
  rankedScores,
  playerPhotos = {},
  onPlayerClick,
  finalMode = false,
}: {
  rankedScores: { name: string; score: number }[];
  playerPhotos?: Record<string, string>;
  onPlayerClick?: (player: string) => void;
  finalMode?: boolean;
}) {
  return (
    <div className="space-y-2">
      {rankedScores.map((player, index) => {
        const Comp = onPlayerClick ? "button" : "div";

        return (
          <motion.div layout key={player.name}>
            <Comp
              type={onPlayerClick ? "button" : undefined}
              onClick={() => onPlayerClick?.(player.name)}
              className={cn(
                "grid w-full grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded border-2 p-3 text-left transition",
                index === 0 && !finalMode && "border-[#080b0b] bg-[#a6da46] text-[#080b0b] shadow-[5px_5px_0_rgba(8,11,11,0.92)]",
                index > 0 && !finalMode && "border-[#080b0b] bg-[#fff8e9] text-[#080b0b] shadow-[3px_3px_0_rgba(8,11,11,0.78)]",
                finalMode && index === 0 && "border-[#080b0b] bg-[#d6aa27] text-[#080b0b] shadow-[5px_5px_0_rgba(8,11,11,0.92)]",
                finalMode && index === 1 && "border-[#080b0b] bg-[#e3d3b6] text-[#080b0b]",
                finalMode && index === 2 && "border-[#080b0b] bg-[#d7904e] text-[#080b0b]",
                finalMode && index > 2 && "border-[#080b0b] bg-[#fff8e9] text-[#080b0b]",
                onPlayerClick && "hover:bg-[#080b0b] hover:text-[#fff8e9] active:scale-[0.99]"
              )}
            >
              <div className="relative">
                <Avatar player={player.name} photo={playerPhotos[player.name]} />
                <div className={cn("absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-sm border border-[#080b0b] text-[0.65rem] font-black", index === 0 ? "bg-[#d6aa27] text-[#080b0b]" : "bg-[#73b53c] text-[#080b0b]")}>
                  {index === 0 ? <Crown className="size-3" /> : index + 1}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-black sm:text-2xl">{player.name}</div>
                <div className={cn("text-xs font-black uppercase tracking-[0.2em]", finalMode && index === 0 ? "text-[#26301d]" : "text-[#49742e]")}>
                  {finalMode ? (index === 0 ? "Champion pace" : `Position ${index + 1}`) : "Tap for breakdown"}
                </div>
              </div>
              <div className={cn("text-4xl font-black tabular-nums", finalMode ? "" : "text-[#2c7bbd]")}>
                <CountUpNumber value={player.score} />
              </div>
            </Comp>
          </motion.div>
        );
      })}
    </div>
  );
}

export function ProgressPanel({ completedCount }: { completedCount: number }) {
  return (
    <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 py-3 text-right shadow-[4px_4px_0_rgba(8,11,11,0.85)]">
      <div className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-[#49742e]">Events Complete</div>
      <div className="text-3xl font-black text-[#c33625]">
        {completedCount}/{competitions.length}
      </div>
    </div>
  );
}

export function GameArt({
  competition,
  className,
  compact = false,
}: {
  competition: Competition;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`${competition.name} event artwork`}
      className={cn(
        "relative isolate overflow-hidden rounded border-2 border-[#080b0b] bg-[#d8c7a7] shadow-[4px_4px_0_rgba(8,11,11,0.9)]",
        compact ? "min-h-20" : "min-h-36 sm:min-h-44",
        className
      )}
      style={{
        boxShadow: "0 18px 42px rgba(15,23,42,0.14)",
      }}
    >
      <Image
        src={competition.visual.imageSrc}
        alt=""
        fill
        sizes={compact ? "(max-width: 768px) 50vw, 12rem" : "(max-width: 1024px) 100vw, 44rem"}
        className="object-cover saturate-105 contrast-105"
        priority={false}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#a6da46]/10 via-transparent to-[#080b0b]/70" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080b0b]/85 via-[#080b0b]/20 to-transparent" />
      <div className={cn("absolute font-black leading-none tracking-tighter text-white/90 drop-shadow-2xl", compact ? "bottom-3 right-3 text-3xl" : "bottom-5 right-5 text-5xl sm:text-6xl")}>
        {competition.visual.symbol}
      </div>
      <div className={cn("absolute left-3 top-3 rounded-sm border-2 border-[#080b0b] bg-[#a6da46] px-3 py-1 font-black uppercase tracking-[0.18em] text-[#080b0b] shadow-[3px_3px_0_rgba(8,11,11,0.9)]", compact ? "text-[0.55rem]" : "text-[0.65rem]")}>
        {competition.visual.label}
      </div>
      {!compact && (
        <div className="absolute bottom-4 left-4 max-w-[70%]">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Aolinpike Event</div>
          <div className="mt-1 line-clamp-1 text-2xl font-black uppercase text-white">{competition.name}</div>
        </div>
      )}
    </div>
  );
}
