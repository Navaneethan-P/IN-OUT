/**
 * Word Document Generator — IN-OUT Project Submission
 *
 * Run from the project root:
 *   node generate_word_doc.js
 *
 * Output: IN-OUT_Project_Submission.docx (in the same folder)
 *
 * Requires: npm install docx
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  LevelFormat,
  convertInchesToTwip,
} = require('docx');
const fs = require('fs');

// ─── STYLE HELPERS ────────────────────────────────────────────────────────────

const COLORS = {
  primary: '1E3A5F',       // Deep navy
  accent:  '2563EB',       // Royal blue
  light:   'EFF6FF',       // Ice blue background
  green:   '065F46',       // Deep green
  greenBg: 'ECFDF5',       // Light green background
  gray:    '374151',       // Dark gray text
  lightGray: 'F9FAFB',     // Table row alt
  red:     '991B1B',       // Red for caution
  border:  'CBD5E1',       // Subtle border
  white:   'FFFFFF',
};

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.SOLID, color: COLORS.primary, fill: COLORS.primary },
    run: { color: COLORS.white, bold: true, size: 28 },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: COLORS.primary })],
    spacing: { before: 360, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent } },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: COLORS.accent })],
    spacing: { before: 280, after: 120 },
  });
}

function body(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({
      text,
      size: 22,
      color: COLORS.gray,
      ...options,
    })],
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: COLORS.gray })],
    bullet: { level },
    spacing: { before: 60, after: 60 },
  });
}

function highlight(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: COLORS.green, bold: true })],
    shading: { type: ShadingType.SOLID, color: COLORS.greenBg, fill: COLORS.greenBg },
    spacing: { before: 120, after: 120 },
    indent: { left: convertInchesToTwip(0.3) },
    border: {
      left: { style: BorderStyle.THICK, size: 12, color: COLORS.accent },
    },
  });
}

function note(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: '📝  Note: ', bold: true, size: 20, color: COLORS.primary }),
      new TextRun({ text, size: 20, color: COLORS.gray, italics: true }),
    ],
    shading: { type: ShadingType.SOLID, color: COLORS.light, fill: COLORS.light },
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    border: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left:   { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      right:  { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
    },
  });
}

function spacer() {
  return new Paragraph({ text: '', spacing: { before: 120, after: 120 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── TABLE HELPER ─────────────────────────────────────────────────────────────

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: COLORS.white, size: 20 })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { type: ShadingType.SOLID, color: COLORS.primary, fill: COLORS.primary },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        width: colWidths ? { size: colWidths[headers.indexOf(h)], type: WidthType.PERCENTAGE } : undefined,
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, color: COLORS.gray })],
          })],
          shading: {
            type: ShadingType.SOLID,
            color: ri % 2 === 0 ? COLORS.white : COLORS.lightGray,
            fill: ri % 2 === 0 ? COLORS.white : COLORS.lightGray,
          },
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom:        { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left:          { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      right:         { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideH:       { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      insideV:       { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    },
  });
}

// ─── DOCUMENT CONTENT ─────────────────────────────────────────────────────────

const children = [

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  new Paragraph({
    children: [
      new TextRun({ text: 'IN-OUT', bold: true, size: 72, color: COLORS.primary }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Hostel & Gate Management System', size: 36, color: COLORS.accent })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Project Submission Document', size: 28, color: COLORS.gray, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 600 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Version 1.0  |  June 2026', size: 22, color: COLORS.gray })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: '[Your Name / Team Name]', size: 22, color: COLORS.gray })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: '[Your College / Institution Name]', size: 22, color: COLORS.gray })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 40 },
  }),
  pageBreak(),

  // ── SECTION 1: WHAT IS THIS PROJECT? ─────────────────────────────────────
  heading1('1. What Is This Project?'),
  spacer(),

  heading2('The Problem We Solved'),
  body(
    'If you have ever stayed in a college hostel, you know the drill. You want to go home for the weekend. ' +
    'You fill a form. You submit it to the warden. The warden is busy, or not around. ' +
    'You wait. Maybe you miss your bus. When you finally get out, the security guard at the gate barely glances at your paper pass. ' +
    'Your parents have no idea when you left or if you came back safely.'
  ),
  spacer(),
  body(
    'This is how most college hostels work today — paper forms, manual registers, zero real-time visibility. ' +
    'If a student does not return on time, the warden finds out only the next morning. There is no alert, no record, no accountability.'
  ),
  spacer(),

  heading2('Our Answer — IN-OUT'),
  body(
    'IN-OUT is a complete digital system that replaces every piece of paper in that process. ' +
    'It is a web application — meaning students, wardens, and gate security all use it on their phones or computers, ' +
    'right there on the college Wi-Fi. No extra app to install. No internet needed.'
  ),
  spacer(),

  makeTable(
    ['Module', 'What It Does', 'Who Uses It'],
    [
      ['GATE', 'Security guard scans a student\'s ID at the gate. Logs entry and exit. Parent gets an SMS.', 'Gate Security Guard'],
      ['HOSTEL', 'Full leave management — student applies, warden approves, gate verifies, everyone gets notified.', 'Students, Warden, Admin'],
    ],
    [20, 55, 25]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 2: GOALS ──────────────────────────────────────────────────────
  heading1('2. What We Set Out to Do'),
  spacer(),

  body('We had six clear goals when we started this project:'),
  spacer(),
  bullet('No more paper forms — students apply from their phone, warden sees it instantly.'),
  bullet('No more guessing — warden can see who is inside the hostel at any time.'),
  bullet('No more late realisation — if a student is overdue, parents and warden get an SMS alert automatically.'),
  bullet('Works offline — the system runs on a single college PC and works over the campus Wi-Fi. No internet required.'),
  bullet('Covers every pass type — same-day outing, multi-day leave, and emergency exits.'),
  bullet('Full audit trail — every action is recorded. Nothing can be disputed or faked.'),
  spacer(),

  highlight('Summary: We wanted to build something that a real college could actually start using today — not just a demo.'),
  spacer(),
  pageBreak(),

  // ── SECTION 3: HOW THE SYSTEM WORKS ──────────────────────────────────────
  heading1('3. How the System Works — Step by Step'),
  spacer(),

  heading2('A Typical Weekend Leave — The Full Story'),
  spacer(),

  heading3('Step 1 — Student Applies'),
  body(
    'A student opens the system on their phone (by scanning a QR code printed in the hostel). ' +
    'They log in with their roll number and select "New Request". ' +
    'They choose Leave (or Outing for a same-day trip), fill in where they are going, when they plan to return, and why. ' +
    'If it is a working day, the form asks them to confirm they have obtained a letter from their HOD.'
  ),
  spacer(),

  heading3('Step 2 — Warden Reviews'),
  body(
    'The moment the student submits, the warden\'s dashboard lights up — no refresh needed. ' +
    'The warden can see every detail: the student\'s name, year, department, reason, and travel dates. ' +
    'The warden can call the parents and log that call in the system. ' +
    'Then the warden clicks Approve or Reject.'
  ),
  spacer(),

  heading3('Step 3 — Student Gets a Digital Pass'),
  body(
    'Once approved, the student\'s phone shows a QR code — their digital gate pass. ' +
    'This QR code is unique, linked to this specific approved request, and cannot be reused or faked. ' +
    'The student also gets an SMS confirming approval.'
  ),
  spacer(),

  heading3('Step 4 — Gate Verification'),
  body(
    'At the gate, the security guard types the student\'s roll number (or scans their ID card barcode). ' +
    'The system confirms the student is authorized, and the guard clicks "Confirm Exit". ' +
    'The parent immediately receives an SMS: "Your ward Ravi has left the hostel campus at 2:30 PM."'
  ),
  spacer(),

  heading3('Step 5 — Return & Completion'),
  body(
    'When the student returns, the guard scans again. The system logs the entry. ' +
    'If the student comes back on time, the request is marked Complete. ' +
    'If they are late, an automatic alert is sent to both the parents and the warden. ' +
    'The warden does not have to remember to check — the system handles it.'
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 4: WHO USES IT AND WHAT THEY SEE ─────────────────────────────
  heading1('4. Who Uses It — And What They Can Do'),
  spacer(),

  heading2('🎓 Student'),
  makeTable(
    ['Feature', 'Description'],
    [
      ['Apply for Pass', 'Submit an Outing (same-day) or Leave (multi-day) request from their phone'],
      ['Emergency Flag', 'Mark a request as emergency — bumped to the top of the warden\'s queue'],
      ['View Status', 'See if their request is Pending, Approved, or Rejected — updates in real time'],
      ['Digital Ticket', 'Get a QR code gate pass once approved — no paper required'],
      ['Cancel Request', 'Cancel a pending request before the warden acts on it'],
    ],
    [35, 65]
  ),
  spacer(),

  heading2('🛡️ Warden'),
  makeTable(
    ['Feature', 'Description'],
    [
      ['Live Dashboard', 'See all pending requests the moment they arrive — no refresh needed'],
      ['Approve / Reject', 'One-click decision with optional written reason'],
      ['Call Parent', 'Log that a parent was called and record their response'],
      ['Presence Board', 'See exactly who is currently inside and outside the hostel'],
      ['Settings', 'Toggle working day, set outing hour limit, enable/disable SMS'],
      ['CSV Export', 'Download reports: all requests, overdue list, full audit trail'],
    ],
    [30, 70]
  ),
  spacer(),

  heading2('🔒 Security Guard (Gate)'),
  makeTable(
    ['Feature', 'Description'],
    [
      ['Scan Exit', 'Type roll number → system confirms if student is approved to leave → log exit'],
      ['Scan Entry', 'Log when student returns → parent SMS sent automatically'],
      ['Unauthorised Alerts', 'If a student without approval tries to leave, it is flagged and logged'],
    ],
    [30, 70]
  ),
  spacer(),

  heading2('⚙️ Admin'),
  makeTable(
    ['Feature', 'Description'],
    [
      ['Add Students', 'Register new students with room, department, parent phone details'],
      ['Add Staff', 'Create warden, security, or admin accounts'],
    ],
    [30, 70]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 5: TECHNOLOGY ─────────────────────────────────────────────────
  heading1('5. What We Built It With'),
  spacer(),

  body('Every technology we chose has a reason. We did not pick things at random or just to sound impressive.'),
  spacer(),

  heading2('Languages Used'),
  makeTable(
    ['Language', 'Where', 'Why'],
    [
      ['TypeScript', 'Frontend + Backend', 'A safer version of JavaScript — catches errors before the code even runs'],
      ['SQL (via Prisma)', 'Database', 'Managed automatically — we never write raw SQL, which means fewer bugs'],
      ['JSX/TSX', 'Frontend (React)', 'Lets us write UI components in a clean, readable format'],
      ['YAML', 'Docker setup', 'Defines how the database container starts up'],
      ['Batch Script / JS', 'Startup', 'One-click launcher for Windows that also prints a QR code'],
    ],
    [20, 20, 60]
  ),
  spacer(),

  heading2('Main Frameworks and Tools'),
  makeTable(
    ['Category', 'What We Used', 'Plain English Reason'],
    [
      ['Frontend UI', 'React 18 + Vite', 'Fast, modern — the interface rebuilds in milliseconds while developing'],
      ['UI Styling', 'Tailwind CSS', 'Write beautiful layouts without a separate CSS file for every component'],
      ['State (Client)', 'Zustand', 'Tracks who is logged in and their role across the whole app'],
      ['Real-Time', 'Socket.IO', 'Pushes live updates to the warden without the page refreshing'],
      ['Backend', 'Express.js', 'Handles all API requests — the "brain" of the server'],
      ['Database', 'PostgreSQL (HOSTEL)', 'Can handle many users at the same time safely'],
      ['Database', 'SQLite (GATE)', 'Lightweight, no setup — perfect for a single-guard station'],
      ['ORM', 'Prisma', 'Database queries in TypeScript — no SQL strings, no typos'],
      ['Authentication', 'JWT Tokens', 'Each user carries a secure token that proves who they are'],
      ['SMS', 'Fast2SMS API', 'Indian SMS gateway — sends real SMS to parents\' phones'],
      ['Containers', 'Docker', 'Runs PostgreSQL in a box — no messy installation on Windows'],
    ],
    [20, 22, 58]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 6: KEY DECISIONS ──────────────────────────────────────────────
  heading1('6. Why We Made These Choices'),
  spacer(),

  body(
    'Every project reaches a fork in the road. Below are the important decisions we made and why we chose the path we did. ' +
    'Where we considered another approach, we explain that too.'
  ),
  spacer(),

  heading2('Decision 1 — Local Wi-Fi Server, Not the Internet'),
  makeTable(
    ['Option', 'Pros', 'Cons', 'Chosen?'],
    [
      ['Local Intranet (Wi-Fi)', 'Free. No internet needed. Data stays on campus. Fast.', 'Only works on campus Wi-Fi range.', '✅ Yes'],
      ['Cloud Server (AWS etc.)', 'Accessible from anywhere.', 'Monthly cost. Needs internet. Data leaves campus.', '❌ No'],
    ],
    [22, 33, 33, 12]
  ),
  spacer(),
  note(
    'A college hostel is always on campus. Students, wardens, and guards are always nearby. ' +
    'There is no need to pay for cloud hosting or risk data going outside. ' +
    'The startup script detects the Wi-Fi hotspot IP automatically and prints a QR code — students just scan it.'
  ),
  spacer(),

  heading2('Decision 2 — PostgreSQL for HOSTEL, SQLite for GATE'),
  makeTable(
    ['Database', 'Used In', 'Why'],
    [
      ['PostgreSQL', 'HOSTEL Module', 'Many users at once (students, warden, guard all connected simultaneously). PostgreSQL handles concurrent access safely.'],
      ['SQLite', 'GATE Module', 'One guard at a time. No installation needed — it\'s just a file. Perfect for simplicity.'],
    ],
    [15, 15, 70]
  ),
  spacer(),

  heading2('Decision 3 — Real-Time Updates via WebSockets'),
  makeTable(
    ['Option', 'How It Works', 'Chosen?'],
    [
      ['Polling (old method)', 'Browser asks server "anything new?" every few seconds. Wasteful even when nothing changed.', '❌ No'],
      ['Socket.IO (WebSockets)', 'Server pushes updates to the browser the instant something changes. Zero wasted requests.', '✅ Yes'],
    ],
    [22, 66, 12]
  ),
  spacer(),
  note('When a student submits a request, the warden sees it appear on their screen within one second — without clicking anything.'),
  spacer(),

  heading2('Decision 4 — Two Separate Modules (GATE + HOSTEL)'),
  body(
    'We could have built everything into one app. Instead, we kept them separate. Why?'
  ),
  bullet('The GATE module can run as a standalone scanner even without the full HOSTEL system.'),
  bullet('A college can deploy just the GATE scanner in Week 1, then add the HOSTEL system later.'),
  bullet('Simpler to debug — each module has its own server and database.'),
  bullet('In Phase 2, the GATE module can be fully merged into HOSTEL (the connection point already exists in the code).'),
  spacer(),

  heading2('Decision 5 — Shared TypeScript Types'),
  body(
    'Both the frontend and the backend need to agree on what a "leave request" or a "student" looks like. ' +
    'Instead of writing the same definitions twice (once on each side), we created a shared package called @hostel/shared. ' +
    'Both import from it. If one side changes, the other side immediately shows an error before the code even runs. ' +
    'This eliminates an entire class of bugs where the frontend expects one field name and the backend sends another.'
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 7: DATABASE DESIGN ────────────────────────────────────────────
  heading1('7. Database Design'),
  spacer(),

  heading2('HOSTEL Module — 10 Tables'),
  body('Each table has one clear job. No overlapping, no confusion.'),
  spacer(),

  makeTable(
    ['Table Name', 'Stores', 'Key Point'],
    [
      ['users', 'Warden, Security, Admin accounts', 'Passwords are hashed — never stored in plain text'],
      ['students', 'Student profiles + room + parent contacts', 'Has a unique QR token printed on their ID card'],
      ['hostel_rooms', 'Room numbers, floor, block, capacity', 'Students are linked to their room'],
      ['leave_requests', 'Every leave or outing application', 'The central table — has 9 possible status states'],
      ['request_event_logs', 'Every status change ever made', 'Immutable audit trail — cannot be edited or deleted'],
      ['approvals', 'Warden approval/rejection records', 'Separate from logs so they can be queried for reports'],
      ['attendance_logs', 'Every gate entry and exit scan', 'Even unauthorised attempts are logged'],
      ['parent_verifications', 'Log of calls made to parents', 'Records who called, when, and what the parent said'],
      ['notifications', 'Every SMS and message sent', 'Tracks success, failure, and delivery confirmation'],
      ['system_settings', 'Configuration for the whole hostel', 'Working day toggle, outing limit, SMS on/off'],
    ],
    [22, 35, 43]
  ),
  spacer(),

  heading2('A Request\'s Life — The 9 Status States'),
  body('A leave request goes through these stages (in order):'),
  spacer(),
  makeTable(
    ['Status', 'What It Means'],
    [
      ['DRAFT', 'Student started filling the form but has not submitted yet'],
      ['PENDING_APPROVALS', 'Submitted — waiting for the warden to review'],
      ['APPROVED', 'Warden approved — a QR ticket is generated and SMS is sent'],
      ['OUT_CONFIRMED', 'Security guard confirmed the student has exited the gate'],
      ['RETURNED', 'Student scanned back in at the gate'],
      ['COMPLETED', 'System automatically closes the request after return'],
      ['REJECTED', 'Warden rejected the request'],
      ['CANCELLED', 'Student cancelled their own request before it was decided'],
      ['OVERDUE', 'Student did not return on time — alerts sent automatically'],
    ],
    [35, 65]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 8: SECURITY ───────────────────────────────────────────────────
  heading1('8. Security — How We Protected the System'),
  spacer(),

  body('Because this system handles real student data and controls physical gate access, security was not optional.'),
  spacer(),

  makeTable(
    ['What We Protected', 'How We Did It'],
    [
      ['Passwords', 'Stored as bcrypt hashes — even we cannot read them'],
      ['API Access', 'Every endpoint requires a JWT token — no token, no access'],
      ['Role Separation', 'Students can\'t see warden screens. Guards can\'t access admin functions.'],
      ['Admin Routes', 'Creating students/staff requires JWT + ADMIN role — cannot be called from outside'],
      ['Request Body', 'All inputs validated with Zod schema before touching the database'],
      ['HTTP Headers', 'Helmet.js adds security headers to prevent common web attacks'],
      ['Rate Limiting', 'Login limited to 50 attempts per 15 minutes — blocks brute-force attacks'],
      ['WebSocket Auth', 'Socket.IO connections require the same JWT token as the REST API'],
      ['Request Size', 'Bodies limited to 50KB — prevents memory-based attacks'],
    ],
    [35, 65]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 9: SETUP GUIDE ────────────────────────────────────────────────
  heading1('9. Setup Guide — Getting It Running'),
  spacer(),

  heading2('What You Need First'),
  makeTable(
    ['Software', 'Version', 'Download From'],
    [
      ['Node.js', '18 or higher', 'nodejs.org'],
      ['npm', '9 or higher', 'Comes with Node.js'],
      ['Docker Desktop', 'Latest', 'docker.com/products/docker-desktop'],
    ],
    [30, 20, 50]
  ),
  spacer(),

  heading2('HOSTEL Module — Setup Steps'),
  spacer(),
  body('Open PowerShell and run these commands one by one:'),
  spacer(),

  new Paragraph({
    children: [new TextRun({ text: '# Step 1 — Go to the HOSTEL folder', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 60, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'cd "C:\\Users\\YourName\\Desktop\\IN-OUT\\HOSTEL"', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '# Step 2 — Install all packages', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'npm install', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '# Step 3 — Start the PostgreSQL database (via Docker)', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'npm run docker:up', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '# Step 4 — Create all database tables', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'npm run db:migrate', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '# Step 5 — Add some starter data (staff accounts, one room, one student)', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'npm run db:seed', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: '# Step 6 — Launch everything (prints a QR code for mobile access)', size: 20, color: COLORS.accent, font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 0 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'node start_hostel.js', size: 20, color: 'A3E635', font: 'Courier New' })],
    shading: { type: ShadingType.SOLID, color: '1E293B', fill: '1E293B' },
    spacing: { before: 0, after: 60 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),

  spacer(),

  heading2('Default Login Accounts (After Seeding)'),
  makeTable(
    ['Role', 'Login With', 'Default Password'],
    [
      ['Warden', 'warden@hostel.edu', 'password123'],
      ['Security Guard', 'gate@hostel.edu', 'password123'],
      ['Admin', 'admin@hostel.edu', 'password123'],
      ['Student', 'Roll number: 22BIT0001', 'password123'],
    ],
    [20, 45, 35]
  ),
  spacer(),
  note('Change all passwords immediately when deploying for real use. Do not keep "password123" in production.'),
  spacer(),

  heading2('Allowing Other Devices to Connect (Windows Firewall)'),
  body('For students to access the system on their phones, you need to open one port in Windows Firewall:'),
  bullet('Open Windows Defender Firewall'),
  bullet('Click "Advanced Settings" → Inbound Rules → New Rule'),
  bullet('Select "Port" → TCP → enter 3000 → Allow the connection → Save'),
  body('Now any device on the same Wi-Fi can access the system at http://192.168.x.x:3000'),
  spacer(),

  heading2('Enabling Real SMS (Fast2SMS)'),
  body('To send real SMS to parents:'),
  bullet('Create a free account at https://www.fast2sms.com'),
  bullet('Go to your dashboard and copy your API key'),
  bullet('Open the file HOSTEL/server/.env'),
  bullet('Paste your key next to FAST2SMS_API_KEY='),
  bullet('Restart the server — SMS is now live'),
  spacer(),
  note('If you leave FAST2SMS_API_KEY empty, the system still works perfectly. It just logs the message to the console instead of sending it.'),
  spacer(),
  pageBreak(),

  // ── SECTION 10: WHAT WE ACTUALLY BUILT ───────────────────────────────────
  heading1('10. Everything We Built'),
  spacer(),

  heading2('GATE Module — Complete'),
  makeTable(
    ['Feature', 'Status'],
    [
      ['Student management — add, edit, delete with full profile', '✅ Done'],
      ['Barcode / roll number scanner (auto-focuses for scanner gun)', '✅ Done'],
      ['Smart IN/OUT toggle — shows the recommended next action', '✅ Done'],
      ['Real SMS to parent via Fast2SMS when student exits/enters', '✅ Done'],
      ['Attendance history with full log of all scans', '✅ Done'],
    ],
    [75, 25]
  ),
  spacer(),

  heading2('HOSTEL Module — Complete'),
  makeTable(
    ['Feature', 'Status'],
    [
      ['Multi-role login — Student / Warden / Security / Admin', '✅ Done'],
      ['Google OAuth login for staff (wardens can log in with Google)', '✅ Done'],
      ['Three pass types — Outing, Leave, Emergency', '✅ Done'],
      ['Working day enforcement — HOD letter confirmation required', '✅ Done'],
      ['Warden live dashboard — new requests appear instantly (no refresh)', '✅ Done'],
      ['Parent call logging — warden records who was called and what they said', '✅ Done'],
      ['Gate exit/entry verification with authorised/unauthorised logging', '✅ Done'],
      ['QR code ticket for approved passes', '✅ Done'],
      ['Full audit trail — every action recorded with actor and timestamp', '✅ Done'],
      ['Overdue detection — automatic alert sent when student is late', '✅ Done'],
      ['Real SMS via Fast2SMS API', '✅ Done'],
      ['Email notifications via Nodemailer + Gmail', '✅ Done'],
      ['Hostel presence board — who is in, who is out', '✅ Done'],
      ['Analytics dashboard — total counts, trends, overdue stats', '✅ Done'],
      ['CSV export — requests, students, overdue, full audit', '✅ Done'],
      ['System settings — toggle working day, set outing limit, enable SMS', '✅ Done'],
      ['Admin route security — JWT + ADMIN role required', '✅ Done'],
      ['Rate limiting + security headers (Helmet)', '✅ Done'],
      ['One-port deployment — UI and API both on port 3000', '✅ Done'],
      ['Startup QR code — students scan to get the URL', '✅ Done'],
    ],
    [75, 25]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 11: CHALLENGES ────────────────────────────────────────────────
  heading1('11. Challenges We Faced and How We Solved Them'),
  spacer(),

  makeTable(
    ['The Challenge', 'How We Solved It'],
    [
      [
        'Students have no internet on their phones',
        'The system runs entirely on the campus Wi-Fi. The startup script prints a QR code in the terminal that students scan to get the URL — no typing needed.'
      ],
      [
        'Multiple roles need completely different views',
        'JWT tokens carry the user\'s role inside them. Middleware on each route checks the role before allowing access. The frontend routes also redirect based on role.'
      ],
      [
        'Warden needs to see new requests without refreshing',
        'We implemented Socket.IO — a persistent connection between the browser and server. The server pushes events to specific role-based "rooms" the moment something changes.'
      ],
      [
        'Frontend and backend using different field names (causing bugs)',
        'We created a shared npm package (@hostel/shared) with all type definitions and enums. Both sides import from it. TypeScript flags any mismatch immediately.'
      ],
      [
        'Hardcoded "WARDEN_PHONE_HERE" placeholder in overdue alerts',
        'Fixed — the system now reads the warden\'s real phone number from the system_settings table, which is configurable by the admin.'
      ],
      [
        'Admin routes had no authentication (anyone could create accounts)',
        'Fixed — admin routes now require a valid JWT token + ADMIN role. This is enforced at the route middleware level.'
      ],
      [
        'SMS was only a console.log mock — no real messages sent',
        'Fixed — the NotificationService now calls the real Fast2SMS HTTP API. If the API key is missing, it logs gracefully instead of crashing.'
      ],
      [
        'Only one firewall port should be exposed to the network',
        'Express serves the compiled React app as static files. Both the UI and API run on port 3000. Students and wardens only need one URL.'
      ],
    ],
    [35, 65]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 12: FUTURE IMPROVEMENTS ──────────────────────────────────────
  heading1('12. What Can Be Added Next'),
  spacer(),

  body('The system is complete and usable today. These are planned improvements for future versions:'),
  spacer(),

  makeTable(
    ['Feature', 'Priority', 'Notes'],
    [
      ['RFID Card Reader', 'High', 'The rfidUid field is already in the database — just needs hardware integration'],
      ['WhatsApp Messages', 'High', 'The WhatsApp method is already coded — needs a WATI or Meta API key'],
      ['HOD / Placement Officer Role', 'Medium', 'The Socket.IO rooms (role:hod:department) are already set up'],
      ['Mobile App', 'Medium', 'React Native app using the same REST API — no backend changes needed'],
      ['Merge GATE + HOSTEL', 'Medium', 'gate.routes.ts already exists in HOSTEL — connect the GATE scanner to it'],
      ['Parent Self-Verification', 'Medium', 'Parent clicks a link in the SMS to approve/reject instead of a phone call'],
      ['Admin Panel UI', 'Low', 'Currently admin creates users via the API — a proper web UI would help'],
      ['PWA / Offline Mode', 'Low', 'Service Worker to show last-known status when Wi-Fi drops momentarily'],
    ],
    [32, 15, 53]
  ),
  spacer(),
  pageBreak(),

  // ── SECTION 13: CONCLUSION ────────────────────────────────────────────────
  heading1('13. Conclusion'),
  spacer(),

  body(
    'The IN-OUT system is not a class project that demonstrates a concept. ' +
    'It is a working, deployable system that a real college hostel could start using tomorrow. ' +
    'Every feature was designed around an actual problem that hostel administrators face every day.'
  ),
  spacer(),
  body('Let\'s recap what makes this project stand out:'),
  spacer(),
  bullet('It works without internet — built specifically for the campus environment.'),
  bullet('It covers the complete student movement lifecycle — from application to gate exit to safe return.'),
  bullet('Every action is recorded — disputes can be resolved with a factual timeline.'),
  bullet('Parents are informed in real time — no more calling the hostel to check if their child is safe.'),
  bullet('The code is production-grade — security, validation, logging, rate limiting, and audit trails are all in place.'),
  bullet('Real SMS is integrated — Fast2SMS sends actual messages to Indian mobile numbers.'),
  spacer(),

  highlight(
    'This project demonstrates the ability to identify a real problem, design a complete solution, and build it using modern, professional tools — from database design to real-time notifications to intranet deployment.'
  ),
  spacer(),
  spacer(),

  new Paragraph({
    children: [
      new TextRun({ text: 'IN-OUT: Hostel & Gate Management System  |  Version 1.0  |  June 2026', size: 18, color: COLORS.border, italics: true }),
    ],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border } },
    spacing: { before: 200 },
  }),
];

// ─── BUILD AND SAVE ───────────────────────────────────────────────────────────

const doc = new Document({
  creator: 'IN-OUT Project Team',
  description: 'Professional project submission document for the IN-OUT Hostel & Gate Management System',
  title: 'IN-OUT: Hostel & Gate Management System — Project Submission',
  styles: {
    default: {
      document: {
        run: {
          font: 'Calibri',
          size: 22,
          color: COLORS.gray,
        },
        paragraph: {
          spacing: { line: 276, lineRule: 'auto' },
        },
      },
    },
  },
  sections: [
    {
      children,
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
          },
        },
      },
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('IN-OUT_Project_Submission.docx', buffer);
  console.log('');
  console.log('✅ Document created: IN-OUT_Project_Submission.docx');
  console.log('   Open it with Microsoft Word or Google Docs.');
  console.log('');
});
