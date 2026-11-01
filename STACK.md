# STACK.md — Enterprise Cake Platform, 3D Customizer & Financial Audit System

## 1. Architecture Overview

- **Architecture Pattern:** Feature-Sliced Modular Monolith (Isolated Storefront & Enterprise Admin Route Groups)
- **Deployment & Edge Compute:** Vercel (Serverless Functions, Edge Middleware, Incremental Static Regeneration, and Fluid Compute)
- **Backend-as-a-Service & Database:** Supabase (Managed PostgreSQL, Supavisor Connection Pooling, Auth, Row-Level Security, Storage, and Realtime)
- **Runtime & Bundler:** Next.js 16 (App Router) with Turbopack and React 19 (Server Components + Server Actions)

---

## 2. Complete Tech Stack Matrix

### A. Core Framework & Language

| Tool / Package | Role in Project | Why It Fits Vercel + Supabase |
| :--- | :--- | :--- |
| **Next.js (App Router)** | Full-stack React framework | Native Vercel optimizations, `"use cache"` directives, React Server Components (RSC) for zero-bundle admin tables, and isolated client islands for 3D WebGL. |
| **TypeScript (`strict: true`)** | End-to-end type safety | Pairs directly with `supabase gen types typescript` and ORM schemas so database changes immediately flag UI mismatches at compile time. |
| **Zod** | Schema validation & parsing | Validates booking payloads, custom cake tier configurations, webhook signatures, and financial ledger entries across both client forms and Server Actions. |

### B. "Crazy UX" Storefront & 3D Cake Customizer (Marketing Route Group)

| Tool / Package | Package Name | Role in Project |
| :--- | :--- | :--- |
| **Three.js + React Three Fiber** | `three` `@react-three/fiber` | Declarative WebGL/WebGPU canvas for the interactive 3D Cake Builder (real-time tier stacking, frosting shaders, and lighting). |
| **React Three Drei** | `@react-three/drei` | Ready-made helpers for 3D camera controls (`OrbitControls`), environment maps, contact shadows, and `useGLTF` model loading with Draco compression. |
| **React Three Postprocessing** | `@react-three/postprocessing` | Adds subtle bloom, depth-of-field, and ambient occlusion to make 3D cake textures look photorealistic and appetizing. |
| **GSAP + ScrollTrigger** | `gsap` `@gsap/react` | High-precision timeline choreography for scrollytelling (pinning sections, slicing cake layers on scroll, parallax ingredient reveals). |
| **Lenis Smooth Scroll** | `lenis` | Normalizes trackpad and wheel scroll inertia across browsers and syncs frame-by-frame with GSAP ScrollTrigger and the Three.js render loop. |
| **Motion** | `motion` | Smooth DOM layout transitions, shared-element page transitions, and spring-physics micro-interactions on buttons and drawers. |
| **Rive** | `@rive-app/react-canvas` | Lightweight, state-machine-driven 2D interactive vector animations (custom loading indicators, interactive badges, and cursor-reactive icons). |
| **Tailwind CSS v4** | `tailwindcss` | Zero-runtime utility CSS engine using CSS-first configuration and design tokens for bespoke typography, gradients, and grid layouts. |

### C. Enterprise Admin, Booking Management & Financial Audit UI

| Tool / Package | Package Name | Role in Project |
| :--- | :--- | :--- |
| **Shadcn UI + Radix Primitives** | `@radix-ui/*` | Accessible, unstyled primitives styled with Tailwind for the back-office portal, modals, date pickers, and role-based command menus (`cmdk`). |
| **TanStack Table v8** | `@tanstack/react-table` | Headless, high-density data grid for the Financial Audit Ledger (supports multi-column sorting, server-side pagination, column pinning, and ledger filtering). |
| **TanStack Query v5** | `@tanstack/react-query` | Client-side cache orchestration, optimistic UI updates for kitchen production boards, and live polling fallback. |
| **React Hook Form** | `react-hook-form` | Performant, uncontrolled form handling for complex multi-step custom cake order specifications and manual journal adjustments. |
| **Recharts** | `recharts` | Financial visualization for revenue vs. COGS (ingredient cost), daily baker capacity utilization, and tax liability breakdowns. |
| **React PDF / SheetJS** | `@react-pdf/renderer` `xlsx` | Generates downloadable, tamper-evident PDF audit statements, client receipts, and CSV/Excel ledger exports for accountants. |

### D. State Management & Booking Workflow Engine

