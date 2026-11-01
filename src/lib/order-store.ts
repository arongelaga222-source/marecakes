"use client";

import {
  addDaysToISODate,
  CategoryCode,
  DAILY_KITCHEN_SLOT_LIMIT,
  DEPOSIT_AMOUNT_PHP,
  FlavorCode,
  FulfillmentMethod,
  MIN_ADVANCE_LEAD_DAYS,
  OrderWorkflowStatus,
  SizeCode,
  SpongeBase,
  toManilaDateISO,
  VisionClassificationHint,
} from "./catalog";

export interface AuditTimelineEntry {
  id: string;
  timestampISO: string;
  actor: "CUSTOMER" | "PAYMONGO_WEBHOOK" | "VISION_CLASSIFIER" | "BAKER_ADMIN";
  eventType: string;
  detail: string;
}

export interface StoredCakeOrder {
  orderId: string;
  trackingCode: string;
  bookingAttemptId: string;
  createdAtISO: string;
  eventDateISO: string; // YYYY-MM-DD in Asia/Manila
  customerName: string;
  customerPhone: string;
  customerMessengerOrEmail: string;

  // Exterior design
  designSource: "catalog" | "custom_upload";
  catalogPresetId?: string;
  referenceImageUrl: string;
  visionClassification?: VisionClassificationHint;

  // Canonical SKU snapshot
  skuId: string;
  category: CategoryCode;
  spongeBase: SpongeBase;
  size: SizeCode;
  flavor: FlavorCode;

  // Add-ons & split text inputs
  includeCustomTopper: boolean;
  numberCandleCount: number;
  numberCandleDigits: string;
  cakeDedication: string; // Free, no manual review delay
  customDesignInstructions: string; // Triggers baker review if non-empty

  // Fulfillment
  fulfillmentMethod: FulfillmentMethod;
  rizalLocality: string;
  deliveryLandmarkOrNotes: string;
  pickupTimeSlot: string;

  // Immutable monetary snapshot (whole Pesos)
  basePriceSnapshotPhp: number;
  addonsSnapshotPhp: number;
  approvedTotalPhp: number;
  previousEstimatedTotalPhp?: number;
  depositPaidPhp: number;
  remainingBalancePhp: number;
  paymentChannel: "GCash" | "Maya" | "QR Ph" | "Card" | "Quote Pending";

  status: OrderWorkflowStatus;
  auditTimeline: AuditTimelineEntry[];
}

export interface OfflineSlotBlock {
  dateISO: string; // YYYY-MM-DD
  blockedSlots: number; // 1..3
  reason: string;
}

const ORDERS_STORAGE_KEY = "marecakes_orders_v1";
const BLOCKS_STORAGE_KEY = "marecakes_offline_blocks_v1";

