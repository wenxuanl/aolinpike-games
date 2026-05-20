"use client";

import { Lock, Swords, X, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { competitions } from "./data";
import { useAolinpikeState } from "./state";
import { AppShell, Avatar, GameArt, LoadingBlock, Pill } from "./ui";
import type { CardKind, PlayerVault } from "./types";
import { cn } from "@/lib/utils";

type BoothMode = "locked" | "admin" | "cards";

const emptyDraft: PlayerVault = { boost: [], sabotage: [] };

export default function BoothView() {
  const {
    players,
    vault,
    playerPhotos,
    submissionStatus,
    savePlayerVault,
    updatePlayerPin,
    updateAdminPin,
    resetVault,
    generateTestData,
    unlockAdminBooth,
    loading,
    error: syncError,
    mutationError,
    pendingAction,
    isBusy,
    isOffline,
    realtimeStatus,
    lastSyncedAt,
    refresh,
  } = useAolinpikeState();
  const [mode, setMode] = useState<BoothMode>("locked");
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]);
  const [adminPinEntry, setAdminPinEntry] = useState("");
  const [adminSessionPin, setAdminSessionPin] = useState("");
  const [visibleAdminPin, setVisibleAdminPin] = useState("");
  const [adminPlayerPins, setAdminPlayerPins] = useState<Record<string, string>>({});
  const [adminVault, setAdminVault] = useState<Record<string, PlayerVault>>({});
  const [draft, setDraft] = useState<PlayerVault>(emptyDraft);
  const [error, setError] = useState("");
  const currentPlayer = players.includes(selectedPlayer) ? selectedPlayer : players[0];

  const submitted = useMemo(() => {
    return Object.fromEntries(players.map((player) => [player, submissionStatus[player] ?? false]));
  }, [players, submissionStatus]);

  async function unlockAdmin() {
    try {
      const unlock = await unlockAdminBooth(adminPinEntry);
      setAdminSessionPin(adminPinEntry);
      setVisibleAdminPin(unlock.adminPin);
      setAdminPlayerPins(unlock.playerPins);
      setAdminVault(unlock.vault);
      setAdminPinEntry("");
      setError("");
      setMode("admin");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Wrong admin PIN.");
    }
  }

  async function saveAndLock() {
    try {
      await savePlayerVault(currentPlayer, draft, adminSessionPin);
      setAdminVault((current) => ({
        ...current,
        [currentPlayer]: {
          boost: [...draft.boost],
          sabotage: [...draft.sabotage],
        },
      }));
      setMode("admin");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save picks.");
    }
  }

  function lockBooth() {
    setMode("locked");
    setAdminPinEntry("");
    setAdminSessionPin("");
    setVisibleAdminPin("");
    setAdminPlayerPins({});
    setAdminVault({});
    setDraft(emptyDraft);
    setError("");
  }

  function adminEditPlayer(player: string) {
    setSelectedPlayer(player);
    const playerVault = adminVault[player] ?? vault[player] ?? emptyDraft;
    setDraft({
      boost: [...playerVault.boost],
      sabotage: [...playerVault.sabotage],
    });
    setError("");
    setMode("cards");
  }

  return (
    <AppShell
      eyebrow="Admin"
      description="Admin-only controls for player PINs, card overrides, resets, and test data."
      connection={{
        loading,
        error: syncError,
        mutationError,
        pendingAction,
        isOffline,
        realtimeStatus,
        lastSyncedAt,
        onRetry: refresh,
      }}
    >
      {loading && !lastSyncedAt ? <LoadingBlock /> : null}
      <section className="relative overflow-hidden poster-panel p-4 shadow-sm sm:p-5">
        {mode === "locked" && (
          <AdminLockedBooth
            adminPinEntry={adminPinEntry}
            setAdminPinEntry={setAdminPinEntry}
            error={error}
            busyAdminUnlock={isBusy("unlock-admin")}
            isOffline={isOffline}
            unlockAdmin={unlockAdmin}
          />
        )}

        {mode === "cards" && (
          <AdminCardEditor
            player={currentPlayer}
            draft={draft}
            setDraft={setDraft}
            onSave={saveAndLock}
            onCancel={() => setMode("admin")}
            saving={isBusy(`save-vault-${currentPlayer}`)}
            isOffline={isOffline}
          />
        )}

        {mode === "admin" && (
          <AdminPanel
            players={players}
            playerPhotos={playerPhotos}
            playerPins={adminPlayerPins}
            adminPin={visibleAdminPin}
            submitted={submitted}
            updatePlayerPin={(player, pin, adminPinValue) =>
              updatePlayerPin(player, pin, adminPinValue)
                .then(() => setAdminPlayerPins((current) => ({ ...current, [player]: pin })))
                .catch((pinError) => setError(pinError instanceof Error ? pinError.message : "Unable to update player PIN."))
            }
            updateAdminPin={(pin, adminPinValue) =>
              updateAdminPin(pin, adminPinValue)
                .then(() => {
                  setVisibleAdminPin(pin);
                  setAdminSessionPin(pin);
                })
                .catch((pinError) => setError(pinError instanceof Error ? pinError.message : "Unable to update admin PIN."))
            }
            resetVault={() => resetVault(adminSessionPin).catch((resetError) => setError(resetError instanceof Error ? resetError.message : "Unable to reset submissions."))}
            generateTestData={() => generateTestData(adminSessionPin).catch((testError) => setError(testError instanceof Error ? testError.message : "Unable to generate test data."))}
            editPlayer={adminEditPlayer}
            adminSessionPin={adminSessionPin}
            isBusy={isBusy}
            isOffline={isOffline}
            onDone={lockBooth}
          />
        )}

        {mode !== "locked" && error ? (
          <div className="mt-4 rounded border-2 border-[#080b0b] bg-[#c33625] p-3 text-sm font-black uppercase text-[#fff8e9]">{error}</div>
        ) : null}
      </section>
    </AppShell>
  );
}