| Tool / Package | Package Name | Role in Project |
| :--- | :--- | :--- |
| **Zustand** | `zustand` | Holds ephemeral client state: 3D cake customizer configuration (flavors, tiers, toppers, inscription text) and active cart state. |
| **XState v5** | `xstate` `@xstate/react` | Finite State Machine governing the multi-step Booking Wizard (`Configure` -> `SlotCheck` -> `HoldSlot` -> `PaymentPending` -> `Confirmed`), preventing invalid checkout jumps. |
| **Upstash Redis** | `@upstash/redis` | Serverless HTTP Redis deployed alongside Vercel Edge. Holds 15-minute TTL concurrency locks on daily baker/oven slots while a customer is completing payment so two customers cannot double-book the same kitchen capacity. |
| **Inngest (or Vercel Cron)** | `inngest` | Event-driven background workflows on Vercel: automatically releases expired booking holds, sends 48-hour prep reminders to bakers, and triggers nightly financial reconciliation jobs. |

### E. Backend, Database & Financial Audit Core (Supabase)

| Supabase Feature / Tool | Package / Implementation | Enterprise Role |
| :--- | :--- | :--- |
| **Supabase PostgreSQL** | `@supabase/ssr` `@supabase/supabase-js` | Primary relational database hosting bookings, customer profiles, recipes/COGS, and the immutable financial ledger. |
| **Supavisor (Connection Pooler)** | Built into Supabase (Port `6543`) | Transaction-mode connection pooling required so Vercel's ephemeral serverless functions never exhaust PostgreSQL connection limits during traffic spikes. |
| **Drizzle ORM** | `drizzle-orm` `drizzle-kit` | Type-safe SQL ORM for complex financial aggregations (`SUM`, `GROUP BY`, running balance window functions) and version-controlled SQL migrations. |
| **Supabase Auth + RLS** | PostgreSQL Row-Level Security | Separates customer access from staff roles (`CUSTOMER`, `BAKER`, `MANAGER`, `AUDITOR`) directly at the database engine level. |
| **PostgreSQL Triggers (Audit)** | Custom PL/pgSQL Functions | Enforces an Append-Only Double-Entry Ledger. A `BEFORE UPDATE OR DELETE` trigger on `ledger_entries` and `audit_logs` raises an exception so historical financial rows can never be altered or deleted—only offset via reversal entries. |
| **Supabase Storage + CDN** | Supabase Buckets (`3d-assets`, `audit-docs`) | Public bucket with Smart CDN caching for compressed `.glb` 3D cake models and textures; private RLS-protected bucket for payment proofs, receipts, and signed audit exports. |
| **Supabase Realtime** | Postgres Changes / Broadcast | Pushes live order status updates to the kitchen display board and locks/unlocks calendar dates in real time when another user reserves a slot. |

### F. Payments, Notifications & Observability

| Tool / Package | Role in Project | Enterprise Implementation Note |
| :--- | :--- | :--- |
| **PayMongo / Stripe** | Payment Gateway (GCash, Maya, QR Ph, Cards) | Uses Checkout Sessions / PaymentIntents with Webhook Idempotency Keys stored in Supabase. Ledger entries are written only upon verified webhook signature receipt. |
| **Decimal.js / Dinero.js** | Arbitrary-precision monetary math | Prevents JavaScript floating-point rounding errors (`0.1 + 0.2 !== 0.3`). All database monetary columns are stored in minor units (`BIGINT` centavos/cents) or `NUMERIC(12, 2)`. |
| **Resend + React Email** | Transactional Emails (`resend` `@react-email/components`) | Sends branded booking confirmations, deposit receipts, and financial audit alerts from Vercel Server Actions. |
| **Sentry + Vercel Analytics** | Observability & Web Vitals | Tracks WebGL frame drops, Core Web Vitals on the landing page, and server-side webhook or database exceptions. |

---

## 3. Design & 3D Asset Pipeline Tools (Off-Code)

- **UI/UX Design:** Figma (Variables & Auto-Layout for design tokens synced to Tailwind CSS v4).
- **3D Cake Modeling & Baking:** Blender (Model cake tiers, toppings, and pedestals; bake ambient occlusion and PBR textures into lightweight maps).
- **3D Web Optimization:** glTF-Transform / Draco CLI + gltfjsx (Compresses `.glb` files by up to 80% and auto-generates typed React Three Fiber components).
- **Interactive 2D Assets:** Rive Editor (State-machine animations exported as `.riv` files).
