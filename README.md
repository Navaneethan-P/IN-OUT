# IN-OUT: Intelligent Campus Movement Platform

> **Where Every Exit Becomes Accountability.**
> A digital, paperless solution to track student movement (leave/outings) across a college campus, completely replacing physical registers and paper gate passes with a real-time, cryptographic verification system.

##  Project Overview
**IN-OUT** is a campus-deployed intelligence platform built to revolutionize hostel governance. It operates at the intersection of institutional governance, real-time systems engineering, and campus safety infrastructure. 

Wardens see requests the moment they are submitted via a live WebSocket dashboard. Gate security verifies cryptographic QR passes on exit. Parents receive an automated SMS the instant their ward leaves or returns—with zero reliance on external internet for the core database.

##  System Architecture & Technology Stack

### Core Technologies
- **Frontend Layer:** React 18 (Vite), Tailwind CSS, Framer Motion
- **Backend Core:** Node.js, Express.js
- **Database & ORM:** PostgreSQL (Hostel Data), SQLite (Gate Node), Prisma ORM
- **Real-Time Engine:** Socket.IO for event-driven WebSockets
- **Authentication:** JWT (JSON Web Tokens) with strict Role-Based Access Control (RBAC)
- **External Integrations:** Fast2SMS for real-time parent notifications

### Key Architectural Decisions
1. **Intranet First (Zero Cloud Cost):** Designed for campus Wi-Fi. It uses local IP hosting, ensuring 100% uptime regardless of internet cuts and keeping sensitive student data on-campus for maximum privacy.
2. **Monorepo with Shared Types:** Uses npm workspaces to share TypeScript definitions across the client and server, completely eliminating data mismatch bugs.
3. **Dual Database Architecture:** High-concurrency PostgreSQL for the warden/student hub, and a self-contained SQLite database for the gate scanning module to ensure it runs anywhere with zero setup.
4. **WebSocket Push Notifications:** HTTP polling wastes bandwidth; Socket.IO instantly pushes events (like approvals or overdue alerts) without latency.

---

##  System Requirements

- **Operating System:** Windows 10/11 or Linux
- **Node.js:** v18.0 or higher
- **Docker:** Docker Desktop (used for spinning up the PostgreSQL database easily)
- **Network:** Campus Wi-Fi Router (Intranet setup)
- **Optional Hardware:** Standard USB Barcode/QR Scanner for the Security Gate

---

##  Detailed Setup Guide

### Phase 1: Database Setup
The main hostel engine requires PostgreSQL. We use Docker to easily spin this up.

1. Ensure Docker Desktop is running.
2. Navigate to the hostel docker directory:
   ```bash
   cd HOSTEL/docker
   ```
3. Start the database container:
   ```bash
   docker-compose up -d
   ```
4. Verify the database is running on `localhost:5432`.

### Phase 2: Hostel Module Setup (Main Hub)
This module contains the backend API and the primary dashboard for Wardens, Admins, and Students.

1. Navigate to the `HOSTEL` root:
   ```bash
   cd ../  # or cd HOSTEL
   ```
2. Install all dependencies across the monorepo workspace:
   ```bash
   npm install
   ```
3. **Environment Setup:** Ensure you have an `.env` file in `HOSTEL/server` containing your Fast2SMS API key, JWT Secret, and PostgreSQL connection string.
4. **Database Migration:** Push the Prisma schema to the database:
   ```bash
   cd server
   npx prisma db push
   npx prisma db seed  # if you have a seed script
   cd ..
   ```
5. **Start the System:** You can use the provided batch scripts on Windows, or start manually:
   - Run `START_HOSTEL_SYSTEM.bat` OR
   - Run `npm start` from the `HOSTEL` root to boot both client and server concurrently.
   
   *The server runs on port 3001, and the client on port 5173.*

### Phase 3: Gate Module Setup
The gate module is meant for the security booth. It is designed to be lightweight.

1. Open a new terminal and navigate to the `GATE` directory:
   ```bash
   cd GATE
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Gate module using the provided batch file:
   - Run `START_GATE_SYSTEM.bat` OR
   - Run `npm start`
   
   *The Gate API connects seamlessly to the main Hostel API to verify the cryptographic QR passes.*

---

##  Repository Structure

```
IN-OUT/
├── docs/                   # Documentation and Project Reports
│   ├── presentation/       # Final PPTs, AI Background Images, and HTML Slides
│   └── Archive/            # Old project ideas and iterations
├── HOSTEL/                 # Main Monorepo Workspace (PostgreSQL)
│   ├── client/             # React 18 Frontend Dashboard
│   ├── server/             # Express.js API & Socket.IO
│   ├── shared/             # Shared Types & Zod Schemas
│   └── docker/             # Docker configuration for Postgres
├── GATE/                   # Lightweight Gate Scanner Node (SQLite)
│   ├── client/             # Gate Security UI
│   └── server/             # Gate API
├── README.md               # You are here
└── package-lock.json
```

---

##  Security Posture
- **API-Level Guards:** Every API endpoint validates the incoming JWT against Zod schemas. 
- **Expiring Cryptographic QRs:** Passes generated for students are cryptographically tied to a specific approved leave and expire automatically.
- **LAN Snooping Prevention:** WebSockets are authenticated using the same JWT layer, closing standard LAN vulnerabilities.

##  The Intelligence Collective: Team Nova
- **Navaneethan P** (Team Lead) - Full Stack Architecture, Backend & DB Design
- **Kaviya A** - Frontend Interface, React & Warden Dashboard
- **Elakkiya G** - Database Schema, Security & Role Guards
- **Yogasri R** - Gate Module & QR Engine, SMS Notification Layer
