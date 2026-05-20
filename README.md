# Aolinpike Games

Mobile-first party scoreboard for a 4-player Aolinpike trip competition. The app runs on Next.js App Router, Tailwind, shadcn-style UI primitives, Vercel hosting, and Supabase for shared realtime state.

## What Is Synced

- Game results and base leaderboard
- Player names, photos, and submission status
- Broadcast updates for score changes, player saves, admin actions, resets, and reveal progress
- Reveal phase, reveal progress, reveal timeline, and adjusted leaderboard
- Secret card choices through PIN-protected server routes

Secret cards are intentionally not exposed through public Supabase policies. Players load and save their own picks from `/player` after a one-to-one player PIN check. Admins can override card picks and PINs from `/booth`. Reveal pages receive card data only after the room reveal state is no longer sealed.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

1. Create a new project at [Supabase](https://supabase.com).
2. Open **SQL Editor**.
3. Run [supabase/schema.sql](/Users/wenxuanl/aolinpike-games/supabase/schema.sql).
4. Confirm these tables exist: `game_rooms`, `players`, `player_pins`, `games`, `results`, `secret_cards`, `reveal_state`, and `system_updates`.
5. In **Database > Replication**, confirm Realtime is enabled for `players`, `results`, `reveal_state`, and `system_updates`.
6. In **Project Settings > API**, copy:
   - Project URL
   - `anon public` key
   - `service_role` key

Default room seed:

- Room slug: `aolinpike-2026`
- Admin PIN: `0000`
- Player PINs: `1111`, `2222`, `3333`, `4444`

Change these in the Admin panel before the real game. Player PINs must stay unique because each PIN unlocks exactly one player profile.

## Environment Variables

Create `.env.local` for local development and add the same values in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe browser values used for Realtime subscriptions. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to the browser; it powers PIN-checked route handlers.

## Deploy To Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com), import the repository.
3. Use the default Next.js settings.
4. Add the three environment variables above in **Project Settings > Environment Variables**.
5. Deploy.
6. Open the production URL and verify:
   - `/` shows the live broadcast feed and rolling score banner.
   - `/games` requires the admin PIN before editing.
   - `/player` unlocks exactly one player profile from the matching player PIN.
   - `/booth` requires the admin PIN for player PIN changes, card overrides, resets, and test data.
   - `/reveal` requires the admin PIN and syncs reveal progress across devices.

## Production Checklist

```bash
npm run lint
npm run build
```

Both commands should pass before deploying. The app is designed for one active shared room today; extending to multiple rooms later should start by adding a room selector and passing room slugs into the API routes.
