"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Plus, Minus, Crown, Users, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const defaultPlayers = ["Player 1", "Player 2", "Player 3", "Player 4"];

const competitions = [
  { id: "basketball", name: "Grand Basketball", points: [2, 1, 0, 0], note: "Skills + shooting + HORSE" },
  { id: "pingpong", name: "Ping Pong", points: [4, 2, 0, 0], note: "2v2 then 1v1 final" },
  { id: "gokart", name: "Go Kart", points: [4, 2, 0, 0], note: "Rank by lap time" },
  { id: "bowling", name: "Bowling", points: [4, 2, 0, 0], note: "Regular bowling" },
  { id: "darts", name: "Darts", points: [4, 2, 0, 0], note: "501" },
  { id: "bike", name: "800m Bike Sprint", points: [4, 2, 0, 0], note: "Rank by time" },
  { id: "cornhole", name: "Corn Hole", points: [4, 2, 0, 0], note: "2v2 then 1v1 final" },
  { id: "holdem", name: "Texas Hold’em", points: [4, 2, 0, 0], note: "30-min quick game" },
  { id: "pool", name: "5-5-5 Pool", points: [4, 2, 0, 0], note: "Classic, 10 games" },
  { id: "nba2k", name: "NBA 2K26", points: [4, 2, 0, 0], note: "PS5" },
  { id: "mario", name: "Mario Party", points: [4, 2, 0, 0], note: "10 rounds" },
  { id: "beerpong", name: "Office Golf Beer Pong", points: [4, 2, 0, 0], note: "Final game" },
];

function initialResults() {
  return Object.fromEntries(
    competitions.map((c) => [
      c.id,
      { ranking: ["", "", "", ""], x2: [], neg2: [] },
    ])
  );
}

