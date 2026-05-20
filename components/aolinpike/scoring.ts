import { competitions } from "./data";
import type { BaseBreakdownItem, RankedScore, Results, RevealBreakdownItem, RevealEvent, Vault } from "./types";

const revealOrder = ["boost", "sabotage"] as const;

export function getBaseScores(players: string[], results: Results): Record<string, number> {
  const scores = Object.fromEntries(players.map((player) => [player, 0]));

  for (const competition of competitions) {
    const result = results[competition.id];
    if (result?.winner) scores[result.winner] += competition.points[0] ?? 0;
    if (result?.runnerUp && result.runnerUp !== result.winner) {
      scores[result.runnerUp] += competition.points[1] ?? 0;
    }
  }

  return scores;
}

export function rankScores(scores: Record<string, number>): RankedScore[] {
  return Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function getCompletedCount(results: Results): number {
  return competitions.filter((competition) => {
    const result = results[competition.id];
    return Boolean(result?.winner && result?.runnerUp);
  }).length;
}

export function getPointsForPlayer(gameId: string, player: string, results: Results): number {
  const competition = competitions.find((item) => item.id === gameId);
  const result = results[gameId];

  if (!competition || !result) return 0;
  if (result.winner === player) return competition.points[0] ?? 0;
  if (result.runnerUp === player && result.runnerUp !== result.winner) {
    return competition.points[1] ?? 0;
  }

  return 0;
}

export function getBaseBreakdown(player: string, results: Results): BaseBreakdownItem[] {
  return competitions.flatMap<BaseBreakdownItem>((competition) => {
    const result = results[competition.id];
    if (!result) return [];

    if (result.winner === player) {
      return [
        {
          gameId: competition.id,
          gameName: competition.name,
          placement: "Winner" as const,
          basePoints: competition.points[0] ?? 0,
        },
      ];
    }

    if (result.runnerUp === player && result.runnerUp !== result.winner) {
      return [
        {
          gameId: competition.id,
          gameName: competition.name,
          placement: "Runner-up" as const,
          basePoints: competition.points[1] ?? 0,
        },
      ];
    }

    return [];
  });
}

export function getRevealBreakdown(player: string, players: string[], results: Results, vault: Vault): RevealBreakdownItem[] {
  return competitions.map((competition) => {
    const result = results[competition.id];
    const placement =
      result?.winner === player
        ? "Winner"
        : result?.runnerUp === player && result.runnerUp !== result.winner
          ? "Runner-up"
          : "No score";
    const basePoints = getPointsForPlayer(competition.id, player, results);
    const boostDelta = vault[player]?.boost.includes(competition.id) ? basePoints : 0;
    const sabotageSources = players.filter((otherPlayer) => {
      if (otherPlayer === player) return false;
      return vault[otherPlayer]?.sabotage.includes(competition.id);
    });
    const sabotageDelta = getStackedSabotageDelta(basePoints, sabotageSources.length);
    const effects = [
      ...(boostDelta > 0 ? ["Boost Card"] : []),
      ...sabotageSources.map((source, index) => `Hit by ${source}'s Sabotage ${formatSignedDelta(getSabotageStrikeDelta(basePoints, index + 1))}`),
    ];

    return {
      gameId: competition.id,
      gameName: competition.name,
      placement,
      basePoints,
      boostDelta,
      sabotageDelta,
      finalPoints: basePoints + boostDelta + sabotageDelta,
      effects,
    };
  });
}

export function buildRevealEvents(players: string[], results: Results, vault: Vault): RevealEvent[] {
  const events: RevealEvent[] = [];
  const sabotageStrikeCounts = new Map<string, number>();

  for (const kind of revealOrder) {
    for (const player of players) {
      const assignedGames = vault[player]?.[kind] ?? [];

      for (const gameId of assignedGames) {
        const competition = competitions.find((item) => item.id === gameId);
        if (!competition) continue;

        const deltas = Object.fromEntries(players.map((name) => [name, 0]));

        if (kind === "boost") {
          const basePoints = getPointsForPlayer(gameId, player, results);
          deltas[player] = basePoints;
          events.push({
            id: `${player}-${kind}-${gameId}`,
            player,
            kind,
            gameId,
            gameName: competition.name,
            deltas,
            headline: `${player} reveals a Boost Card`,
            detail:
              basePoints > 0
                ? `${competition.name} points double for +${basePoints}`
                : `${competition.name} had no earned points to double`,
          });
        } else {
          for (const opponent of players) {
            if (opponent === player) continue;
            const strikeKey = `${gameId}:${opponent}`;
            const strikeCount = (sabotageStrikeCounts.get(strikeKey) ?? 0) + 1;
            sabotageStrikeCounts.set(strikeKey, strikeCount);
            deltas[opponent] = getSabotageStrikeDelta(getPointsForPlayer(gameId, opponent, results), strikeCount);
          }

          events.push({
            id: `${player}-${kind}-${gameId}`,
            player,
            kind,
            gameId,
            gameName: competition.name,
            deltas,
            headline: `${player} reveals a Sabotage Card`,
            detail: `${competition.name} applies stacked -2x sabotage to opponents' earned points`,
          });
        }
      }
    }
  }

  return events;
}

export function getSabotageStrikeDelta(basePoints: number, strikeCount: number) {
  if (basePoints === 0 || strikeCount <= 0) return 0;
  return Math.pow(-2, strikeCount) * basePoints;
}

export function getStackedSabotageDelta(basePoints: number, strikeCount: number) {
  let total = 0;
  for (let index = 1; index <= strikeCount; index += 1) {
    total += getSabotageStrikeDelta(basePoints, index);
  }
  return total;
}

function formatSignedDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export function applyRevealEvents(
  baseScores: Record<string, number>,
  events: RevealEvent[],
  visibleCount: number
): Record<string, number> {
  const scores = { ...baseScores };

  for (const event of events.slice(0, visibleCount)) {
    for (const [player, delta] of Object.entries(event.deltas)) {
      scores[player] += delta;
    }
  }

  return scores;
}
