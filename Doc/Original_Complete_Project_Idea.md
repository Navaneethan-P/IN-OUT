# IN-OUT Project Idea & Architecture Overview

## 1. Original User Prompt / Idea
> "For this IN-OUT Project on gate and hostel, i need to submit my project idea as doc, along with idea, plan, implementation, steps, requirements, guide, tools, used lang, how we did, what we did, what we used, like a professional project submission, give a detailed content of this and with missing details also, if it had multiple ways, mention as optional and reason why u choose it, like local server over internet, like that, improve or correct my prompt, and enhance, based on your recommendation and suggestion, on the project."

## 2. Enhanced Project Concept
**Project Name:** IN-OUT: Hostel & Gate Management System
**Core Concept:** A digital, paperless solution to track student movement (leave/outings) across a college campus, completely replacing physical registers and paper gate passes.

### Key Enhancements over the Base Idea:
- **Real-Time Notifications:** Integrated real SMS via Fast2SMS (over just console logging) to alert parents and wardens instantly.
- **Offline/Intranet First:** Designed specifically for campus Wi-Fi. It uses a local IP to serve the web application and backend. This avoids cloud-hosting costs, ensures data privacy, and removes dependency on an active internet connection.
- **Role-Based Architecture:** Separated roles securely using JWTs into Admin, Warden, Security (Gate), and Student.
- **Automated Alerting:** An overdue detection engine that automatically warns the warden if a student misses their return deadline.

## 3. Technology Stack & Implementation Choices

### A. Why Local Intranet over Cloud?
**Options Considered:** Cloud Deployment (AWS/Vercel) vs. Local Intranet  
**Choice:** Local Intranet  
**Reasoning:** College hostels inherently have local Wi-Fi networks that all students and staff connect to. Hosting it locally ensures 100% uptime regardless of internet cuts, keeps sensitive student tracking data on-campus for privacy compliance, and operates with zero monthly server costs.

### B. Why Monorepo with Shared Types?
**Options Considered:** Separate Repositories vs. npm Workspaces (Monorepo)  
**Choice:** Monorepo using npm Workspaces  
**Reasoning:** Both the client and server need to agree on what a "Student" or a "Leave Request" looks like. The `@hostel/shared` package prevents bugs by enforcing strict typing across the entire system.

### C. Why PostgreSQL for Hostel and SQLite for Gate?
**Options Considered:** Single Database vs. Split Database Architectures  
**Choice:** PostgreSQL for the main Hostel engine, SQLite for the Gate scanner.  
**Reasoning:** The Hostel engine expects high concurrency (many students checking status or wardens approving simultaneously), making PostgreSQL necessary. The Gate module is a standalone, single-operator scanner; SQLite allows it to run entirely self-contained without complex setup at the security booth.

### D. Real-Time Updates
**Options Considered:** HTTP Polling vs. WebSockets (Socket.IO)  
**Choice:** Socket.IO  
**Reasoning:** Polling the server every 5 seconds wastes massive amounts of bandwidth and battery. Socket.IO maintains an open connection, instantly pushing an event to the Warden's dashboard the exact second a student submits a request.

## 4. System Requirements
- **Hardware:** 1 standard PC/Laptop for the backend server, 1 barcode scanner (optional, for gate).
- **Network:** Campus Wi-Fi router.
- **Software:** Node.js (v18+), Docker Desktop (for running PostgreSQL easily), Windows/Linux OS.

## 5. Development Steps & Execution
1. **Database Schema Design:** Mapped out 10 core tables (users, students, rooms, requests, logs, etc.) in Prisma.
2. **Backend Construction:** Built the Express.js API, secured it with JWT and Role Guards, and connected the Fast2SMS API.
3. **Real-time Engine:** Implemented Socket.IO to broadcast live events (like "Request Approved") across the network.
4. **Frontend UI:** Developed the React/Vite web application using Tailwind CSS for a responsive, mobile-first design (since students will use their phones).
5. **Security Hardening:** Added rate limiters, Helmet.js for headers, and stripped out all mock code to make it production-ready.