function createSeedData(): {
  orders: StoredCakeOrder[];
  blocks: OfflineSlotBlock[];
} {
  const todayManila = toManilaDateISO(new Date());
  const day8 = addDaysToISODate(todayManila, MIN_ADVANCE_LEAD_DAYS + 1);
  const day9 = addDaysToISODate(todayManila, MIN_ADVANCE_LEAD_DAYS + 2);
  const day11 = addDaysToISODate(todayManila, MIN_ADVANCE_LEAD_DAYS + 4);
  const day12 = addDaysToISODate(todayManila, MIN_ADVANCE_LEAD_DAYS + 5);
  const day14 = addDaysToISODate(todayManila, MIN_ADVANCE_LEAD_DAYS + 7);

  const orders: StoredCakeOrder[] = [
    {
      orderId: "ord_seed_01",
      trackingCode: "MC-8492",
      bookingAttemptId: "ba_01JBMARECAKES901A",
      createdAtISO: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      eventDateISO: day8,
      customerName: "Clarisse Santos",
      customerPhone: "0917 842 1190",
      customerMessengerOrEmail: "fb.com/clarisse.santos.rizal",
      designSource: "catalog",
      catalogPresetId: "rose-coquette-blush",
      referenceImageUrl: "/cakes/cake-strawberry.png",
      skuId: "COQ-MST-6X5",
      category: "coquette",
      spongeBase: "moist",
      size: "6x5",
      flavor: "strawberry",
      includeCustomTopper: false,
      numberCandleCount: 2,
      numberCandleDigits: "24",
      cakeDedication: "Happy 24th Birthday Bea!",
      customDesignInstructions: "",
      fulfillmentMethod: "lalamove",
      rizalLocality: "Antipolo City",
      deliveryLandmarkOrNotes: "Near Robinsons Antipolo (Car/Sedan Lalamove noted)",
      pickupTimeSlot: "2:00 PM – 3:00 PM",
      basePriceSnapshotPhp: 1850,
      addonsSnapshotPhp: 50,
      approvedTotalPhp: 1900,
      depositPaidPhp: DEPOSIT_AMOUNT_PHP,
      remainingBalancePhp: 1600,
      paymentChannel: "GCash",
      status: "DEPOSIT_PAID_CONFIRMED",
      auditTimeline: [
        {
          id: "ev_1",
          timestampISO: new Date(Date.now() - 1000 * 60 * 96).toISOString(),
          actor: "CUSTOMER",
          eventType: "SLOT_HOLD_CREATED",
          detail: `15-min PostgreSQL slot hold acquired for ${day8} (Asia/Manila).`,
        },
        {
          id: "ev_2",
          timestampISO: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
          actor: "PAYMONGO_WEBHOOK",
          eventType: "checkout_session.payment.paid",
          detail: "Verified idempotent webhook (₱300 GCash deposit). Slot 1/3 confirmed instantly.",
        },
      ],
    },
    {
      orderId: "ord_seed_02",
      trackingCode: "MC-3107",
      bookingAttemptId: "ba_01JBMARECAKES902B",
      createdAtISO: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      eventDateISO: day9,
      customerName: "Marco Villanueva",
      customerPhone: "0998 551 3402",
      customerMessengerOrEmail: "marco.v@gmail.com",
      designSource: "custom_upload",
      referenceImageUrl: "/cakes/cake-chocolate.png",
      visionClassification: {
        is_cake: true,
        category_code: "birthday",
        suggested_tiers: 2,
        needs_manual_quote: true,
        visible_addon_hints: {
          has_custom_topper: true,
          has_number_candle: true,
        },
        confidence_note: "Detected 2-tier celebration structure with custom acrylic topper.",
      },
      skuId: "BDY-MST-2TR",
      category: "birthday",
      spongeBase: "moist",
      size: "2-tier",
      flavor: "ube",
      includeCustomTopper: true,
      numberCandleCount: 1,
      numberCandleDigits: "7",
      cakeDedication: "Happy 7th Birthday Lucas!",
      customDesignInstructions: "Royal blue & gold stars palette with metallic acrylic name topper.",
      fulfillmentMethod: "pickup",
      rizalLocality: "Taytay",
      deliveryLandmarkOrNotes: "Store Pickup via family SUV",
      pickupTimeSlot: "11:00 AM – 12:00 PM",
      basePriceSnapshotPhp: 5600,
      addonsSnapshotPhp: 205,
      previousEstimatedTotalPhp: 5805,
      approvedTotalPhp: 6150,
      depositPaidPhp: DEPOSIT_AMOUNT_PHP,
      remainingBalancePhp: 5850,
      paymentChannel: "Maya",
      status: "PRICE_ADJUSTED_AWAITING_CUSTOMER",
      auditTimeline: [
        {
          id: "ev_3",
          timestampISO: new Date(Date.now() - 1000 * 60 * 242).toISOString(),
          actor: "VISION_CLASSIFIER",
          eventType: "AI_ENUM_CLASSIFIED",
          detail: "Classified upload -> category=birthday, suggested_tiers=2, needs_manual_quote=true.",
        },
        {
          id: "ev_4",
          timestampISO: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
          actor: "PAYMONGO_WEBHOOK",
          eventType: "checkout_session.payment.paid",
          detail: "Verified ₱300 Maya deposit. Routed to Baker Review Queue.",
        },
        {
          id: "ev_5",
          timestampISO: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          actor: "BAKER_ADMIN",
          eventType: "PRICE_ADJUSTED",
          detail: "Adjusted total ₱5,805 -> ₱6,150 (+₱345 edible gold leaf & sculpted stars). Awaiting customer approval.",
        },
      ],
    },
    {
      orderId: "ord_seed_03",
      trackingCode: "MC-5520",
      bookingAttemptId: "ba_01JBMARECAKES903C",
      createdAtISO: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
      eventDateISO: day8,
      customerName: "Patricia Reyes",
      customerPhone: "0917 302 9918",
      customerMessengerOrEmail: "patricia.reyes@yahoo.com",
      designSource: "catalog",
      catalogPresetId: "pastel-garden-tribute",
      referenceImageUrl: "/cakes/cake-mint.png",
      skuId: "FLR-MST-8X5",
      category: "floral",
      spongeBase: "moist",
      size: "8x5",
      flavor: "pistachio",
      includeCustomTopper: false,
      numberCandleCount: 2,
      numberCandleDigits: "60",
      cakeDedication: "Happy 60th Birthday Mama Elena",
      customDesignInstructions: "",
      fulfillmentMethod: "lalamove",
      rizalLocality: "Cainta",
      deliveryLandmarkOrNotes: "Brookside Hills Gate 2 (MPV Lalamove)",
      pickupTimeSlot: "1:00 PM – 2:00 PM",
      basePriceSnapshotPhp: 3500,
      addonsSnapshotPhp: 50,
      approvedTotalPhp: 3550,
      depositPaidPhp: DEPOSIT_AMOUNT_PHP,
      remainingBalancePhp: 3250,
      paymentChannel: "QR Ph",
      status: "READY_AWAITING_BALANCE",
      auditTimeline: [
        {
          id: "ev_6",
          timestampISO: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
          actor: "PAYMONGO_WEBHOOK",
          eventType: "checkout_session.payment.paid",
          detail: "Verified ₱300 QR Ph deposit. Slot 2/3 confirmed.",
        },
        {
          id: "ev_7",
          timestampISO: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          actor: "BAKER_ADMIN",
          eventType: "READY_FOR_HANDOFF",
          detail: "Chilled and boxed. Gate locked until ₱3,250 remaining balance is settled.",
        },
      ],
    },
  ];

  const blocks: OfflineSlotBlock[] = [
    {
      dateISO: day11,
      blockedSlots: 3,
      reason: "Sold out via pre-launch Instagram/Facebook Messenger commitments",
    },
    {
      dateISO: day12,
      blockedSlots: 2,
      reason: "2 offline wedding/debut cake slots imported from FB Messenger",
    },
    {
      dateISO: day14,
      blockedSlots: 1,
      reason: "1 repeat Rizal client reservation held manually",
    },
  ];

  return { orders, blocks };
}