export default function AolinpikeScoreTracker() {
  const [players, setPlayers] = useState(defaultPlayers);
  const [results, setResults] = useState(initialResults);

  const totals = useMemo(() => {
    const score = Object.fromEntries(players.map((p) => [p, 0]));

    for (const comp of competitions) {
      const r = results[comp.id];
      r.ranking.forEach((player, place) => {
        if (!player) return;
        let pts = comp.points[place] ?? 0;
        if (r.x2.includes(player)) pts *= 2;
        if (r.neg2.some((caster) => caster !== player)) pts -= 2;
        score[player] += pts;
      });
    }

    return Object.entries(score)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);
  }, [players, results]);

  const cardUsage = useMemo(() => {
    return players.map((p) => {
      let x2 = 0;
      let neg2 = 0;
      Object.values(results).forEach((r) => {
        if (r.x2.includes(p)) x2 += 1;
        if (r.neg2.includes(p)) neg2 += 1;
      });
      return { player: p, x2, neg2 };
    });
  }, [players, results]);

  function updateRanking(compId, place, value) {
    setResults((prev) => ({
      ...prev,
      [compId]: {
        ...prev[compId],
        ranking: prev[compId].ranking.map((p, i) => (i === place ? value : p)),
      },
    }));
  }

  function toggleCard(compId, type, player) {
    if (!player) return;
    setResults((prev) => {
      const current = prev[compId][type];
      return {
        ...prev,
        [compId]: {
          ...prev[compId],
          [type]: current.includes(player)
            ? current.filter((p) => p !== player)
            : [...current, player],
        },
      };
    });
  }

  function resetAll() {
    setResults(initialResults());
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 p-1 shadow-2xl"
        >
          <div className="rounded-3xl bg-neutral-950/90 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-lime-300">4 Wheel AWD</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Aolinpike Games</h1>
                <p className="mt-2 text-lg text-neutral-300">Score tracker for 4 players · Higher, Faster and More Childish</p>
              </div>
              <Button onClick={resetAll} className="rounded-2xl bg-white text-neutral-950 hover:bg-neutral-200">
                <RotateCcw className="mr-2 h-4 w-4" /> Reset scores
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-4">
          {players.map((p, i) => (
            <Card key={i} className="rounded-3xl border-neutral-800 bg-neutral-900 shadow-xl">
              <CardContent className="p-4">
                <label className="mb-2 block text-xs uppercase tracking-widest text-neutral-500">Player {i + 1}</label>
                <input
                  value={p}
                  onChange={(e) => {
                    const old = players[i];
                    const next = e.target.value || `Player ${i + 1}`;
                    setPlayers((arr) => arr.map((x, idx) => (idx === i ? next : x)));
                    setResults((prev) => {
                      const copy = structuredClone(prev);
                      Object.values(copy).forEach((r) => {
                        r.ranking = r.ranking.map((x) => (x === old ? next : x));
                        r.x2 = r.x2.map((x) => (x === old ? next : x));
                        r.neg2 = r.neg2.map((x) => (x === old ? next : x));
                      });
                      return copy;
                    });
                  }}
                  className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-lg font-bold outline-none focus:border-lime-400"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-3xl border-lime-500/30 bg-neutral-900 shadow-xl lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-lime-300" />
                <h2 className="text-2xl font-black">Leaderboard</h2>
              </div>
              <div className="space-y-3">
                {totals.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between rounded-2xl bg-neutral-950 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-400 font-black text-neutral-950">
                        {i === 0 ? <Crown className="h-5 w-5" /> : i + 1}
                      </div>
                      <span className="text-xl font-bold">{t.name}</span>
                    </div>
                    <span className="text-3xl font-black text-lime-300">{t.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-neutral-800 bg-neutral-900 shadow-xl">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 text-lime-300" />
                <h2 className="text-2xl font-black">Card Usage</h2>
              </div>
              <div className="space-y-3 text-sm">
                {cardUsage.map((u) => (
                  <div key={u.player} className="rounded-2xl bg-neutral-950 p-4">
                    <div className="mb-2 font-bold">{u.player}</div>
                    <div className="flex justify-between text-neutral-300"><span>2x cards</span><b className="text-lime-300">{u.x2}/2</b></div>
                    <div className="flex justify-between text-neutral-300"><span>-2x all-opponent cards</span><b className="text-red-300">{u.neg2}/1</b></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {competitions.map((comp, idx) => {
            const r = results[comp.id];
            return (
              <Card key={comp.id} className="rounded-3xl border-neutral-800 bg-neutral-900 shadow-xl">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-lime-300">Game {idx + 1}</div>
                      <h3 className="text-2xl font-black">{comp.name}</h3>
                      <p className="text-sm text-neutral-400">{comp.note}</p>
                    </div>
                    <div className="rounded-2xl bg-neutral-950 px-3 py-2 text-sm font-bold text-neutral-300">
                      {comp.points[0]}/{comp.points[1]} pts
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((place) => (
                      <div key={place}>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-neutral-500">
                          #{place + 1} place
                        </label>
                        <select
                          value={r.ranking[place]}
                          onChange={(e) => updateRanking(comp.id, place, e.target.value)}
                          className="w-full rounded-2xl border border-neutral-700 bg-neutral-950 px-3 py-3 outline-none focus:border-lime-400"
                        >
                          <option value="">Select player</option>
                          {players.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-neutral-950 p-4">
                      <div className="mb-3 flex items-center gap-2 font-black text-lime-300"><Plus className="h-4 w-4" /> 2x card used here</div>
                      <div className="flex flex-wrap gap-2">
                        {players.map((p) => (
                          <button key={p} onClick={() => toggleCard(comp.id, "x2", p)} className={`rounded-full px-3 py-2 text-sm font-bold ${r.x2.includes(p) ? "bg-lime-400 text-neutral-950" : "bg-neutral-800 text-neutral-300"}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-neutral-950 p-4">
                      <div className="mb-3 flex items-center gap-2 font-black text-red-300"><Minus className="h-4 w-4" /> -2x all opponents</div>
                      <div className="flex flex-wrap gap-2">
                        {players.map((p) => (
                          <button key={p} onClick={() => toggleCard(comp.id, "neg2", p)} className={`rounded-full px-3 py-2 text-sm font-bold ${r.neg2.includes(p) ? "bg-red-400 text-neutral-950" : "bg-neutral-800 text-neutral-300"}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-3xl bg-neutral-900 p-5 text-sm text-neutral-400">
          <div className="mb-2 flex items-center gap-2 font-bold text-white"><Users className="h-4 w-4" /> Scoring logic</div>
          A selected 2x card doubles that player’s points for that game. A selected -2x card subtracts 2 points from every opponent in that game, but not from the player who used the card. Recommended card limit shown here: each player gets two 2x cards and one -2x card.
        </div>
      </div>
    </div>
  );
}
