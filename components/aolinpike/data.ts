import type { Competition, Results, Vault } from "./types";

export const defaultPlayers = ["Player 1", "Player 2", "Player 3", "Player 4"];

export const competitions = [
  {
    id: "basketball",
    name: "Grand Basketball",
    points: [4, 2, 0, 0],
    note: "Skills + shooting + HORSE",
    visual: {
      imageSrc: "/game-photos/basketball-olympic.png",
      symbol: "BB",
      label: "Court Duel",
      gradient: "linear-gradient(135deg, #f97316 0%, #facc15 42%, #111827 100%)",
      glow: "#fb923c",
    },
  },
  {
    id: "pingpong",
    name: "Ping Pong",
    points: [4, 2, 0, 0],
    note: "2v2 then 1v1 final",
    visual: {
      imageSrc: "/game-photos/pingpong-olympic.png",
      symbol: "PP",
      label: "Spin Zone",
      gradient: "linear-gradient(135deg, #22c55e 0%, #06b6d4 45%, #020617 100%)",
      glow: "#67e8f9",
    },
  },
  {
    id: "gokart",
    name: "Go Kart",
    points: [4, 2, 0, 0],
    note: "Rank by lap time",
    visual: {
      imageSrc: "/game-photos/gokart-olympic.jpg",
      symbol: "GT",
      label: "Fast Lap",
      gradient: "linear-gradient(135deg, #ef4444 0%, #f59e0b 45%, #111827 100%)",
      glow: "#fca5a5",
    },
  },
  {
    id: "bowling",
    name: "Bowling",
    points: [4, 2, 0, 0],
    note: "Regular bowling",
    visual: {
      imageSrc: "/game-photos/bowling-olympic.jpg",
      symbol: "10",
      label: "Strike Lane",
      gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 45%, #111827 100%)",
      glow: "#f0abfc",
    },
  },
  {
    id: "darts",
    name: "Darts",
    points: [4, 2, 0, 0],
    note: "501",
    visual: {
      imageSrc: "/game-photos/darts-olympic.jpg",
      symbol: "501",
      label: "Bullseye",
      gradient: "linear-gradient(135deg, #dc2626 0%, #84cc16 45%, #020617 100%)",
      glow: "#bef264",
    },
  },
  {
    id: "bike",
    name: "800m Bike Sprint",
    points: [4, 2, 0, 0],
    note: "Rank by time",
    visual: {
      imageSrc: "/game-photos/bike-olympic.jpg",
      symbol: "800",
      label: "Sprint Heat",
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #a3e635 45%, #020617 100%)",
      glow: "#7dd3fc",
    },
  },
  {
    id: "cornhole",
    name: "Corn Hole",
    points: [4, 2, 0, 0],
    note: "2v2 then 1v1 final",
    visual: {
      imageSrc: "/game-photos/cornhole-olympic.jpg",
      symbol: "CH",
      label: "Bag Toss",
      gradient: "linear-gradient(135deg, #eab308 0%, #22c55e 48%, #111827 100%)",
      glow: "#fde047",
    },
  },
  {
    id: "holdem",
    name: "Texas Hold'em",
    points: [4, 2, 0, 0],
    note: "30-min quick game",
    visual: {
      imageSrc: "/game-photos/holdem-olympic.jpg",
      symbol: "A",
      label: "All In",
      gradient: "linear-gradient(135deg, #991b1b 0%, #111827 42%, #facc15 100%)",
      glow: "#f87171",
    },
  },
  {
    id: "pool",
    name: "5-5-5 Pool",
    points: [4, 2, 0, 0],
    note: "Classic, 10 games",
    visual: {
      imageSrc: "/game-photos/pool-olympic.jpg",
      symbol: "8",
      label: "Cue Clash",
      gradient: "linear-gradient(135deg, #16a34a 0%, #111827 45%, #f8fafc 100%)",
      glow: "#86efac",
    },
  },
  {
    id: "nba2k",
    name: "NBA 2K26",
    points: [4, 2, 0, 0],
    note: "PS5",
    visual: {
      imageSrc: "/game-photos/nba2k-olympic.jpg",
      symbol: "2K",
      label: "Console Arena",
      gradient: "linear-gradient(135deg, #2563eb 0%, #ef4444 48%, #020617 100%)",
      glow: "#93c5fd",
    },
  },
  {
    id: "mario",
    name: "Mario Party",
    points: [4, 2, 0, 0],
    note: "10 rounds",
    visual: {
      imageSrc: "/game-photos/mario-olympic.jpg",
      symbol: "MP",
      label: "Bonus Star",
      gradient: "linear-gradient(135deg, #ef4444 0%, #22c55e 38%, #facc15 100%)",
      glow: "#fde047",
    },
  },
  {
    id: "beerpong",
    name: "Office Golf Beer Pong",
    points: [4, 2, 0, 0],
    note: "Final game",
    visual: {
      imageSrc: "/game-photos/beerpong-olympic.jpg",
      symbol: "19",
      label: "Final Cup",
      gradient: "linear-gradient(135deg, #14b8a6 0%, #f97316 46%, #111827 100%)",
      glow: "#5eead4",
    },
  },
] satisfies Competition[];

export function createInitialResults(): Results {
  return Object.fromEntries(
    competitions.map((competition) => [
      competition.id,
      {
        winner: "",
        runnerUp: "",
      },
    ])
  ) as Results;
}

export function createInitialVault(players: string[]): Vault {
  return Object.fromEntries(
    players.map((player) => [
      player,
      {
        boost: [],
        sabotage: [],
      },
    ])
  ) as Vault;
}

export function createInitialPins(players: string[]): Record<string, string> {
  return Object.fromEntries(players.map((player, index) => [player, String(index + 1).repeat(4)]));
}

export function createInitialPhotos(players: string[]): Record<string, string> {
  return Object.fromEntries(players.map((player) => [player, ""]));
}

export const defaultAdminPin = "0000";