export function loadOrders(): StoredCakeOrder[] {
  if (typeof window === "undefined") {
    return createSeedData().orders;
  }
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedData();
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(seeded.orders));
      if (!window.localStorage.getItem(BLOCKS_STORAGE_KEY)) {
        window.localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(seeded.blocks));
      }
      return seeded.orders;
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as StoredCakeOrder[];
    }
  } catch (err) {
    console.warn("[Marecakes OrderStore] Storage read fallback triggered:", err);
  }
  return createSeedData().orders;
}

export function saveOrders(orders: StoredCakeOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("marecakes-store-updated"));
  } catch (err) {
    console.error("[Marecakes OrderStore] Failed to persist orders:", err);
  }
}

export function loadOfflineBlocks(): OfflineSlotBlock[] {
  if (typeof window === "undefined") {
    return createSeedData().blocks;
  }
  try {
    const raw = window.localStorage.getItem(BLOCKS_STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedData().blocks;
      window.localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as OfflineSlotBlock[];
    }
  } catch (err) {
    console.warn("[Marecakes OrderStore] Failed reading offline blocks:", err);
  }
  return createSeedData().blocks;
}

export function saveOfflineBlocks(blocks: OfflineSlotBlock[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
    window.dispatchEvent(new CustomEvent("marecakes-store-updated"));
  } catch (err) {
    console.error("[Marecakes OrderStore] Failed saving offline blocks:", err);
  }
}

export interface DateSlotStatus {
  dateISO: string;
  isPastLeadTime: boolean;
  bookedOrdersCount: number;
  offlineBlockedCount: number;
  usedSlots: number;
  remainingSlots: number;
  isFull: boolean;
  offlineReason?: string;
}

export function getSlotStatusForDate(
  dateISO: string,
  orders: StoredCakeOrder[],
  blocks: OfflineSlotBlock[],
  todayManilaISO?: string
): DateSlotStatus {
  const baseToday = todayManilaISO ?? toManilaDateISO(new Date());
  const minBookableISO = addDaysToISODate(baseToday, MIN_ADVANCE_LEAD_DAYS);
  const isPastLeadTime = dateISO < minBookableISO;

  const bookedOrdersCount = orders.filter(
    (o) => o.eventDateISO === dateISO
  ).length;
  const blockEntry = blocks.find((b) => b.dateISO === dateISO);
  const offlineBlockedCount = blockEntry ? blockEntry.blockedSlots : 0;

  const usedSlots = Math.min(
    DAILY_KITCHEN_SLOT_LIMIT,
    bookedOrdersCount + offlineBlockedCount
  );
  const remainingSlots = Math.max(0, DAILY_KITCHEN_SLOT_LIMIT - usedSlots);

  return {
    dateISO,
    isPastLeadTime,
    bookedOrdersCount,
    offlineBlockedCount,
    usedSlots,
    remainingSlots,
    isFull: remainingSlots === 0,
    offlineReason: blockEntry?.reason,
  };
}
