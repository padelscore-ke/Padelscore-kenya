PadelScore — Replit Development Guide

This document explains how to run PadelScore smoothly on Replit Builder, what corrections you must apply, and how the setup prepares you for deployment on DigitalOcean.

🚩 Problems Found in Original Repo

Frontend assumed multiple ports (3001, 5000) → Breaks in Replit (Replit exposes only one port).

Separate frontend & backend servers → Replit can’t run both easily.

Prisma missing from backend dependencies.

DB layer mixed (Prisma + raw SQL).

No unified data model for tournaments, matches, players, referees, and leaderboard.

✅ Fixes You Must Apply
1) Use relative API URLs in frontend

In admin/js/*.js, referee/js/*.js, and live/js/*.js replace:

- const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`;
+ const API_BASE = `${window.location.origin}/api`;


For Socket.IO:

const socket = io(); // same origin auto

2) Serve frontend from backend

Edit backend/src/app.js:

const path = require('path');

// Static serving
const frontendRoot = path.join(__dirname, '..', '..');
app.use('/', express.static(path.join(frontendRoot, 'admin')));
app.use('/referee', express.static(path.join(frontendRoot, 'referee')));
app.use('/live', express.static(path.join(frontendRoot, 'live')));

// Default route → Admin dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'admin', 'index.html'));
});


Now Admin, Referee, and Live panels all load from the same backend server.

3) Fix backend dependencies

Edit backend/package.json:

"dependencies": {
  "@prisma/client": "^6.16.2",
  "prisma": "^6.16.2",
  "bcrypt": "^6.0.0",
  "cors": "^2.8.5",
  "dotenv": "^17.2.2",
  "express": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.16.3",
  "socket.io": "^4.8.1"
},
"devDependencies": {
  "nodemon": "^3.1.10"
}


Scripts:

"scripts": {
  "start": "node src/app.js",
  "dev": "nodemon src/app.js",
  "seed": "node src/config/seed.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate deploy",
  "postinstall": "npx prisma generate"
}

4) Database Schema (Prisma)

Example backend/prisma/schema.prisma:

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Player {
  id        Int      @id @default(autoincrement())
  name      String
  teamId    Int?
  team      Team?    @relation(fields: [teamId], references: [id])
  matches   MatchPlayer[]
}

model Team {
  id        Int      @id @default(autoincrement())
  name      String
  players   Player[]
  matches   Match[]
}

model Tournament {
  id        Int      @id @default(autoincrement())
  name      String
  matches   Match[]
}

model Match {
  id          Int        @id @default(autoincrement())
  tournament  Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId Int
  teamAId     Int
  teamBId     Int
  teamA       Team       @relation("TeamA", fields: [teamAId], references: [id])
  teamB       Team       @relation("TeamB", fields: [teamBId], references: [id])
  scoreA      Int        @default(0)
  scoreB      Int        @default(0)
  status      String     @default("scheduled")
  refereeId   Int?
  referee     Referee?   @relation(fields: [refereeId], references: [id])
  players     MatchPlayer[]
}

model Referee {
  id       Int      @id @default(autoincrement())
  name     String
  matches  Match[]
}

model MatchPlayer {
  id       Int     @id @default(autoincrement())
  matchId  Int
  playerId Int
  match    Match   @relation(fields: [matchId], references: [id])
  player   Player  @relation(fields: [playerId], references: [id])
}


This schema handles players, teams, tournaments, referees, matches, and live scoring.

5) Health Check

In backend/src/app.js:

app.get('/health', (req, res) => res.json({ status: 'ok' }));

▶ Running on Replit

Configure .replit at root:

run = "cd backend && npm install && npm start"


Replit auto-exposes $PORT. Backend already supports:

const PORT = process.env.PORT || 3001;


Open Replit Webview → Admin Dashboard should appear at /.

🗄️ Database Setup

Use external PostgreSQL (Replit storage is temporary).

Options: Supabase (free tier), DigitalOcean Managed Postgres, or Railway.

Set Replit secrets (Environment Variables):

DATABASE_URL=postgresql://user:password@host:5432/padelscore
JWT_SECRET=super_secret_key
FRONTEND_URL=https://your-replit-url

Apply Schema & Seed
cd backend
npx prisma migrate dev --name init
npm run seed

✅ Summary

Unified backend → serves Admin, Referee, Live.

Fixed frontend URLs (no hardcoded ports).

Prisma DB schema added (covers full tournament flow).

External Postgres via env vars.

Health endpoint included.

Ready for Replit development and DigitalOcean deployment.