function AdminLockedBooth({
  adminPinEntry,
  setAdminPinEntry,
  error,
  busyAdminUnlock,
  isOffline,
  unlockAdmin,
}: {
  adminPinEntry: string;
  setAdminPinEntry: (pin: string) => void;
  error: string;
  busyAdminUnlock: boolean;
  isOffline: boolean;
  unlockAdmin: () => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone="gold">Admin Locked</Pill>
          <h2 className="mt-3 text-4xl font-black uppercase text-[#080b0b] sm:text-6xl">Admin Control</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#26301d]">
            Admin-only controls for player PINs and card overrides. Players make their own choices from the Player page.
          </p>
        </div>
        <div className="rounded border border-[#c33625] bg-[#fff0e8] p-4 text-sm font-bold text-[#c33625]">
          <Lock className="mb-2 size-6" />
          Player secrets stay off the public screen.
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded border border-[#d6aa27] bg-[#f5dda0] p-4">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#49742e]">Admin</div>
          <div className="mt-2 text-sm font-bold leading-6 text-[#26301d]">Reset submissions, edit a player, or change PINs.</div>
          <div className="mt-4 flex gap-2">
            <PinInput value={adminPinEntry} onChange={setAdminPinEntry} label="Admin PIN" />
            <button
              type="button"
              onClick={unlockAdmin}
              disabled={adminPinEntry.length !== 4 || busyAdminUnlock || isOffline}
              className="min-h-14 rounded border border-[#080b0b] bg-[#a6da46] px-5 text-sm font-black uppercase tracking-[0.16em] text-[#080b0b] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-[#080b0b] disabled:bg-slate-100 disabled:text-slate-300"
            >
              {busyAdminUnlock ? "Checking" : "Admin"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded border border-[#c33625] bg-[#fff0e8] p-3 text-sm font-black text-[#c33625]">{error}</div>}
    </div>
  );
}

function AdminCardEditor({
  player,
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  isOffline,
}: {
  player: string;
  draft: PlayerVault;
  setDraft: (draft: PlayerVault) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isOffline: boolean;
}) {
  const complete = draft.boost.length === 2 && draft.sabotage.length === 2;

  function toggle(kind: CardKind, gameId: string) {
    const selected = draft[kind];
    const selectedAlready = selected.includes(gameId);
    const maxCards = 2;
    const nextSelected = selectedAlready
      ? selected.filter((id) => id !== gameId)
      : selected.length < maxCards
        ? [...selected, gameId]
        : selected;

    setDraft({
      ...draft,
      [kind]: nextSelected,
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone="red">Admin Card Override</Pill>
          <h2 className="mt-3 text-4xl font-black uppercase text-[#080b0b] sm:text-6xl">{player}</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#26301d]">
            Change this player&apos;s two Boost games and two Sabotage games.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-12 items-center gap-2 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-sm font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100"
        >
          <X className="size-4" />
          Back
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <VaultCardPicker
          kind="boost"
          title="Boost Cards"
          icon={<Zap className="size-5" />}
          selectedGames={draft.boost}
          maxCards={2}
          onToggle={(gameId) => toggle("boost", gameId)}
        />
        <VaultCardPicker
          kind="sabotage"
          title="Sabotage Cards"
          icon={<Swords className="size-5" />}
          selectedGames={draft.sabotage}
          maxCards={2}
          onToggle={(gameId) => toggle("sabotage", gameId)}
        />
      </div>

      <button
        type="button"
        disabled={!complete || saving || isOffline}
        onClick={onSave}
        className="min-h-16 rounded border border-[#080b0b] bg-[#2c7bbd] px-5 text-lg font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-[#080b0b] disabled:bg-slate-100 disabled:text-slate-300"
      >
        {saving ? "Saving Picks..." : "Save Picks And Return"}
      </button>
    </div>
  );
}

function AdminPanel({
  players,
  playerPhotos,
  playerPins,
  adminPin,
  submitted,
  updatePlayerPin,
  updateAdminPin,
  resetVault,
  generateTestData,
  editPlayer,
  adminSessionPin,
  isBusy,
  isOffline,
  onDone,
}: {
  players: string[];
  playerPhotos: Record<string, string>;
  playerPins: Record<string, string>;
  adminPin: string;
  submitted: Record<string, boolean>;
  updatePlayerPin: (player: string, pin: string, adminPin: string) => void;
  updateAdminPin: (pin: string, adminPin: string) => void;
  resetVault: () => void;
  generateTestData: () => void;
  editPlayer: (player: string) => void;
  adminSessionPin: string;
  isBusy: (key?: string) => boolean;
  isOffline: boolean;
  onDone: () => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone="gold">Admin Unlocked</Pill>
          <h2 className="mt-3 text-4xl font-black uppercase text-[#080b0b] sm:text-6xl">Admin Control</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#26301d]">
            Edit submissions, change simple PINs, or clear all card picks. Choices are still hidden on the public lock screen.
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-12 items-center gap-2 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-sm font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100"
        >
          <X className="size-4" />
          Lock Admin
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {players.map((player) => (
          <div key={player} className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar player={player} photo={playerPhotos[player]} />
                <div className="min-w-0">
                  <div className="truncate text-xl font-black text-[#080b0b]">{player}</div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#49742e]">
                    {submitted[player] ? "Submitted" : "Not submitted"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => editPlayer(player)}
                disabled={isOffline}
                className="rounded border border-[#d6aa27] bg-[#a6da46] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-black"
              >
                Edit
              </button>
            </div>
            <label className="mt-4 grid gap-1">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">Player PIN</span>
              <input
                defaultValue={playerPins[player] ?? ""}
                maxLength={4}
                inputMode="numeric"
                onBlur={(event) => {
                  const nextPin = event.target.value.replace(/\D/g, "").slice(0, 4);
                  if (nextPin.length === 4) updatePlayerPin(player, nextPin, adminSessionPin);
                }}
                disabled={isOffline || isBusy(`pin-${player}`)}
                className="h-12 poster-panel px-4 text-lg font-black tracking-[0.3em] text-[#080b0b] outline-none focus:border-[#080b0b]"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">Admin PIN</span>
          <input
            defaultValue={adminPin}
            maxLength={4}
            inputMode="numeric"
            onBlur={(event) => {
              const nextPin = event.target.value.replace(/\D/g, "").slice(0, 4);
              if (nextPin.length === 4) updateAdminPin(nextPin, adminSessionPin);
            }}
            disabled={isOffline || isBusy("pin-admin")}
            className="mt-2 h-12 w-full poster-panel px-4 text-lg font-black tracking-[0.3em] text-[#080b0b] outline-none focus:border-[#080b0b]"
          />
        </label>
        <button
          type="button"
          onClick={resetVault}
          disabled={isOffline || isBusy("reset-vault")}
          className="min-h-16 rounded border border-[#c33625] bg-[#fff0e8] px-5 text-sm font-black uppercase tracking-[0.18em] text-[#c33625] transition hover:bg-red-100"
        >
          Reset All Card Submissions
        </button>
        <button
          type="button"
          onClick={generateTestData}
          disabled={isOffline || isBusy("test-data")}
          className="min-h-16 rounded border border-[#2c7bbd] bg-[#e9f2f8] px-5 text-sm font-black uppercase tracking-[0.18em] text-[#2c7bbd] transition hover:bg-blue-100"
        >
          Generate Test Results + Cards
        </button>
      </div>
    </div>
  );
}

function VaultCardPicker({
  kind,
  title,
  icon,
  selectedGames,
  maxCards,
  onToggle,
}: {
  kind: CardKind;
  title: string;
  icon: React.ReactNode;
  selectedGames: string[];
  maxCards: number;
  onToggle: (gameId: string) => void;
}) {
  const isBoost = kind === "boost";

  return (
    <div className={cn("rounded border p-4", isBoost ? "border-[#2c7bbd] bg-[#e9f2f8]" : "border-[#c33625] bg-[#fff0e8]")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xl font-black uppercase text-[#080b0b]">{title}</h3>
        </div>
        <div className={cn("rounded px-3 py-1 text-xs font-black", isBoost ? "bg-[#2c7bbd] text-white" : "bg-[#c33625] text-white")}>
          {selectedGames.length}/{maxCards}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {competitions.map((competition) => {
          const selected = selectedGames.includes(competition.id);
          const locked = !selected && selectedGames.length >= maxCards;

          return (
            <button
              key={competition.id}
              type="button"
              disabled={locked}
              onClick={() => onToggle(competition.id)}
              className={cn(
                "min-h-16 rounded border p-3 text-left text-sm font-black transition active:scale-[0.98]",
                selected && isBoost && "border-[#080b0b] bg-[#2c7bbd] text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]",
                selected && !isBoost && "border-red-600 bg-[#c33625] text-white shadow-[0_12px_24px_rgba(220,38,38,0.18)]",
                !selected && "border-[#080b0b] bg-[#fff8e9] text-[#080b0b] hover:border-blue-300 hover:bg-[#e9f2f8]",
                locked && "cursor-not-allowed opacity-25"
              )}
            >
              <GameArt competition={competition} compact className="mb-2 min-h-16" />
              <span className="line-clamp-2">{competition.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PinInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="grid flex-1 gap-1">
      <span className="sr-only">{label}</span>
      <input
        value={value}
        maxLength={4}
        inputMode="numeric"
        type="password"
        placeholder="PIN"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-14 min-w-0 poster-panel px-4 text-center text-2xl font-black tracking-[0.4em] text-[#080b0b] outline-none focus:border-blue-300"
      />
    </label>
  );
}
