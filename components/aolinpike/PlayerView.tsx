"use client";

import { Camera, Check, Lock, Swords, Upload, X, Zap } from "lucide-react";
import { useState } from "react";
import { competitions } from "./data";
import { useAolinpikeState } from "./state";
import { AppShell, GameArt, LoadingBlock, Pill } from "./ui";
import type { CardKind, PlayerVault } from "./types";
import { cn } from "@/lib/utils";

const emptyDraft: PlayerVault = { boost: [], sabotage: [] };

export default function PlayerView() {
  const {
    players,
    playerPhotos,
    submissionStatus,
    loading,
    error: syncError,
    mutationError,
    pendingAction,
    isBusy,
    isOffline,
    realtimeStatus,
    lastSyncedAt,
    refresh,
    unlockPlayerByPin,
    savePlayerProfile,
  } = useAolinpikeState();
  const [pin, setPin] = useState("");
  const [sessionPin, setSessionPin] = useState("");
  const [sessionPlayerId, setSessionPlayerId] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerPhoto, setPlayerPhoto] = useState("");
  const [draft, setDraft] = useState<PlayerVault>(emptyDraft);
  const [error, setError] = useState("");
  const unlocked = Boolean(sessionPin);
  const currentSelectedPlayer = players.includes(selectedPlayer) ? selectedPlayer : (players[0] ?? "");

  async function unlockPlayer() {
    try {
      const profile = await unlockPlayerByPin(currentSelectedPlayer, pin);
      setSessionPlayerId(profile.player.id);
      setPlayerName(profile.player.name);
      setPlayerPhoto(profile.player.photo);
      setDraft(profile.vault);
      setSessionPin(pin);
      setNextPin("");
      setPin("");
      setError("");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Wrong PIN.");
    }
  }

  async function saveProfile() {
    try {
      const response = await savePlayerProfile(sessionPlayerId, sessionPin, playerName, playerPhoto, draft, nextPin);
      setSessionPin(response.pin);
      setNextPin("");
      setError("");
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save player profile.");
      return false;
    }
  }

  async function lockPlayer() {
    const saved = await saveProfile();
    if (!saved) return;
    setSessionPin("");
    setSessionPlayerId("");
    setSelectedPlayer("");
    setNextPin("");
    setPlayerName("");
    setPlayerPhoto("");
    setDraft(emptyDraft);
    setError("");
  }

  return (
    <AppShell
      eyebrow="Player Locker"
      description="Enter your PIN to update your profile photo, display name, and secret card picks."
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
      <section className="poster-panel p-4 sm:p-5">
        {!unlocked ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Pill tone="green">PIN Unlock</Pill>
                <h2 className="distressed-title mt-3 text-4xl font-black uppercase sm:text-6xl">Player Section</h2>
                <p className="mt-2 max-w-2xl text-sm font-black uppercase leading-6 text-[#49742e]">
                  Choose your profile, enter your PIN, then edit your name, photo, card picks, or PIN.
                </p>
              </div>
              <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4 text-sm font-black uppercase text-[#080b0b] shadow-[4px_4px_0_rgba(8,11,11,0.85)]">
                <Lock className="mb-2 size-6 text-[#49742e]" />
                Pick profile + PIN.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {players.map((player) => {
                const selected = currentSelectedPlayer === player;
                const submitted = submissionStatus[player] ?? false;
                return (
                  <button
                    key={player}
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(player);
                      setPin("");
                      setError("");
                    }}
                    className={cn(
                      "grid min-h-52 content-between gap-4 rounded border-2 p-4 text-left shadow-[4px_4px_0_rgba(8,11,11,0.85)] transition active:scale-[0.98]",
                      selected ? "border-[#080b0b] bg-[#73b53c] text-[#080b0b]" : "border-[#080b0b] bg-[#fff8e9] text-[#080b0b] hover:bg-[#e9f2f8]"
                    )}
                  >
                    <LargePlayerPhoto player={player} photo={playerPhotos[player]} />
                    <div className="min-w-0">
                      <div className="truncate text-2xl font-black">{player}</div>
                      <div
                        className={cn(
                          "mt-2 inline-flex rounded border-2 border-[#080b0b] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em]",
                          submitted ? "bg-[#2c7bbd] text-white" : "bg-[#fff8e9] text-[#49742e]"
                        )}
                      >
                        {submitted ? "Card picks saved" : "Card picks open"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <PinInput value={pin} onChange={setPin} label={`${currentSelectedPlayer} PIN`} />
              <button
                type="button"
                disabled={!currentSelectedPlayer || pin.length !== 4 || isBusy("unlock-player-profile") || isOffline}
                onClick={unlockPlayer}
                className="poster-button inline-flex min-h-14 items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] transition hover:bg-[#73b53c] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Lock className="size-4" />
                {isBusy("unlock-player-profile") ? "Checking" : "Unlock"}
              </button>
            </div>
          </div>
        ) : (
          <PlayerEditor
            name={playerName}
            photo={playerPhoto}
            draft={draft}
            nextPin={nextPin}
            saving={isBusy("save-player-profile")}
            isOffline={isOffline}
            onNameChange={setPlayerName}
            onPhotoChange={setPlayerPhoto}
            onNextPinChange={setNextPin}
            onDraftChange={setDraft}
            onSave={saveProfile}
            onLock={lockPlayer}
          />
        )}

        {error && <div className="mt-4 rounded border-2 border-[#080b0b] bg-[#c33625] p-3 text-sm font-black uppercase text-[#fff8e9]">{error}</div>}
      </section>
    </AppShell>
  );
}

function LargePlayerPhoto({ player, photo }: { player: string; photo?: string }) {
  return (
    <div className="grid size-24 place-items-center overflow-hidden rounded border-2 border-[#080b0b] bg-[#fff8e9] text-[#080b0b] shadow-[4px_4px_0_rgba(8,11,11,0.85)]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={`${player} profile`} className="h-full w-full object-cover" />
      ) : (
        <div className="grid gap-1 text-center">
          <Camera className="mx-auto size-6 opacity-60" />
          <span className="text-lg font-black uppercase">{player.slice(0, 2)}</span>
        </div>
      )}
    </div>
  );
}

