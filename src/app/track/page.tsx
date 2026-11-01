"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  CATEGORIES,
  FLAVORS,
  OrderWorkflowStatus,
  SIZE_METADATA,
  formatPhp,
  formatReadableDate,
} from "@/lib/catalog";
import {
  StoredCakeOrder,
  loadOrders,
  saveOrders,
} from "@/lib/order-store";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const STATUS_META: Record<
  OrderWorkflowStatus,
  { label: string; badgeClass: string; description: string; stepIndex: number }
> = {
  DEPOSIT_PAID_CONFIRMED: {
    label: "Slot Confirmed (₱300 Paid)",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    description:
      "Your ₱300 deposit is verified and 1 of our 3 daily kitchen slots is reserved for your celebration.",
    stepIndex: 1,
  },
  AWAITING_BAKER_QUOTE: {
    label: "Pending Baker Quote Review",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    description:
      "Your slot is held! Our baker is reviewing your custom reference photo / modification notes to confirm the exact total.",
    stepIndex: 1,
  },
  PRICE_ADJUSTED_AWAITING_CUSTOMER: {
    label: "Action Needed: Approve Adjusted Quote",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
    description:
      "Our baker reviewed your custom design details and updated the quote. Please approve below to lock baking prep.",
    stepIndex: 1,
  },
  IN_KITCHEN_PREP: {
    label: "In Kitchen Baking & Chilling",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    description:
      "Your sponge layers are being baked, chilled for structural stability, and hand-piped in our Taytay atelier.",
    stepIndex: 2,
  },
  READY_AWAITING_BALANCE: {
    label: "Ready — Awaiting Remaining Balance",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
    description:
      "Your cake is chilled and boxed! Settle your remaining balance below to unlock Store Pickup or Lalamove dispatch.",
    stepIndex: 3,
  },
  COMPLETED: {
    label: "Fully Settled & Released",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    description:
      "Full balance settled! Ready for Taytay Store Pickup or customer-booked Rizal Lalamove handoff.",
    stepIndex: 4,
  },
};

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [orders, setOrders] = useState<StoredCakeOrder[]>([]);
  const [query, setQuery] = useState("");
  const [activeOrder, setActiveOrder] = useState<StoredCakeOrder | null>(null);
  const [balanceChannel, setBalanceChannel] = useState<
    "GCash" | "Maya" | "QR Ph" | "Card"
  >("GCash");
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadOrders();
    setOrders(loaded);

    const initialCode = codeFromUrl.trim().toUpperCase();
    if (initialCode) {
      setQuery(initialCode);
      const found = loaded.find(
        (o) => o.trackingCode.toUpperCase() === initialCode
      );
      setActiveOrder(found ?? loaded[0] ?? null);
    } else if (loaded.length > 0) {
      setQuery(loaded[0].trackingCode);
      setActiveOrder(loaded[0]);
    }
  }, [codeFromUrl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return;
    const match = orders.find(
      (o) =>
        o.trackingCode.toLowerCase() === cleaned ||
        o.customerPhone.toLowerCase().includes(cleaned) ||
        o.customerName.toLowerCase().includes(cleaned)
    );
    setActiveOrder(match ?? null);
    setActionBanner(
      match ? null : `No order found matching “${query.trim()}”.`
    );
  };

  // Customer Re-Approval Action for `PRICE_ADJUSTED_AWAITING_CUSTOMER`
  const handleApproveAdjustedQuote = () => {
    if (!activeOrder) return;
    const nowISO = new Date().toISOString();
    const updated: StoredCakeOrder = {
      ...activeOrder,
      status: "IN_KITCHEN_PREP",
      auditTimeline: [
        ...activeOrder.auditTimeline,
        {
          id: `ev_cust_approve_${Date.now()}`,
          timestampISO: nowISO,
          actor: "CUSTOMER",
          eventType: "ADJUSTED_QUOTE_APPROVED",
          detail: `Customer approved updated total of ${formatPhp(
            activeOrder.approvedTotalPhp
          )}. Order moved to Kitchen Prep.`,
        },
      ],
    };

    const nextList = orders.map((o) =>
      o.orderId === updated.orderId ? updated : o
    );
    saveOrders(nextList);
    setOrders(nextList);
    setActiveOrder(updated);
    setActionBanner(
      "Updated quote approved! Your cake is now scheduled for Kitchen Prep."
    );
  };

  // PayMongo Remaining Balance Settlement Action for `READY_AWAITING_BALANCE`
  const handlePayRemainingBalance = () => {
    if (!activeOrder || activeOrder.remainingBalancePhp <= 0) return;
    const settledAmount = activeOrder.remainingBalancePhp;
    const nowISO = new Date().toISOString();

    const updated: StoredCakeOrder = {
      ...activeOrder,
      remainingBalancePhp: 0,
      status: "COMPLETED",
      auditTimeline: [
        ...activeOrder.auditTimeline,
        {
          id: `ev_bal_paid_${Date.now()}`,
          timestampISO: nowISO,
          actor: "PAYMONGO_WEBHOOK",
          eventType: "checkout_session.payment.paid (balance)",
          detail: `Verified remaining balance payment of ${formatPhp(
            settledAmount
          )} via ${balanceChannel}. Pickup/Lalamove gate unlocked!`,
        },
      ],
    };

    const nextList = orders.map((o) =>
      o.orderId === updated.orderId ? updated : o
    );
    saveOrders(nextList);
    setOrders(nextList);
    setActiveOrder(updated);
    setActionBanner(
      `Remaining balance of ${formatPhp(
        settledAmount
      )} settled via ${balanceChannel}! Handoff gate unlocked.`
    );
  };

  return (
    <div className="pt-28 sm:pt-32 pb-24 px-6 sm:px-10 md:px-14 lg:px-16 max-w-5xl mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
          <Sparkles size={13} />
          <span>Guest Order Portal · No Login Required</span>
        </span>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#250d16] tracking-tight mt-2">
          Track Your Cake &amp; Settle Balance
        </h1>
        <p className="text-sm sm:text-base text-[#613d4b] mt-2 max-w-2xl">
          Enter your tracking code (e.g. <code className="font-mono font-bold">MC-8492</code>),
          mobile number, or tap any live sample order below to inspect quote
          re-approval and remaining balance settlement.
        </p>
      </div>

      {/* Search Bar + Quick Sample Switcher */}
      <div className="rounded-3xl bg-white border border-[#e5c6d2] p-5 sm:p-6 shadow-sm mb-8">
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#916072]"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Tracking Code (MC-XXXX), Name, or Mobile..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm font-medium text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
            />
          </div>
          <button
            type="submit"
            className="tactile-press px-6 py-3 rounded-2xl bg-[#260e17] hover:bg-[#9e3b5c] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Look Up Order
          </button>
        </form>

        {orders.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-[#f2e2e8] flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#7d5262] font-medium mr-1">
              Quick-switch orders:
            </span>
            {orders.slice(0, 6).map((ord) => {
              const selected = activeOrder?.orderId === ord.orderId;
              return (
                <button
                  key={ord.orderId}
                  type="button"
                  onClick={() => {
                    setActiveOrder(ord);
                    setQuery(ord.trackingCode);
                    setActionBanner(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    selected
                      ? "bg-[#9e3b5c] text-white border-[#9e3b5c]"
                      : "bg-[#fcf7f9] hover:bg-[#f6e5ec] text-[#351521] border-[#e2c2ce]"
                  }`}
                >
                  {ord.trackingCode} ·{" "}
                  {ord.status === "PRICE_ADJUSTED_AWAITING_CUSTOMER"
                    ? "Re-Approve"
                    : ord.status === "READY_AWAITING_BALANCE"
                    ? "Pay Balance"
                    : ord.customerName.split(" ")[0]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {actionBanner && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-900 flex items-center gap-2">
          <CheckCircle2 size={17} className="text-emerald-600 flex-shrink-0" />
          <span>{actionBanner}</span>
        </div>
      )}

      {/* Active Order Detail Card */}
      {activeOrder && (
        <div className="space-y-6">
          {/* Status Banner & 4-Step Progress */}
          <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#f1dfe6]">
              <div>
                <div className="text-xs font-mono text-[#825566]">
                  TRACKING CODE:{" "}
                  <strong className="text-[#250d16]">
                    {activeOrder.trackingCode}
                  </strong>{" "}
                  · ATTEMPT ID: {activeOrder.bookingAttemptId}
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#250d16] mt-1">
                  {CATEGORIES[activeOrder.category].shortName} for{" "}
                  {activeOrder.customerName}
                </h2>
                <p className="text-sm text-[#613d4b] mt-1">
                  {STATUS_META[activeOrder.status].description}
                </p>
              </div>

              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                  STATUS_META[activeOrder.status].badgeClass
                }`}
              >
                {STATUS_META[activeOrder.status].label}
              </span>
            </div>

            {/* 4-Stage Visual Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
              {[
                { step: 1, title: "₱300 Slot Locked" },
                { step: 2, title: "Kitchen Baking" },
                { step: 3, title: "Balance Settlement" },
                { step: 4, title: "Pickup / Lalamove" },
              ].map((st) => {
                const currentStep = STATUS_META[activeOrder.status].stepIndex;
                const done = currentStep >= st.step;
                return (
                  <div
                    key={st.step}
                    className={`rounded-2xl p-3 border text-xs ${
                      done
                        ? "bg-[#fbeaf0] border-[#d99fb3] text-[#250d16]"
                        : "bg-[#faf5f7] border-[#eee0e5] text-[#9c7a87]"
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase">
                      Stage 0{st.step}
                    </div>
                    <div className="font-bold mt-0.5">{st.title}</div>
                  </div>
                );
              })}
            </div>

            {/* INTERACTIVE ACTION 1: CUSTOMER QUOTE RE-APPROVAL */}
            {activeOrder.status === "PRICE_ADJUSTED_AWAITING_CUSTOMER" && (
              <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="text-rose-700 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <h3 className="font-display font-bold text-base text-rose-950">
                      Baker Quote Adjustment Requires Your Approval
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-900 mt-1 leading-relaxed">
                      Previous estimated total:{" "}
                      <span className="line-through">
                        {formatPhp(
                          activeOrder.previousEstimatedTotalPhp ??
                            activeOrder.basePriceSnapshotPhp +
                              activeOrder.addonsSnapshotPhp
                        )}
                      </span>{" "}
                      → Updated baker total:{" "}
                      <strong>{formatPhp(activeOrder.approvedTotalPhp)}</strong>{" "}
                      (Remaining balance after ₱300 deposit:{" "}
                      <strong>
                        {formatPhp(activeOrder.remainingBalancePhp)}
                      </strong>
                      ).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleApproveAdjustedQuote}
                    className="tactile-press px-5 py-2.5 rounded-full bg-[#9e3b5c] hover:bg-[#822a48] text-white text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    Approve {formatPhp(activeOrder.approvedTotalPhp)} Total &amp;
                    Proceed to Baking
                  </button>
                </div>
              </div>
            )}

            {/* INTERACTIVE ACTION 2: PAYMONGO REMAINING BALANCE SETTLEMENT */}
            {activeOrder.status === "READY_AWAITING_BALANCE" &&
              activeOrder.remainingBalancePhp > 0 && (
                <div className="mt-6 rounded-2xl bg-[#260e17] text-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-widest text-pink-200">
                        PayMongo Balance Release Gate
                      </span>
                      <h3 className="font-display text-xl font-bold mt-0.5">
                        Settle Remaining{" "}
                        {formatPhp(activeOrder.remainingBalancePhp)} to Unlock
                        Handoff
                      </h3>
                    </div>
                    <CreditCard size={22} className="text-pink-300" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["GCash", "Maya", "QR Ph", "Card"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setBalanceChannel(ch)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          balanceChannel === ch
                            ? "bg-white text-[#260e17] border-white"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handlePayRemainingBalance}
                    className="tactile-press w-full sm:w-auto px-6 py-3 rounded-full bg-[#d45d85] hover:bg-[#c04870] text-white text-sm font-semibold cursor-pointer shadow-lg"
                  >
                    Pay Remaining {formatPhp(activeOrder.remainingBalancePhp)}{" "}
                    via {balanceChannel} Now
                  </button>
                </div>
              )}
          </div>

          {/* Cake Snapshot + Fulfillment + Audit Timeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Cake & Monetary Snapshot */}
            <div className="md:col-span-6 rounded-3xl bg-white border border-[#e5c6d2] p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#b45373] to-[#df94ae] flex-shrink-0 overflow-hidden p-2">
                  {activeOrder.referenceImageUrl.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeOrder.referenceImageUrl}
                      alt="Custom reference"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Image
                      src={activeOrder.referenceImageUrl}
                      alt={activeOrder.skuId}
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  )}
                </div>
                <div>
                  <div className="text-xs font-mono text-[#855768]">
                    SKU: {activeOrder.skuId}
                  </div>
                  <div className="font-display text-lg font-bold text-[#250d16]">
                    {SIZE_METADATA[activeOrder.size].label} ·{" "}
                    <span className="capitalize">{activeOrder.spongeBase}</span>
                  </div>
                  <div className="text-xs text-[#613d4b]">
                    Interior Flavor:{" "}
                    <strong>
                      {FLAVORS.find((f) => f.code === activeOrder.flavor)
                        ?.name ?? activeOrder.flavor}
                    </strong>
                  </div>
                </div>
              </div>

              {activeOrder.cakeDedication && (
                <div className="rounded-xl bg-[#fcf6f8] border border-[#ecd4dd] px-3.5 py-2.5 text-xs">
                  <span className="text-[#855768]">Cake Dedication: </span>
                  <strong className="text-[#250d16]">
                    “{activeOrder.cakeDedication}”
                  </strong>
                </div>
              )}

              {activeOrder.customDesignInstructions && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-950">
                  <span className="font-semibold">Custom Design Notes: </span>
                  {activeOrder.customDesignInstructions}
                </div>
              )}

              <div className="pt-3 border-t border-[#f1dfe6] space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between text-[#694351]">
                  <span>Base Flyer Price</span>
                  <span>{formatPhp(activeOrder.basePriceSnapshotPhp)}</span>
                </div>
                <div className="flex justify-between text-[#694351]">
                  <span>Add-Ons Snapshot</span>
                  <span>{formatPhp(activeOrder.addonsSnapshotPhp)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#250d16] pt-1">
                  <span>Approved Order Total</span>
                  <span>{formatPhp(activeOrder.approvedTotalPhp)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Deposit Paid ({activeOrder.paymentChannel})</span>
                  <span>-{formatPhp(activeOrder.depositPaidPhp)}</span>
                </div>
                <div className="flex justify-between font-display text-base font-bold text-[#8e3050] pt-1 border-t border-[#f1dfe6]">
                  <span>Remaining Balance Due</span>
                  <span>{formatPhp(activeOrder.remainingBalancePhp)}</span>
                </div>
              </div>
            </div>

            {/* Right: Rizal Handoff & Idempotent Audit Timeline */}
            <div className="md:col-span-6 space-y-6">
              <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-[#250d16]">
                  <MapPin size={16} className="text-[#9e3b5c]" />
                  <span>
                    {activeOrder.fulfillmentMethod === "pickup"
                      ? "Store Pickup · Taytay, Rizal"
                      : `Customer-Booked Lalamove · ${activeOrder.rizalLocality}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#613d4b]">
                  <Clock size={15} className="text-[#9e3b5c]" />
                  <span>
                    {formatReadableDate(activeOrder.eventDateISO)} (
                    {activeOrder.pickupTimeSlot})
                  </span>
                </div>
                <p className="text-xs text-[#784f5e]">
                  Notes: {activeOrder.deliveryLandmarkOrNotes}
                </p>

                {SIZE_METADATA[activeOrder.size].vehicleRequirement ===
                  "car_mpv_required" && (
                  <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-950 flex items-center gap-2">
                    <Car size={15} className="text-amber-700 flex-shrink-0" />
                    <span>
                      Mandatory Car / MPV Lalamove transport for{" "}
                      {SIZE_METADATA[activeOrder.size].label}.
                    </span>
                  </div>
                )}
              </div>

              {/* Webhook & Kitchen Audit Log */}
              <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#8e3050] font-semibold mb-3">
                  <ShieldCheck size={15} />
                  <span>Verified Order &amp; Webhook Audit Log</span>
                </div>
                <ol className="space-y-3">
                  {activeOrder.auditTimeline.map((ev) => (
                    <li
                      key={ev.id}
                      className="text-xs border-l-2 border-[#dfb8c7] pl-3 py-0.5"
                    >
                      <div className="font-mono text-[10px] text-[#885b6b]">
                        {ev.actor} · {ev.eventType}
                      </div>
                      <div className="text-[#2a121b] mt-0.5">{ev.detail}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/#configurator"
          className="text-xs sm:text-sm font-semibold text-[#8e3050] hover:underline"
        >
          ← Return to Marecakes Bespoke Studio
        </Link>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fdf7f8]">
      <Header activeLink="Track Order" forceScrolledStyle={true} />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="pt-36 pb-24 px-6 text-center text-sm text-[#7b5060]">
              Loading Guest Order Tracker...
            </div>
          }
        >
          <TrackOrderContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
