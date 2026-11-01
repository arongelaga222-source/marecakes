"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CATEGORIES,
  DAILY_KITCHEN_SLOT_LIMIT,
  FLAVORS,
  MIN_ADVANCE_LEAD_DAYS,
  OrderWorkflowStatus,
  SIZE_METADATA,
  addDaysToISODate,
  formatPhp,
  formatReadableDate,
  toManilaDateISO,
} from "@/lib/catalog";
import {
  OfflineSlotBlock,
  StoredCakeOrder,
  getSlotStatusForDate,
  loadOfflineBlocks,
  loadOrders,
  saveOfflineBlocks,
  saveOrders,
} from "@/lib/order-store";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Lock,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export default function BakerAdminPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "capacity">("orders");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderWorkflowStatus>(
    "ALL"
  );
  const [todayManilaISO, setTodayManilaISO] = useState<string>("");
  const [orders, setOrders] = useState<StoredCakeOrder[]>([]);
  const [blocks, setBlocks] = useState<OfflineSlotBlock[]>([]);

  // Quote Price Adjuster Drafts (orderId -> peso string)
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});

  // Manual Offline Slot Blocker Form
  const [blockDateISO, setBlockDateISO] = useState<string>("");
  const [blockCount, setBlockCount] = useState<number>(1);
  const [blockReason, setBlockReason] = useState<string>(
    "Offline Facebook Messenger / Instagram reservation"
  );
  const [adminToast, setAdminToast] = useState<string | null>(null);

  useEffect(() => {
    const nowManila = toManilaDateISO(new Date());
    setTodayManilaISO(nowManila);
    setBlockDateISO(addDaysToISODate(nowManila, MIN_ADVANCE_LEAD_DAYS + 3));
    setOrders(loadOrders());
    setBlocks(loadOfflineBlocks());
  }, []);

  const notify = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3500);
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Baker Transition Helper
  const updateOrderStatus = (
    orderId: string,
    nextStatus: OrderWorkflowStatus,
    auditDetail: string
  ) => {
    const nextOrders = orders.map((ord) => {
      if (ord.orderId !== orderId) return ord;
      return {
        ...ord,
        status: nextStatus,
        remainingBalancePhp:
          nextStatus === "COMPLETED" ? 0 : ord.remainingBalancePhp,
        auditTimeline: [
          ...ord.auditTimeline,
          {
            id: `ev_adm_${Date.now()}`,
            timestampISO: new Date().toISOString(),
            actor: "BAKER_ADMIN" as const,
            eventType: `STATUS -> ${nextStatus}`,
            detail: auditDetail,
          },
        ],
      };
    });
    saveOrders(nextOrders);
    setOrders(nextOrders);
    notify(`Updated order to ${nextStatus}`);
  };

  // Baker Custom Quote Price Adjustment (`PRICE_ADJUSTED_AWAITING_CUSTOMER`)
  const handleAdjustOrderPrice = (ord: StoredCakeOrder) => {
    const rawVal = quoteDrafts[ord.orderId];
    const parsedTotal = Number(rawVal);
    if (!Number.isFinite(parsedTotal) || parsedTotal < ord.depositPaidPhp) {
      notify("Adjusted total must be a valid Peso amount ≥ ₱300 deposit.");
      return;
    }

    const roundedTotal = Math.round(parsedTotal);
    const nextRemaining = Math.max(0, roundedTotal - ord.depositPaidPhp);

    const nextOrders = orders.map((item) => {
      if (item.orderId !== ord.orderId) return item;
      return {
        ...item,
        previousEstimatedTotalPhp: item.approvedTotalPhp,
        approvedTotalPhp: roundedTotal,
        remainingBalancePhp: nextRemaining,
        status: "PRICE_ADJUSTED_AWAITING_CUSTOMER" as const,
        auditTimeline: [
          ...item.auditTimeline,
          {
            id: `ev_quote_${Date.now()}`,
            timestampISO: new Date().toISOString(),
            actor: "BAKER_ADMIN" as const,
            eventType: "PRICE_ADJUSTED",
            detail: `Baker adjusted total from ${formatPhp(
              item.approvedTotalPhp
            )} to ${formatPhp(
              roundedTotal
            )}. Customer re-approval required on /track.`,
          },
        ],
      };
    });

    saveOrders(nextOrders);
    setOrders(nextOrders);
    notify(
      `Sent adjusted quote (${formatPhp(roundedTotal)}) for ${
        ord.trackingCode
      } to customer re-approval.`
    );
  };

  // Save Manual Offline FB/IG Slot Block
  const handleApplyOfflineBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDateISO) return;

    const clampedSlots = Math.max(
      0,
      Math.min(DAILY_KITCHEN_SLOT_LIMIT, blockCount)
    );
    const otherBlocks = blocks.filter((b) => b.dateISO !== blockDateISO);
    const nextBlocks =
      clampedSlots === 0
        ? otherBlocks
        : [
            ...otherBlocks,
            {
              dateISO: blockDateISO,
              blockedSlots: clampedSlots,
              reason:
                blockReason.trim() || "Manual offline FB/IG slot reservation",
            },
          ].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    saveOfflineBlocks(nextBlocks);
    setBlocks(nextBlocks);
    notify(
      clampedSlots === 0
        ? `Cleared manual offline blocks on ${blockDateISO}`
        : `Blocked ${clampedSlots} offline slot(s) on ${blockDateISO}`
    );
  };

  const handleResetDemoData = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("marecakes_orders_v1");
    window.localStorage.removeItem("marecakes_offline_blocks_v1");
    setOrders(loadOrders());
    setBlocks(loadOfflineBlocks());
    notify("Reset demo orders & offline FB/IG slot blocks to fresh seed state.");
  };

  // Next 16 bookable Manila dates ledger
  const upcomingCapacityLedger = useMemo(() => {
    if (!todayManilaISO) return [];
    return Array.from({ length: 16 }, (_, idx) => {
      const iso = addDaysToISODate(
        todayManilaISO,
        MIN_ADVANCE_LEAD_DAYS + idx
      );
      return getSlotStatusForDate(iso, orders, blocks, todayManilaISO);
    });
  }, [todayManilaISO, orders, blocks]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fdf7f8] text-[#2a121b]">
      <Header activeLink="Kitchen" forceScrolledStyle={true} />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-6 sm:px-10 md:px-14 lg:px-16 max-w-[1400px] w-full mx-auto">
        {/* Top Portal Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
              <Sparkles size={13} />
              <span>Single-Role Baker Operations Portal</span>
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#250d16] tracking-tight mt-1">
              Marecakes Kitchen &amp; 3-Slot Capacity Control
            </h1>
            <p className="text-sm text-[#613d4b] mt-1">
              Review custom reference photo quotes, release remaining-balance
              gates, and block offline FB/IG slots against your 3-cake daily
              limit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-[#260e17] text-white shadow-sm"
                  : "bg-white border border-[#e2c2ce] text-[#351521]"
              }`}
            >
              <ClipboardList size={15} />
              <span>Order &amp; Quote Queue ({orders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("capacity")}
              className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "capacity"
                  ? "bg-[#260e17] text-white shadow-sm"
                  : "bg-white border border-[#e2c2ce] text-[#351521]"
              }`}
            >
              <Calendar size={15} />
              <span>3-Slot Calendar &amp; Offline Blocker</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemoData}
              title="Reset sample orders & blocks"
              className="p-2.5 rounded-full bg-white border border-[#e2c2ce] hover:border-[#9e3b5c] text-[#6d4554] cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {adminToast && (
          <div className="mb-6 rounded-2xl bg-[#260e17] text-white px-4 py-3 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-md">
            <CheckCircle2 size={16} className="text-emerald-300 flex-shrink-0" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* TAB 1: ORDER QUEUE & CUSTOM QUOTE REVIEWER */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "ALL", label: "All Orders" },
                  {
                    id: "AWAITING_BAKER_QUOTE",
                    label: "Needs Baker Quote",
                  },
                  {
                    id: "PRICE_ADJUSTED_AWAITING_CUSTOMER",
                    label: "Awaiting Customer Re-Approval",
                  },
                  {
                    id: "DEPOSIT_PAID_CONFIRMED",
                    label: "Confirmed (₱300 Paid)",
                  },
                  { id: "IN_KITCHEN_PREP", label: "In Kitchen Prep" },
                  {
                    id: "READY_AWAITING_BALANCE",
                    label: "Awaiting Balance Gate",
                  },
                  { id: "COMPLETED", label: "Completed" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-[#9e3b5c] text-white border-[#9e3b5c]"
                      : "bg-white hover:bg-[#fae9ef] text-[#351521] border-[#e2c2ce]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Order Cards */}
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const draftVal =
                  quoteDrafts[ord.orderId] ?? String(ord.approvedTotalPhp);

                return (
                  <div
                    key={ord.orderId}
                    className="rounded-3xl bg-white border border-[#e5c6d2] p-6 shadow-sm"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Info */}
                      <div className="lg:col-span-7 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/track?code=${encodeURIComponent(
                              ord.trackingCode
                            )}`}
                            className="font-mono font-bold text-sm text-[#8e3050] hover:underline"
                          >
                            {ord.trackingCode} ↗
                          </Link>
                          <span className="text-xs text-[#855768]">·</span>
                          <span className="text-xs font-semibold text-[#250d16]">
                            Event: {formatReadableDate(ord.eventDateISO)} (
                            {ord.pickupTimeSlot})
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f8e7ee] text-[#842b49] text-[11px] font-bold">
                            {ord.status}
                          </span>
                        </div>

                        <h3 className="font-display text-xl font-bold text-[#250d16]">
                          {CATEGORIES[ord.category].shortName} —{" "}
                          {SIZE_METADATA[ord.size].label} (
                          <span className="capitalize">{ord.spongeBase}</span> ·{" "}
                          {FLAVORS.find((f) => f.code === ord.flavor)?.name})
                        </h3>

                        <div className="text-xs text-[#5f3b49]">
                          Customer: <strong>{ord.customerName}</strong> (
                          {ord.customerPhone} · {ord.customerMessengerOrEmail})
                          ·{" "}
                          {ord.fulfillmentMethod === "pickup"
                            ? "Store Pickup (Taytay)"
                            : `Lalamove (${ord.rizalLocality})`}
                        </div>

                        {ord.cakeDedication && (
                          <div className="text-xs bg-[#fcf6f8] border border-[#ecd5de] rounded-xl px-3 py-2">
                            <strong>Dedication:</strong> “{ord.cakeDedication}”
                          </div>
                        )}

                        {(ord.customDesignInstructions ||
                          ord.visionClassification) && (
                          <div className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 text-amber-950">
                            {ord.customDesignInstructions && (
                              <div>
                                <strong>Custom Design Request:</strong>{" "}
                                {ord.customDesignInstructions}
                              </div>
                            )}
                            {ord.visionClassification && (
                              <div className="font-mono text-[11px] text-amber-900">
                                AI Enum Hint: category=
                                {ord.visionClassification.category_code}, tiers=
                                {ord.visionClassification.suggested_tiers},
                                needs_manual_quote=true
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Financials & Baker Actions */}
                      <div className="lg:col-span-5 flex flex-col justify-between gap-4 lg:border-l lg:border-[#f2e2e8] lg:pl-6">
                        <div className="grid grid-cols-3 gap-2 text-center bg-[#fcf7f9] border border-[#ebd3dc] rounded-2xl p-3">
                          <div>
                            <div className="text-[10px] font-mono uppercase text-[#825565]">
                              Total
                            </div>
                            <div className="font-display font-bold text-sm text-[#250d16]">
                              {formatPhp(ord.approvedTotalPhp)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono uppercase text-[#825565]">
                              Deposit
                            </div>
                            <div className="font-display font-bold text-sm text-emerald-700">
                              {formatPhp(ord.depositPaidPhp)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono uppercase text-[#825565]">
                              Balance
                            </div>
                            <div className="font-display font-bold text-sm text-[#8e3050]">
                              {formatPhp(ord.remainingBalancePhp)}
                            </div>
                          </div>
                        </div>

                        {/* Custom Quote Price Adjuster */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7c5161]">
                              ₱
                            </span>
                            <input
                              type="number"
                              min={ord.depositPaidPhp}
                              step={50}
                              value={draftVal}
                              onChange={(e) =>
                                setQuoteDrafts((prev) => ({
                                  ...prev,
                                  [ord.orderId]: e.target.value,
                                }))
                              }
                              className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-xs font-bold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                              aria-label="Adjust approved total in PHP"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAdjustOrderPrice(ord)}
                            className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 size={13} />
                            <span>Send Adjusted Quote</span>
                          </button>
                        </div>

                        {/* Workflow Stage Buttons */}
                        <div className="flex flex-wrap gap-2">
                          {ord.status === "AWAITING_BAKER_QUOTE" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateOrderStatus(
                                  ord.orderId,
                                  "DEPOSIT_PAID_CONFIRMED",
                                  "Baker approved custom design at base matrix estimate without surcharge."
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Approve Quote As-Is
                            </button>
                          )}

                          {(ord.status === "DEPOSIT_PAID_CONFIRMED" ||
                            ord.status ===
                              "PRICE_ADJUSTED_AWAITING_CUSTOMER") && (
                            <button
                              type="button"
                              onClick={() =>
                                updateOrderStatus(
                                  ord.orderId,
                                  "IN_KITCHEN_PREP",
                                  "Moved into sponge baking & overnight chilling schedule."
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-[#260e17] hover:bg-[#9e3b5c] text-white text-xs font-semibold cursor-pointer"
                            >
                              Start Kitchen Prep →
                            </button>
                          )}

                          {ord.status === "IN_KITCHEN_PREP" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateOrderStatus(
                                  ord.orderId,
                                  "READY_AWAITING_BALANCE",
                                  `Cake boxed & chilled. Remaining balance gate (${formatPhp(
                                    ord.remainingBalancePhp
                                  )}) sent to customer.`
                                )
                              }
                              className="px-3.5 py-2 rounded-xl bg-[#9e3b5c] hover:bg-[#822a48] text-white text-xs font-semibold cursor-pointer"
                            >
                              Mark Ready &amp; Request Balance →
                            </button>
                          )}

                          {ord.status === "READY_AWAITING_BALANCE" && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#8e3050] font-semibold bg-[#fbeaf0] px-3 py-1.5 rounded-xl">
                              <Lock size={13} />
                              <span>
                                Handoff Locked Until{" "}
                                {formatPhp(ord.remainingBalancePhp)} Settled on{" "}
                                <Link
                                  href={`/track?code=${ord.trackingCode}`}
                                  className="underline"
                                >
                                  /track
                                </Link>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: 3-SLOT DAILY CALENDAR & MANUAL OFFLINE FB/IG SLOT BLOCKER */}
        {activeTab === "capacity" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Manual Offline Slot Blocker Form */}
            <form
              onSubmit={handleApplyOfflineBlock}
              className="lg:col-span-5 rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm space-y-5"
            >
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                  Prevent Messenger / IG Double-Booking
                </span>
                <h2 className="font-display text-xl font-bold text-[#250d16] mt-1">
                  Manual Offline Slot Blocker
                </h2>
                <p className="text-xs text-[#613d4b] mt-1 leading-relaxed">
                  Accepted an offline cake commitment on Facebook Messenger or
                  Instagram DM? Block 1 to 3 slots on that date so the public
                  storefront calendar automatically deducts capacity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                  Date (Asia/Manila)
                </label>
                <input
                  type="date"
                  required
                  value={blockDateISO}
                  onChange={(e) => setBlockDateISO(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                  Offline Slots to Block (0 clears manual block)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBlockCount(cnt)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        blockCount === cnt
                          ? "bg-[#260e17] text-white border-[#260e17]"
                          : "bg-[#fcf8f9] text-[#351521] border-[#e2c2ce]"
                      }`}
                    >
                      {cnt === 0 ? "0 (Clear)" : `${cnt} Slot${cnt > 1 ? "s" : ""}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                  Internal Kitchen Note
                </label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. 2 offline debut cakes via FB Messenger"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                />
              </div>

              <button
                type="submit"
                className="tactile-press w-full py-3.5 rounded-full bg-[#9e3b5c] hover:bg-[#822a48] text-white text-sm font-semibold cursor-pointer shadow"
              >
                Save Daily Capacity Override
              </button>
            </form>

            {/* Right: 16-Day Upcoming Manila Slot Ledger */}
            <div className="lg:col-span-7 rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-[#250d16]">
                  Upcoming 3-Slot Daily Kitchen Ledger
                </h2>
                <span className="text-xs font-mono text-[#845768]">
                  Max {DAILY_KITCHEN_SLOT_LIMIT} cakes/day
                </span>
              </div>

              <div className="space-y-2.5">
                {upcomingCapacityLedger.map((day) => (
                  <div
                    key={day.dateISO}
                    onClick={() => setBlockDateISO(day.dateISO)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-wrap items-center justify-between gap-3 ${
                      blockDateISO === day.dateISO
                        ? "bg-[#fbeaf0] border-[#a64264]"
                        : "bg-[#fcf8f9] hover:bg-[#f7eaef] border-[#ebd2dc]"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-[#250d16]">
                        {formatReadableDate(day.dateISO)}
                      </div>
                      <div className="text-xs text-[#714958]">
                        Web Orders: <strong>{day.bookedOrdersCount}</strong> ·
                        Offline FB/IG Blocked:{" "}
                        <strong>{day.offlineBlockedCount}</strong>
                        {day.offlineReason ? ` (${day.offlineReason})` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {day.isFull ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold">
                          <ShieldAlert size={13} />
                          <span>3/3 FULL</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                          {day.remainingSlots} / 3 Open
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