function PlayerEditor({
  name,
  photo,
  draft,
  nextPin,
  saving,
  isOffline,
  onNameChange,
  onPhotoChange,
  onNextPinChange,
  onDraftChange,
  onSave,
  onLock,
}: {
  name: string;
  photo: string;
  draft: PlayerVault;
  nextPin: string;
  saving: boolean;
  isOffline: boolean;
  onNameChange: (value: string) => void;
  onPhotoChange: (value: string) => void;
  onNextPinChange: (value: string) => void;
  onDraftChange: (draft: PlayerVault) => void;
  onSave: () => void;
  onLock: () => void;
}) {
  const complete = draft.boost.length === 2 && draft.sabotage.length === 2;

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPhotoChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function toggle(kind: CardKind, gameId: string) {
    const selected = draft[kind];
    const selectedAlready = selected.includes(gameId);
    const nextSelected = selectedAlready
      ? selected.filter((id) => id !== gameId)
      : selected.length < 2
        ? [...selected, gameId]
        : selected;

    onDraftChange({
      ...draft,
      [kind]: nextSelected,
    });
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Pill tone="green">Unlocked Player Profile</Pill>
          <h2 className="distressed-title mt-3 text-4xl font-black uppercase sm:text-6xl">{name}</h2>
          <p className="mt-2 max-w-2xl text-sm font-black uppercase leading-6 text-[#49742e]">
            Update your name, photo, two Boost cards, and two Sabotage cards.
          </p>
        </div>
        <button
          type="button"
          onClick={onLock}
          disabled={saving || isOffline}
          className="poster-button inline-flex h-12 items-center gap-2 px-4 text-sm font-black uppercase tracking-[0.16em] transition hover:bg-[#080b0b] hover:text-[#fff8e9] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <X className="size-4" />
          {saving ? "Saving" : "Lock"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
        <div className="rounded border-2 border-[#080b0b] bg-[#fff8e9] p-4 shadow-[4px_4px_0_rgba(8,11,11,0.85)]">
          <div className="grid gap-4">
            <div className="grid place-items-center">
              <div className="grid size-32 place-items-center overflow-hidden rounded border-2 border-[#080b0b] bg-[#f4ead7] shadow-[5px_5px_0_rgba(8,11,11,0.85)]">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={`${name} profile`} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center text-[#49742e]">
                    <Camera className="mx-auto mb-2 size-8" />
                    <div className="text-xs font-black uppercase tracking-[0.18em]">No Photo</div>
                  </div>
                )}
              </div>
            </div>

            <label className="grid gap-1">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">Display Name</span>
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                className="h-12 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-lg font-black text-[#080b0b] outline-none focus:border-[#73b53c]"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#49742e]">New PIN</span>
              <input
                value={nextPin}
                maxLength={4}
                inputMode="numeric"
                type="password"
                placeholder="Leave blank to keep"
                onChange={(event) => onNextPinChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-12 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-lg font-black tracking-[0.3em] text-[#080b0b] outline-none focus:border-[#73b53c]"
              />
              <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#49742e]">Optional. Enter 4 digits to change.</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="poster-button inline-flex h-11 cursor-pointer items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-[#73b53c]">
                <Upload className="size-4" />
                Upload
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
              </label>
              <button
                type="button"
                onClick={() => onPhotoChange("")}
                className="poster-button h-11 px-3 text-xs font-black uppercase tracking-[0.14em] transition hover:bg-[#c33625] hover:text-[#fff8e9]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <CardPicker
            kind="boost"
            title="Boost Cards"
            icon={<Zap className="size-5" />}
            selectedGames={draft.boost}
            onToggle={(gameId) => toggle("boost", gameId)}
          />
          <CardPicker
            kind="sabotage"
            title="Sabotage Cards"
            icon={<Swords className="size-5" />}
            selectedGames={draft.sabotage}
            onToggle={(gameId) => toggle("sabotage", gameId)}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!name.trim() || !complete || saving || isOffline}
        onClick={onSave}
        className="poster-button min-h-16 px-5 text-lg font-black uppercase tracking-[0.18em] transition hover:bg-[#73b53c] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {saving ? "Saving Profile..." : complete ? "Save Profile And Cards" : "Pick 2 Boost + 2 Sabotage"}
      </button>
    </div>
  );
}

function CardPicker({
  kind,
  title,
  icon,
  selectedGames,
  onToggle,
}: {
  kind: CardKind;
  title: string;
  icon: React.ReactNode;
  selectedGames: string[];
  onToggle: (gameId: string) => void;
}) {
  const isBoost = kind === "boost";

  return (
    <div className={cn("rounded border-2 border-[#080b0b] p-4 shadow-[4px_4px_0_rgba(8,11,11,0.85)]", isBoost ? "bg-[#e9f2f8]" : "bg-[#fff0e8]")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xl font-black uppercase text-[#080b0b]">{title}</h3>
        </div>
        <div className={cn("rounded px-3 py-1 text-xs font-black", isBoost ? "bg-[#2c7bbd] text-white" : "bg-[#c33625] text-white")}>
          {selectedGames.length}/2
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {competitions.map((competition) => {
          const selected = selectedGames.includes(competition.id);
          const locked = !selected && selectedGames.length >= 2;

          return (
            <button
              key={competition.id}
              type="button"
              disabled={locked}
              onClick={() => onToggle(competition.id)}
              className={cn(
                "min-h-16 rounded border-2 border-[#080b0b] p-3 text-left text-sm font-black transition active:scale-[0.98]",
                selected && isBoost && "bg-[#2c7bbd] text-white shadow-[4px_4px_0_rgba(8,11,11,0.9)]",
                selected && !isBoost && "bg-[#c33625] text-white shadow-[4px_4px_0_rgba(8,11,11,0.9)]",
                !selected && "bg-[#fff8e9] text-[#080b0b] hover:bg-[#080b0b] hover:text-[#fff8e9]",
                locked && "cursor-not-allowed opacity-25"
              )}
            >
              <GameArt competition={competition} compact className="mb-2 min-h-16" />
              <span className="line-clamp-2">{competition.name}</span>
              {selected && <Check className="mt-2 size-5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PinInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="grid gap-1">
      <span className="sr-only">{label}</span>
      <input
        value={value}
        maxLength={4}
        inputMode="numeric"
        type="password"
        placeholder="PIN"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-14 min-w-0 rounded border-2 border-[#080b0b] bg-[#fff8e9] px-4 text-center text-2xl font-black tracking-[0.4em] text-[#080b0b] outline-none focus:border-[#73b53c]"
      />
    </label>
  );
}
