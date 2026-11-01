# Marecakes Online Cake Configurator, AI Tier Estimator & Slot Booking

* **Author:** Marecakes Engineering
* **Date:** 2026-11-01

## Overview

Marecakes needs an online ordering and slot-booking system for customers in Rizal province, Philippines, replacing manual back-and-forth messaging while enforcing a strict kitchen limit of **3 cakes per day** and a **7-day minimum advance lead time**.

Customers can either pick one of Marecakes' signature catalog designs (*Coquette Cakes*, *Customized Mother's / Floral Cakes*, or *Customized Birthday Cakes with Printed Toppers*) or upload a custom reference photo. Alongside their exterior design reference, customers select their sponge base (*Chiffon* vs. *Moist*), cake size/tiers (`6x3`, `6x5`, `8x3`, `8x5`, or `2-Tier`), interior flavor (*Chocolate*, *Mocha*, *Vanilla*, *Ube*, *Red Velvet*, *Strawberry*, or *Pistachio*), optional add-ons (*Customized Topper* at `180 PHP`, *Number Candle* at `25 PHP` each), cake dedication text, and fulfillment method (*Store Pickup* or *Customer-Paid Lalamove* within Rizal). When a custom photo is uploaded, a vision classifier maps the photo to Marecakes' closest catalog category while server-side lookup math calculates an estimated starting price, followed by PayMongo down-payment collection (`300 PHP`) and baker review for custom requests.

## Analysis

