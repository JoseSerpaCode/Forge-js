# Forge JS - Enterprise Multi-Tenant OS

**Forge JS (Omnibus Uncut Edition)** is a robust, isolated, multi-tenant workspace operating system. Built completely on a custom Vanilla JS frontend over Astro and a highly optimized NodeJS/Express + SQLite backend.

## 🚀 Core Architecture

- **Multi-Tenant Data Isolation**: True data isolation using pivot tables and workspace-level RBAC (Role-Based Access Control). Users can only interact with Workspaces they are explicitly invited to (Owner, Editor, Commenter, Viewer).
- **Custom Node.js Server**: Avoids heavy frameworks in favor of a customized Express/Astro SSR middleware stack with natively attached `socket.io` for real-time WebSockets.
- **SQLite Engine**: Zero latency local Database logic managed securely via `better-sqlite3`.
- **Zapier-style Automations**: Internal `EventEmitter` engine that observes database mutations (like Kanban status changes) to trigger server-side Webhook actions.
- **Premium Orion Neon UI**: An extreme high-contrast dark mode tailored for developers (`bg-[#050505]`) with neon green accents (`#bfff00`) built natively in Tailwind CSS.

## 📦 Features

- **Personal Hub**: Aggregated cross-workspace view showing assigned tasks and unread notifications.
- **Advanced Issue Tracker**: Jira-style Kanban boards with native Drag & Drop, optimistic UI rendering, and precise Time Logging.
- **Knowledge Base (Docs)**: Notion-style block editor schemas optimized for internal Workspace documentation.
- **Global Search**: Keyboard-first design. Press `/` to trigger a universal search across the system's database.

## 🛠️ Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Seed the Multi-Tenant SQLite Database:
   ```bash
   npx tsx src/lib/seed.ts
   ```

3. Build and run the optimized Node server:
   ```bash
   npm run build
   node server.mjs
   ```

4. Go to `http://localhost:4321` and login with the `sysadmin` credentials.

## 🛡️ Security

- **Strict Access Guard Middleware**: All APIs natively validate the bearer token against the workspace pivot table. Viewer roles are strictly blocked from mutating states.
- **System Admin**: Only the global `sysadmin` role has the privileges to invoke the Janus LLM indexing APIs.

## 📝 Testing

Comprehensive UI Integrity and Backend Security E2E testing powered by Playwright:
```bash
npx playwright test
```

---
*Developed autonomously from the Master Document V12.0*
