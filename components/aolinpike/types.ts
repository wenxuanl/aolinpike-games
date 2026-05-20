export type CardKind = "boost" | "sabotage";

export type Competition = {
  id: string;
  name: string;
  points: number[];
  note: string;
  visual: {
    imageSrc: string;
    symbol: string;
    label: string;
    gradient: string;
    glow: string;
  };
};

export type GameResult = {
  winner: string;
  runnerUp: string;
};

export type Results = Record<string, GameResult>;

export type PlayerVault = {
  boost: string[];
  sabotage: string[];
};

export type Vault = Record<string, PlayerVault>;

export type RankedScore = {
  name: string;
  score: number;
};

export type SystemUpdateKind = "score" | "player" | "admin" | "cards" | "reveal" | "system";

export type SystemUpdate = {
  id: string;
  kind: SystemUpdateKind;
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
};

export type RevealEvent = {
  id: string;
  player: string;
  kind: CardKind;
  gameId: string;
  gameName: string;
  deltas: Record<string, number>;
  headline: string;
  detail: string;
};

export type StoredState = {
  players: string[];
  results: Results;
  vault: Vault;
  playerPins: Record<string, string>;
  submissionStatus: Record<string, boolean>;
  playerPhotos: Record<string, string>;
  adminPin: string;
  updates: SystemUpdate[];
};

export type BaseBreakdownItem = {
  gameId: string;
  gameName: string;
  placement: "Winner" | "Runner-up";
  basePoints: number;
};

export type RevealBreakdownItem = Omit<BaseBreakdownItem, "placement"> & {
  placement: "Winner" | "Runner-up" | "No score";
  boostDelta: number;
  sabotageDelta: number;
  finalPoints: number;
  effects: string[];
};