Six independent Goldfish reviews evaluated this concept against the live repository ([package.json](file:///d:/Projects/Marecakes/package.json), [STACK.md](file:///d:/Projects/Marecakes/STACK.md), [next.config.ts](file:///d:/Projects/Marecakes/next.config.ts), [Hero.tsx](file:///d:/Projects/Marecakes/src/components/Hero.tsx), [CakeShowcase.tsx](file:///d:/Projects/Marecakes/src/components/CakeShowcase.tsx), [build_sampler_cake_v3.py](file:///d:/Projects/Marecakes/blender_assets/build_sampler_cake_v3.py), and [sampler_cake.glb](file:///d:/Projects/Marecakes/public/models/sampler_cake.glb)). Their consolidated findings fall into five core risks:

### 1. Upfront 300 PHP Deposit vs. Post-Review Re-Pricing, Gateway Fee Loss & Slot Starvation
* **Surprise Price Jumps & Tiny Deposit Coverage:** On custom photo or special-instruction orders, `300 PHP` is collected *before* the baker verifies feasibility or final price—covering as little as 5.3% of a `5,600 PHP` 2-tier Moist cake. If the AI estimates `1,500 PHP` and the baker raises the total to `3,200 PHP`, there is no defined customer re-approval or refund window before baking begins.
* **Non-Refundable PayMongo Fees:** PayMongo retains processing fees (~1.5%–3.5%) even when an order is refunded. Every rejected upload (impossible 4-tier sculpted cakes, prank uploads, or out-of-area buyers) costs Marecakes money and manual e-wallet refund work.
* **The 3-Slot Reservation Paradox & Simple Dedications:** If unapproved custom orders lock 1 of the 3 daily slots immediately upon deposit, three unrealistic uploads at night mark that date sold out for ready-to-buy catalog shoppers; if they do not lock a slot, four people can pay deposits for a 3-cake day. Meanwhile, routing *all* orders with notes into manual review forces standard catalog buyers who just type *"Happy Birthday Mama"* into an unnecessary approval queue.
* **Missing Remaining-Balance & Offline-Backfill Rules:** Every order (catalog and custom) owes `total - 300 PHP` before Lalamove dispatch or pickup, requiring a second payment/settlement step. In addition, launching the calendar at `0 of 3` booked slots without importing existing offline Facebook/Instagram commitments will double-book the kitchen on day one.

### 2. Incomplete Flyer Price Matrix, Double-Charged Add-Ons & Abuse of Anonymous Photo Uploads
* **40% of Category/Base/Size Pairs Do Not Exist:** Marecakes' official flyers contain **16 valid base price cells**, not uniform adders:
  * *Coquette Cakes* offer `6x3`, `6x5`, `8x3`, and `8x5` in both `Chiffon` (`999–2,700 PHP`) and `Moist` (`1,100–3,400 PHP`), with no `2-Tier`.
  * *Mother's / Floral Cakes* list only `Moist` `6x5` (`2,200 PHP`) and `8x5` (`3,500 PHP`)—no `Chiffon`, no `3"` heights, and no `2-Tier`.
  * *Customized Birthday Cakes* list `6x5`, `8x5`, and `2-Tier` in `Chiffon` (`1,500 / 2,500 / 4,200 PHP`) and `Moist` (`2,200 / 3,200 / 5,600 PHP`), with no `3"` heights.
  * Independent dropdowns or a 4-variable additive formula in code will produce invalid combinations or totals that disagree with published posters. Moreover, mutating catalog prices later would corrupt remaining balances on active orders unless prices are snapshotted per order.
* **Add-On Double-Counting:** Customized Birthday Cakes already bundle *"Icing with Printed Toppers/Design"* in their base price, and reference photos online almost always show toppers and number candles. Auto-adding `+180 PHP` or `+25 PHP` from AI detection charges buyers twice.
* **Serverless Body Limits, Storage Bloat & Wallet Drain:** Smartphone photos (`5–15 MB` JPEG/`.HEIC`) exceed Vercel's `4.5 MB` function request limit and Next.js's default `1 MB` Server Action limit. Unthrottled anonymous uploads before payment also allow bots or casual browsers to fill Supabase Storage with orphaned files and drain vision API budgets, while overlaid text inside images can attempt prompt injection.

### 3. Visual Clash Between Uploaded Reference Photos, `sampler_cake.glb`, and Mobile In-App Browsers
* **Exterior vs. Interior Confusion:** Sponge flavor (*Ube*, *Red Velvet*, *Pistachio*) and sponge density (*Chiffon* vs. *Moist*) live *inside* the cake beneath frosting. Rendering a plain round 3D cylinder turning purple next to a customer's uploaded photo of a heart-shaped white ribbon cake misleads buyers about what exterior design and shape will arrive.
* **Incompatible Existing Repo Assets:** [CakeShowcase.tsx](file:///d:/Projects/Marecakes/src/components/CakeShowcase.tsx) and [build_sampler_cake_v3.py](file:///d:/Projects/Marecakes/blender_assets/build_sampler_cake_v3.py) ([sampler_cake.glb](file:///d:/Projects/Marecakes/public/models/sampler_cake.glb)) currently depict a fixed 6-slice sampler wheel with off-menu flavors (*Matcha*, *Lotus Biscoff*, *Cookies & Cream*) and rely on internal Blender `ShaderNodeTexNoise` procedural nodes that do not export crumb textures to `.glb`.
* **Mobile WebView Fragility:** Most Rizal customers open bakery links inside Facebook Messenger or Instagram in-app WebViews on mid-range phones. Loading Three.js postprocessing alongside [CakeShowcase.tsx](file:///d:/Projects/Marecakes/src/components/CakeShowcase.tsx)'s continuous `requestAnimationFrame` scroll loop risks `webglcontextlost` GPU crashes and slow loads over mobile data unless isolated with a 2D fallback.

### 4. Enterprise Stack Over-Engineering (`STACK.md`) & Timezone / Webhook Split-Brain Bugs
* **25-Package Enterprise Blueprint vs. 90 Orders/Month:** [package.json](file:///d:/Projects/Marecakes/package.json) currently installs only 5 packages, whereas [STACK.md](file:///d:/Projects/Marecakes/STACK.md) prescribes Upstash Redis slot locks, Inngest workers, XState v5, Rive, Lenis, GSAP, `Decimal.js`, 4 staff RBAC roles, and append-only database triggers blocking row updates.
* **Redis-to-Postgres Split-Brain & `UTC` vs. `Asia/Manila` Off-By-One:** Holding 15-minute locks in Redis while storing orders in PostgreSQL allows a hold to expire while a customer is entering a GCash OTP in PayMongo, letting a 4th cake get paid. Meanwhile, Vercel runs in `UTC` while Rizal operates in `Asia/Manila` (`UTC+8`), causing midnight-to-8-AM checkouts to miscalculate the 7-day lead time by one full day unless normalized to Manila calendar dates.
* **3 AM Webhook Blindness:** Mobile GCash/Maya payers often close their browser tab after paying. Without a single `booking_attempt_id` persisted across a `payment_webhook_events` inbox table, `ai_estimation_audits`, and an admin diagnostic timeline, missing deposits or late-webhook overbookings cannot be triaged quickly.

### 5. Missing Rizal Fulfillment Context & Lalamove Vehicle Guidance
* Shoppers cannot choose between *Store Pickup* and *Customer-Paid Lalamove* without seeing Marecakes' pickup municipality/landmark upfront, and non-Rizal visitors should not spend minutes configuring a cake before learning delivery is Rizal-only.
* Tall (`6x5`, `8x5`) and `2-Tier` cakes cannot ride safely in a Lalamove motorcycle box; buyers need explicit Car/MPV vehicle guidance at checkout so cakes are not ruined in transit.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Align the landing page showcase ([CakeShowcase.tsx](file:///d:/Projects/Marecakes/src/components/CakeShowcase.tsx) and [Hero.tsx](file:///d:/Projects/Marecakes/src/components/Hero.tsx)) and `/order` configurator to one canonical catalog covering Marecakes' 3 official categories, 16 valid `(category, sponge_base, size_code)` price cells, 7 official flavors, and 2 fixed add-ons, displayed with human-readable inch dimensions and serving counts.
  * Support both **Signature Catalog Selection** and **Custom Reference Photo Upload**, using client-side image downscaling (`<= 1280px`), server-side `sharp` WebP normalization/EXIF stripping, IP rate limiting + daily budget circuit breaker, and a strict JSON-enum vision classifier (`is_cake`, `category_code`, `suggested_tiers`, `needs_manual_quote`, `visible_addon_hints`) that never outputs Peso figures and degrades to manual baker quoting if unavailable.
  * Provide a side-by-side preview separating **"Your Exterior Design Reference"** (2D catalog or uploaded photo) from an **"Interior Cutaway & Size Scale Preview"** (isolated lazy-loaded 3D cutaway showing baked Chiffon vs. Moist crumb textures, flavor color, tier proportions, and topper/candle slots, backed by an automatic 2D cutaway fallback on WebGL failure or slow mobile WebViews).
  * Split customer text inputs into a free, character-limited **Cake Dedication / Greeting** (no manual approval delay on catalog cakes) and **Custom Design Instructions** (routes to baker review).
  * Enforce the **3 cakes/day** limit, **7-day minimum lead time** (in `Asia/Manila` `UTC+8`), offline order/blackout-date blocking, and **Rizal-only** fulfillment (14 Rizal localities dropdown + pickup town disclosure + Lalamove Car/MPV vehicle warning) via Guest Checkout and single-database PostgreSQL transactional slot holds.
  * Integrate PayMongo Hosted Checkout / Payment Links with idempotent, versioned webhook logging (`booking_attempt_id`), an admin review/price-adjustment/rejection workflow, and remaining-balance tracking (`remaining_balance_php === 0` gate before Lalamove/pickup handoff).

* **Out-of-Scope Non-Goals:**
  * Vector databases or embedding-based RAG pipelines for catalog pricing.
  * Real-time 3D mesh reconstruction of customer-uploaded 2D photos or Three.js GPU postprocessing shaders.
  * Distributed Redis lock clusters (Upstash), external background job orchestrators (Inngest), client-side finite state machine libraries (XState), double-entry accounting ledgers, PDF/Excel audit generators, or multi-role staff RBAC (`BAKER`, `MANAGER`, `AUDITOR`) in Phase 1.
  * Live Lalamove courier booking API integration or real-time shipping fee calculation (customers book/pay Lalamove directly or pick up).
  * Mandatory customer account registration before placing an order.

## Alternatives Weighed

1. **Direct LLM Peso Pricing from Uploaded Photos:** Rejected because a 2D photo hides cake diameter, serving count, and internal sponge base (*Chiffon* vs. *Moist*), outputs inconsistent numbers across retries, and exposes checkout to text-in-image prompt injection.
2. **Vector Database / Embedding RAG for Price Grounding:** Rejected because Marecakes' entire price matrix contains 16 valid base price cells and 2 add-ons (~400 tokens). Vector retrieval adds stale-price sync bugs when prices change and misclassifies 1-tier vs. 2-tier proportions worse than embedding the complete structured rubric directly in a single JSON-constrained vision prompt paired with deterministic server lookup math.
3. **4-Variable Additive Pricing Engine (`Base Portion Rate + Artisan Labor + Specialty Materials + Setup & Delivery`) in Code:** Rejected because Marecakes' official price posters use non-linear whole-Peso retail SKU prices where ~40% of `(Category × Sponge Base × Size)` combinations are disallowed and online `Setup & Delivery` is `0 PHP`. Decomposing flat prices into synthetic sub-rates creates mismatches against published posters.
4. **Full 25+ Package Enterprise Stack from `STACK.md` (Upstash Redis, Inngest, XState, Double-Entry Triggers, `Decimal.js`):** Rejected because a bakery capped at 3 cakes/day (~90 orders/month) with whole-Peso prices can enforce 15–30 minute checkout holds atomically inside PostgreSQL (`SELECT ... FOR UPDATE` + `hold_expires_at > NOW()`), eliminating Redis-to-Postgres split-brain double-booking, multi-dashboard debugging sprawl, and React 19.3 dependency breakage.
5. **Reusing `sampler_cake.glb` or Transforming Uploaded Photos into 3D Models:** Rejected because [sampler_cake.glb](file:///d:/Projects/Marecakes/public/models/sampler_cake.glb) is a static 6-slice wheel with off-menu flavors and non-exportable Blender procedural noise nodes, and arbitrary 2D customer photos cannot be converted cleanly into editable 3D meshes in browser WebGL.
6. **Mandatory Customer Sign-In & Live Lalamove API Integration:** Rejected because infrequent celebration-cake buyers convert better via Guest Checkout with signed order-tracking links, and customer-shouldered Lalamove requires only a Rizal 14-locality allowlist plus Car/MPV vehicle guidance.

## Key Decisions & Staging for Next Steps

### Resolved Foundations
* **Canonical Pricing Model:** Versioned PostgreSQL/TypeScript SKU lookup table `(category_code, sponge_base, size_code) -> price_php` (whole Peso integers) + explicit customer-confirmed add-ons (`180 PHP` topper, `25 PHP × qty` number candles) + immutable order price snapshots.
* **AI Boundary & Abuse Controls:** Single structured-output multimodal vision classifier (`<= 5` calls / 15 min / IP, `1,000` calls/day global cap, `3–15 USD/month` expected budget) returning enum hints only; client resize + `sharp` WebP/EXIF scrub; 24-hour auto-purge of unpaid temporary uploads; `ai_estimation_audits` logging.
* **Single-DB Capacity & Observability:** PostgreSQL atomic slot holds normalized to `Asia/Manila` (`UTC+8`), pre-launch manual offline slot blocker, append-only `payment_webhook_events` and `order_audit_timeline` keyed by `booking_attempt_id`, and single-role `/admin` dashboard.
* **Phased Rollout Safety:**
  * *Phase 1:* Unified real catalog data, 2D cutaway + reference photo preview, 3-cakes/day Manila-time booking calendar with manual offline blocker, PayMongo checkout + webhook inbox, and admin approval/balance workflow.
  * *Phase 2:* Lazy-loaded parametric 3D cutaway island (`frameloop="demand"`, baked Chiffon/Moist WebP textures) wrapped in an error boundary falling back to the Phase 1 2D cutaway.
  * *Phase 3:* Gated AI vision photo classifier pre-selecting category/tier hints, degrading to *"Pending Baker Price Quote"* if rate-limited or offline.

### Open Decisions to Lock Before `/egm-draft`
1. **Custom Order Deposit Timing (Fee & Re-Pricing Trade-Off):**
   * *Option A (Split Deposit Flow):* Standard Signature Catalog orders pay the `300 PHP` PayMongo deposit immediately for instant slot confirmation, while Custom Photo / Custom Instruction orders submit a free quote request first and receive a 24-hour `300 PHP` PayMongo deposit link *after* the baker approves feasibility and locks the exact final price (zero rejection refund fees, zero surprise price jumps).
   * *Option B (Upfront 300 PHP on All Orders):* Collect `300 PHP` upfront on every order to deter spam, immediately locking 1 of the 3 daily slots, paired with a mandatory 24-hour baker review SLA and a `PRICE_ADJUSTED_AWAITING_CUSTOMER` state allowing the buyer to accept any upward price change or cancel for a full `300 PHP` refund before baking starts.
2. **Flavor Pricing & 2-Tier Rules:** Confirm with the client whether all 7 flavors carry `0 PHP` surcharge across all categories, whether 2-tier cakes use a single sponge/flavor or allow different flavors per tier, and Marecakes' exact Rizal pickup town/landmark to display upfront.
3. **3D Cutaway vs. Pure 2D Cutaway for Launch:** Confirm whether Phase 2's parametric 3D cutaway is required for initial client delivery or if Phase 1's 2D layered cutaway spec card + reference photo satisfies launch scope.
