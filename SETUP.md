# VerseArena — Setup Guide

## 1. Install dependencies
```bash
npm install
```

## 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

- **DATABASE_URL** — PostgreSQL connection string. Free options: [Neon](https://neon.tech) or [Supabase](https://supabase.com)
- **NEXTAUTH_SECRET** — Run `openssl rand -base64 32` to generate one
- **NEXTAUTH_URL** — `http://localhost:3000` for local dev
- **GOOGLE_CLIENT_ID / SECRET** — Optional. Get from [Google Cloud Console](https://console.cloud.google.com)
- **UPLOADTHING_SECRET / APP_ID** — Get from [uploadthing.com](https://uploadthing.com)

## 3. Set up the database
```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to your DB
```

## 4. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # login, register pages
│   ├── (main)/          # feed, battle, upload, profile (protected)
│   ├── api/             # REST API routes
│   └── layout.tsx       # root layout
├── components/
│   ├── feed/            # PostCard
│   ├── battle/          # BattleRoom
│   └── layout/          # BottomNav
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── db.ts            # Prisma singleton
│   └── utils.ts         # helpers
├── types/               # shared TypeScript types
prisma/
└── schema.prisma        # DB schema
```

## What's Built
- Landing page
- Auth (sign up / login with email+password, Google OAuth)
- TikTok-style feed with video posts, likes, comments count
- Battle lobby (list live/waiting battles)
- Battle room (join, vote, live indicator)
- Upload page
- User profiles with follow/unfollow, battle record, post grid
- Bottom navigation

## What's Next
- [ ] Wire up UploadThing for actual video uploads (`/api/posts/upload`)
- [ ] Socket.io server for real-time battle audio/video
- [ ] Notifications page
- [ ] Battle create form (`/battle/create`)
- [ ] Comments section on individual posts
- [ ] Search / discover page
- [ ] Leaderboard
