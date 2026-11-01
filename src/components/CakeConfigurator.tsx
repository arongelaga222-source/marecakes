"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ADDON_CUSTOM_TOPPER_PHP,
  ADDON_NUMBER_CANDLE_PHP,
  ATELIER_PICKUP_INFO,
  CANONICAL_PRICE_MATRIX,
  CATALOG_PRESETS,
  CATEGORIES,
  CategoryCode,
  DAILY_KITCHEN_SLOT_LIMIT,
  DEPOSIT_AMOUNT_PHP,
  FLAVORS,
  FlavorCode,
  FulfillmentMethod,
  MIN_ADVANCE_LEAD_DAYS,
  RIZAL_LOCALITIES,
  SIZE_METADATA,
  SizeCode,
  SpongeBase,
  VisionClassificationHint,
  addDaysToISODate,
  calculateOrderPricing,
  ensureValidSelection,
  formatPhp,
  formatReadableDate,
  lookupSkuCell,
  toManilaDateISO,
} from "@/lib/catalog";
import {
  OfflineSlotBlock,
  StoredCakeOrder,
  getSlotStatusForDate,
  loadOfflineBlocks,
  loadOrders,
  saveOrders,
} from "@/lib/order-store";
import { CutawayVisualizer } from "./CutawayVisualizer";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Info,
  Lock,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Store,
  Truck,
  Upload,
} from "lucide-react";

export interface ExternalStudioSelection {
  key: number;
  presetId?: string;
  category?: CategoryCode;
  spongeBase?: SpongeBase;
  size?: SizeCode;
  flavor?: FlavorCode;
}

interface CakeConfiguratorProps {
  externalSelection?: ExternalStudioSelection | null;
  standalonePage?: boolean;
}

const ALL_CATEGORIES: CategoryCode[] = ["coquette", "floral", "birthday"];
const ALL_BASES: SpongeBase[] = ["chiffon", "moist"];
const ALL_SIZES: SizeCode[] = ["6x3", "6x5", "8x3", "8x5", "2-tier"];
const PICKUP_WINDOWS = [
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "1:00 PM – 2:00 PM",
  "2:00 PM – 3:00 PM",
  "3:00 PM – 4:00 PM",
  "4:00 PM – 5:30 PM",
] as const;

const PAYMENT_CHANNELS = ["GCash", "Maya", "QR Ph", "Card"] as const;
type PaymentChannelChoice = (typeof PAYMENT_CHANNELS)[number];

/**
 * Compress & resize uploaded reference photo client-side (`<= 1280px`)
 * to prevent Messenger/Instagram WebView timeouts & memory spikes.
 */
async function compressImageClientSide(file: File): Promise<{
  dataUrl: string;
  originalKb: number;
  compressedKb: number;
  width: number;
  height: number;
}> {
  const originalKb = Math.max(1, Math.round(file.size / 1024));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected image file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Selected file is not a valid image."));
      img.onload = () => {
        const MAX_DIM = 1280;
        let targetW = img.width;
        let targetH = img.height;

        if (targetW > MAX_DIM || targetH > MAX_DIM) {
          if (targetW >= targetH) {
            targetH = Math.round((targetH * MAX_DIM) / targetW);
            targetW = MAX_DIM;
          } else {
            targetW = Math.round((targetW * MAX_DIM) / targetH);
            targetH = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Browser canvas context unavailable."));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        const compressedKb = Math.max(1, Math.round(approxBytes / 1024));

        resolve({
          dataUrl,
          originalKb,
          compressedKb,
          width: targetW,
          height: targetH,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Deterministic enum-only AI Vision Pre-Classifier simulation (`concepts_brief.md` §3).
 * Never invents Peso figures — outputs structured enum hints only.
 */
function classifyUploadedReferenceEnumOnly(
  fileName: string,
  width: number,
  height: number
): VisionClassificationHint {
  const lower = fileName.toLowerCase();
  const isPortraitTall = height > width * 1.12;

  if (lower.includes("floral") || lower.includes("flower") || lower.includes("mom")) {
    return {
      is_cake: true,
      category_code: "floral",
      suggested_tiers: 1,
      needs_manual_quote: true,
      visible_addon_hints: {
        has_custom_topper: false,
        has_number_candle: false,
      },
      confidence_note:
        "Detected botanical buttercream piping → Mapped to Mother's / Floral (Moist 5\" Tall). Final piping complexity reviewed by baker.",
    };
  }

  if (lower.includes("tier") || lower.includes("wedding") || isPortraitTall) {
    return {
      is_cake: true,
      category_code: "birthday",
      suggested_tiers: 2,
      needs_manual_quote: true,
      visible_addon_hints: {
        has_custom_topper: true,
        has_number_candle: false,
      },
      confidence_note:
        "Detected tall / multi-tier celebration proportions → Pre-selected Customized Birthday. Baker will verify exact tier quote.",
    };
  }

  return {
    is_cake: true,
    category_code: "coquette",
    suggested_tiers: 1,
    needs_manual_quote: true,
    visible_addon_hints: {
      has_custom_topper: lower.includes("topper"),
      has_number_candle: lower.includes("candle"),
    },
    confidence_note:
      "Detected single-tier vintage/ribbon silhouette → Pre-selected Coquette base matrix. Subject to baker review.",
  };
}

export function CakeConfigurator({
  externalSelection,
  standalonePage = false,
}: CakeConfiguratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Design Mode & Exterior State
  const [designSource, setDesignSource] = useState<"catalog" | "custom_upload">(
    "catalog"
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    CATALOG_PRESETS[0].id
  );
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    fileName: string;
    originalKb: number;
    compressedKb: number;
    dimensions: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [visionHint, setVisionHint] =
    useState<VisionClassificationHint | null>(null);

  // Canonical 16-Cell Matrix State
  const [category, setCategory] = useState<CategoryCode>("coquette");
  const [spongeBase, setSpongeBase] = useState<SpongeBase>("chiffon");
  const [size, setSize] = useState<SizeCode>("6x5");
  const [flavor, setFlavor] = useState<FlavorCode>("strawberry");

  // Add-ons & Split Text Inputs
  const [includeCustomTopper, setIncludeCustomTopper] = useState(false);
  const [numberCandleCount, setNumberCandleCount] = useState(0);
  const [numberCandleDigits, setNumberCandleDigits] = useState("");
  const [cakeDedication, setCakeDedication] = useState("");
  const [customDesignInstructions, setCustomDesignInstructions] = useState("");

  // Manila Calendar & Store Capacity State (loaded in useEffect for Next.js 16 cacheComponents safety)
  const [todayManilaISO, setTodayManilaISO] = useState<string>("");
  const [calendarViewYearMonth, setCalendarViewYearMonth] = useState<{
    year: number;
    monthZeroIndexed: number;
  } | null>(null);
  const [selectedDateISO, setSelectedDateISO] = useState<string>("");
  const [orders, setOrders] = useState<StoredCakeOrder[]>([]);
  const [offlineBlocks, setOfflineBlocks] = useState<OfflineSlotBlock[]>([]);

  // Fulfillment & Guest Checkout State
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<FulfillmentMethod>("pickup");
  const [rizalLocality, setRizalLocality] = useState<string>(
    RIZAL_LOCALITIES[0].name
  );
  const [deliveryLandmarkOrNotes, setDeliveryLandmarkOrNotes] = useState("");
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>(
    PICKUP_WINDOWS[2]
  );
  const [carMpvAcknowledged, setCarMpvAcknowledged] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMessengerOrEmail, setCustomerMessengerOrEmail] = useState("");
  const [paymentChannel, setPaymentChannel] =
    useState<PaymentChannelChoice>("GCash");

  // Feedback & Confirmation Modal State
  const [studioToast, setStudioToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [confirmedOrder, setConfirmedOrder] =
    useState<StoredCakeOrder | null>(null);

  // Hydrate Asia/Manila date & local order store strictly on client mount
  useEffect(() => {
    const syncStore = () => {
      const nowManila = toManilaDateISO(new Date());
      setTodayManilaISO(nowManila);
      const loadedOrders = loadOrders();
      const loadedBlocks = loadOfflineBlocks();
      setOrders(loadedOrders);
      setOfflineBlocks(loadedBlocks);

      // Pick earliest available date >= today + 7 days
      setSelectedDateISO((prev) => {
        if (prev) return prev;
        for (let offset = MIN_ADVANCE_LEAD_DAYS; offset <= 45; offset++) {
          const candidate = addDaysToISODate(nowManila, offset);
          const st = getSlotStatusForDate(
            candidate,
            loadedOrders,
            loadedBlocks,
            nowManila
          );
          if (!st.isFull && !st.isPastLeadTime) {
            const [y, m] = candidate.split("-").map(Number);
            setCalendarViewYearMonth({ year: y, monthZeroIndexed: m - 1 });
            return candidate;
          }
        }
        const fallback = addDaysToISODate(nowManila, MIN_ADVANCE_LEAD_DAYS);
        const [fy, fm] = fallback.split("-").map(Number);
        setCalendarViewYearMonth({ year: fy, monthZeroIndexed: fm - 1 });
        return fallback;
      });
    };

    syncStore();
    window.addEventListener("marecakes-store-updated", syncStore);
    return () =>
      window.removeEventListener("marecakes-store-updated", syncStore);
  }, []);

  // Apply external preset / SKU selections from Hero, Craft, or Catalog cards
  useEffect(() => {
    if (!externalSelection) return;

    if (externalSelection.presetId) {
      const preset = CATALOG_PRESETS.find(
        (p) => p.id === externalSelection.presetId
      );
      if (preset) {
        const valid = ensureValidSelection(
          preset.category,
          preset.defaultBase,
          preset.defaultSize
        );
        setDesignSource("catalog");
        setSelectedPresetId(preset.id);
        setCategory(preset.category);
        setSpongeBase(valid.spongeBase);
        setSize(valid.size);
        setFlavor(preset.defaultFlavor);
        setStudioToast(`Loaded “${preset.title}” into Studio`);
      }
    } else {
      const nextCat = externalSelection.category ?? category;
      const nextBase = externalSelection.spongeBase ?? spongeBase;
      const nextSize = externalSelection.size ?? size;
      const valid = ensureValidSelection(nextCat, nextBase, nextSize);

      setCategory(nextCat);
      setSpongeBase(valid.spongeBase);
      setSize(valid.size);
      if (externalSelection.flavor) {
        setFlavor(externalSelection.flavor);
      }
      setStudioToast(
        `Configured ${CATEGORIES[nextCat].shortName} (${valid.spongeBase.toUpperCase()} · ${valid.size.toUpperCase()})`
      );
    }

    const timer = setTimeout(() => setStudioToast(null), 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSelection?.key]);

  // Ensure canonical validity at all times
  const validResolved = useMemo(
    () => ensureValidSelection(category, spongeBase, size),
    [category, spongeBase, size]
  );

  const isCustomOrModified =
    designSource === "custom_upload" ||
    customDesignInstructions.trim().length > 0;

  const pricing = useMemo(
    () =>
      calculateOrderPricing({
        category,
        spongeBase: validResolved.spongeBase,
        size: validResolved.size,
        includeCustomTopper,
        numberCandleCount,
        isCustomPhotoOrInstructions: isCustomOrModified,
      }),
    [
      category,
      validResolved.spongeBase,
      validResolved.size,
      includeCustomTopper,
      numberCandleCount,
      isCustomOrModified,
    ]
  );

  const sizeMeta = SIZE_METADATA[validResolved.size];
  const requiresCarAck =
    fulfillmentMethod === "lalamove" &&
    sizeMeta.vehicleRequirement === "car_mpv_required";

  const activePreset =
    CATALOG_PRESETS.find((p) => p.id === selectedPresetId) ??
    CATALOG_PRESETS[0];

  const activeReferenceImage =
    designSource === "custom_upload" && uploadedPhotoUrl
      ? uploadedPhotoUrl
      : CATEGORIES[category].heroImage;

  const selectedLocalityInfo =
    RIZAL_LOCALITIES.find((l) => l.name === rizalLocality) ??
    RIZAL_LOCALITIES[0];

  // Switch Category cleanly while preserving valid base & size
  const handleSelectCategory = (nextCat: CategoryCode) => {
    const resolved = ensureValidSelection(
      nextCat,
      validResolved.spongeBase,
      validResolved.size
    );
    setCategory(nextCat);
    setSpongeBase(resolved.spongeBase);
    setSize(resolved.size);
  };

  const handleSelectBase = (nextBase: SpongeBase) => {
    const resolved = ensureValidSelection(
      category,
      nextBase,
      validResolved.size
    );
    setSpongeBase(resolved.spongeBase);
    setSize(resolved.size);
  };

  const handleSelectSize = (nextSize: SizeCode) => {
    const cell = lookupSkuCell(category, validResolved.spongeBase, nextSize);
    if (!cell) return;
    setSize(nextSize);
  };

  // Handle Custom Reference Photo Upload (`<= 1280px` client-side resize + Enum AI Classifier)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid JPG, PNG, or WebP cake reference photo.");
      return;
    }

    try {
      setIsAnalyzingUpload(true);
      const compressed = await compressImageClientSide(file);
      setUploadedPhotoUrl(compressed.dataUrl);
      setUploadStats({
        fileName: file.name,
        originalKb: compressed.originalKb,
        compressedKb: compressed.compressedKb,
        dimensions: `${compressed.width}×${compressed.height}px`,
      });
      setDesignSource("custom_upload");

      // Simulate brief structured JSON-enum vision classification
      await new Promise((r) => setTimeout(r, 450));
      const hint = classifyUploadedReferenceEnumOnly(
        file.name,
        compressed.width,
        compressed.height
      );
      setVisionHint(hint);

      const suggestedSize: SizeCode =
        hint.suggested_tiers === 2 ? "2-tier" : "6x5";
      const valid = ensureValidSelection(
        hint.category_code,
        validResolved.spongeBase,
        suggestedSize
      );
      setCategory(hint.category_code);
      setSpongeBase(valid.spongeBase);
      setSize(valid.size);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Unable to process reference photo."
      );
    } finally {
      setIsAnalyzingUpload(false);
    }
  };

  // Build Calendar Grid for `calendarViewYearMonth`
  const calendarDays = useMemo(() => {
    if (!calendarViewYearMonth || !todayManilaISO) return [];
    const { year, monthZeroIndexed } = calendarViewYearMonth;
    const firstDayOfWeek = new Date(
      Date.UTC(year, monthZeroIndexed, 1)
    ).getUTCDay();
    const daysInMonth = new Date(
      Date.UTC(year, monthZeroIndexed + 1, 0)
    ).getUTCDate();

    const cells: Array<
      | { kind: "empty"; key: string }
      | {
          kind: "day";
          dateISO: string;
          dayNumber: number;
          status: ReturnType<typeof getSlotStatusForDate>;
        }
    > = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ kind: "empty", key: `pad-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(monthZeroIndexed + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const iso = `${year}-${mStr}-${dStr}`;
      cells.push({
        kind: "day",
        dateISO: iso,
        dayNumber: d,
        status: getSlotStatusForDate(
          iso,
          orders,
          offlineBlocks,
          todayManilaISO
        ),
      });
    }
    return cells;
  }, [calendarViewYearMonth, todayManilaISO, orders, offlineBlocks]);

  const calendarMonthLabel = useMemo(() => {
    if (!calendarViewYearMonth) return "Loading Manila Calendar...";
    const dt = new Date(
      Date.UTC(
        calendarViewYearMonth.year,
        calendarViewYearMonth.monthZeroIndexed,
        1
      )
    );
    return new Intl.DateTimeFormat("en-PH", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(dt);
  }, [calendarViewYearMonth]);

  const shiftCalendarMonth = (delta: number) => {
    setCalendarViewYearMonth((prev) => {
      if (!prev) return prev;
      const dt = new Date(
        Date.UTC(prev.year, prev.monthZeroIndexed + delta, 1)
      );
      return {
        year: dt.getUTCFullYear(),
        monthZeroIndexed: dt.getUTCMonth(),
      };
    });
  };

  // Reserve Slot & Simulate Idempotent PayMongo ₱300 Deposit Checkout
  const handleReserveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDateISO) {
      setFormError("Please select an available celebration date on the calendar.");
      return;
    }

    const slotCheck = getSlotStatusForDate(
      selectedDateISO,
      orders,
      offlineBlocks,
      todayManilaISO || undefined
    );
    if (slotCheck.isPastLeadTime) {
      setFormError(
        `Marecakes requires at least ${MIN_ADVANCE_LEAD_DAYS} days advance lead time (Asia/Manila).`
      );
      return;
    }
    if (slotCheck.isFull) {
      setFormError(
        "That date just reached our 3-cake daily limit. Please pick another date."
      );
      return;
    }

    if (designSource === "custom_upload" && !uploadedPhotoUrl) {
      setFormError(
        "Please upload your custom cake reference photo or switch back to Signature Catalog mode."
      );
      return;
    }

    if (requiresCarAck && !carMpvAcknowledged) {
      setFormError(
        `Please acknowledge the mandatory Lalamove Car / MPV transport requirement for ${sizeMeta.label} cakes.`
      );
      return;
    }

    if (customerName.trim().length < 2) {
      setFormError("Please enter your full name for pickup/Lalamove handoff.");
      return;
    }
    if (customerPhone.trim().length < 7) {
      setFormError("Please enter a valid mobile number so our kitchen can text updates.");
      return;
    }

    setIsProcessingCheckout(true);
    await new Promise((r) => setTimeout(r, 750));

    const now = new Date();
    const randomCode = String(Math.floor(1000 + Math.random() * 9000));
    const trackingCode = `MC-${randomCode}`;
    const bookingAttemptId = `ba_${now.getTime().toString(36).toUpperCase()}`;

    const initialStatus = pricing.requiresBakerReview
      ? "AWAITING_BAKER_QUOTE"
      : "DEPOSIT_PAID_CONFIRMED";

    const newOrder: StoredCakeOrder = {
      orderId: `ord_${now.getTime()}`,
      trackingCode,
      bookingAttemptId,
      createdAtISO: now.toISOString(),
      eventDateISO: selectedDateISO,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerMessengerOrEmail:
        customerMessengerOrEmail.trim() || "Guest Checkout",
      designSource,
      catalogPresetId:
        designSource === "catalog" ? selectedPresetId : undefined,
      referenceImageUrl: activeReferenceImage,
      visionClassification:
        designSource === "custom_upload" && visionHint ? visionHint : undefined,
      skuId: pricing.skuId,
      category,
      spongeBase: validResolved.spongeBase,
      size: validResolved.size,
      flavor,
      includeCustomTopper,
      numberCandleCount,
      numberCandleDigits: numberCandleDigits.trim(),
      cakeDedication: cakeDedication.trim(),
      customDesignInstructions: customDesignInstructions.trim(),
      fulfillmentMethod,
      rizalLocality:
        fulfillmentMethod === "pickup" ? "Taytay (Store Pickup)" : rizalLocality,
      deliveryLandmarkOrNotes:
        fulfillmentMethod === "pickup"
          ? ATELIER_PICKUP_INFO.landmark
          : deliveryLandmarkOrNotes.trim() || `${rizalLocality}, Rizal`,
      pickupTimeSlot,
      basePriceSnapshotPhp: pricing.basePricePhp,
      addonsSnapshotPhp: pricing.topperAddonPhp + pricing.candlesAddonPhp,
      approvedTotalPhp: pricing.estimatedTotalPhp,
      depositPaidPhp: DEPOSIT_AMOUNT_PHP,
      remainingBalancePhp: pricing.remainingBalancePhp,
      paymentChannel,
      status: initialStatus,
      auditTimeline: [
        {
          id: `ev_${now.getTime()}_1`,
          timestampISO: now.toISOString(),
          actor: "CUSTOMER",
          eventType: "SLOT_HOLD_ACQUIRED",
          detail: `15-min slot hold (${bookingAttemptId}) acquired for ${selectedDateISO} (Asia/Manila).`,
        },
        ...(designSource === "custom_upload" && visionHint
          ? [
              {
                id: `ev_${now.getTime()}_ai`,
                timestampISO: now.toISOString(),
                actor: "VISION_CLASSIFIER" as const,
                eventType: "AI_ENUM_CLASSIFIED",
                detail: `Enum classification: category=${visionHint.category_code}, tiers=${visionHint.suggested_tiers}, needs_manual_quote=true.`,
              },
            ]
          : []),
        {
          id: `ev_${now.getTime()}_2`,
          timestampISO: now.toISOString(),
          actor: "PAYMONGO_WEBHOOK",
          eventType: "checkout_session.payment.paid",
          detail: pricing.requiresBakerReview
            ? `Verified ₱300 ${paymentChannel} deposit. Slot reserved & routed to Baker Review Queue.`
            : `Verified idempotent webhook (₱300 ${paymentChannel} deposit). Catalog cake confirmed immediately!`,
        },
      ],
    };

    const updatedOrders = [newOrder, ...orders];
    saveOrders(updatedOrders);
    setOrders(updatedOrders);
    setConfirmedOrder(newOrder);
    setIsProcessingCheckout(false);
  };

  return (
    <section
      id="configurator"
      className={`${
        standalonePage ? "pt-28 pb-24" : "py-20 sm:py-28"
      } px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 bg-[#fdf7f8] text-[#2a121b] relative`}
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Top Studio Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
              <Sparkles size={13} />
              <span>Interactive Bespoke Cake Studio</span>
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#250d16] tracking-tight mt-2">
              Design Your Cake & Lock a Kitchen Slot
            </h2>
            <p className="text-[#613d4b] text-base sm:text-lg max-w-2xl mt-2">
              Every selection maps deterministically to our 16-SKU flyer menu.
              Reserve any open date with a{" "}
              <strong>{formatPhp(DEPOSIT_AMOUNT_PHP)}</strong> deposit—no
              account signup required.
            </p>
          </div>

          {studioToast && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2b101b] text-white text-xs sm:text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <CheckCircle2 size={15} className="text-emerald-300" />
              <span>{studioToast}</span>
            </div>
          )}
        </div>

        {/* Main 12-Column Asymmetric Studio Layout */}
        <form
          onSubmit={handleReserveSlot}
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 items-start"
        >
          {/* LEFT / STICKY STAGE (5 cols on XL): Live Dual Exterior + Cutaway Visualizer & Price Receipt */}
          <div className="xl:col-span-5 xl:sticky xl:top-24 space-y-6">
            <CutawayVisualizer
              designSource={designSource}
              referenceImageUrl={activeReferenceImage}
              referenceTitle={activePreset.title}
              visionHint={visionHint}
              category={category}
              spongeBase={validResolved.spongeBase}
              size={validResolved.size}
              flavor={flavor}
              includeCustomTopper={includeCustomTopper}
              numberCandleCount={numberCandleCount}
              numberCandleDigits={numberCandleDigits}
              cakeDedication={cakeDedication}
            />

            {/* Live Whole-Peso Ledger Summary Card */}
            <div className="rounded-3xl bg-[#260e17] text-white p-6 shadow-xl border border-[#492030]">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/12">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-pink-200/80">
                    Immutable Order Snapshot
                  </div>
                  <div className="font-display text-lg font-bold">
                    SKU: {pricing.skuId}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    pricing.requiresBakerReview
                      ? "bg-amber-400/20 text-amber-200 border border-amber-300/30"
                      : "bg-emerald-400/20 text-emerald-200 border border-emerald-300/30"
                  }`}
                >
                  {pricing.requiresBakerReview
                    ? "Baker Quote Review"
                    : "Instant Confirmation"}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-white/85">
                  <span>
                    {CATEGORIES[category].shortName} (
                    {validResolved.spongeBase === "chiffon"
                      ? "Chiffon"
                      : "Moist"}{" "}
                    · {sizeMeta.label})
                  </span>
                  <span className="font-semibold">
                    {formatPhp(pricing.basePricePhp)}
                  </span>
                </div>

                {pricing.topperAddonPhp > 0 && (
                  <div className="flex items-center justify-between text-white/80 text-xs">
                    <span>+ Custom Keepsake Topper</span>
                    <span>{formatPhp(pricing.topperAddonPhp)}</span>
                  </div>
                )}

                {pricing.candlesAddonPhp > 0 && (
                  <div className="flex items-center justify-between text-white/80 text-xs">
                    <span>
                      + Number Candles ({numberCandleCount} ×{" "}
                      {formatPhp(ADDON_NUMBER_CANDLE_PHP)})
                    </span>
                    <span>{formatPhp(pricing.candlesAddonPhp)}</span>
                  </div>
                )}

                <div className="pt-3 mt-2 border-t border-white/15 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-pink-200/85">
                    {pricing.requiresBakerReview
                      ? "Estimated Base Total"
                      : "Approved Order Total"}
                  </span>
                  <span className="font-display text-2xl font-bold text-white">
                    {formatPhp(pricing.estimatedTotalPhp)}
                  </span>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold text-pink-100">
                    <span>Deposit Due Now to Lock Slot</span>
                    <span className="text-base text-white">
                      {formatPhp(pricing.depositDueNowPhp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Remaining Balance (Before Release)</span>
                    <span>{formatPhp(pricing.remainingBalancePhp)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHTBUILDER STEPS (7 cols on XL) */}
          <div className="xl:col-span-7 space-y-7">
            {/* STEP 1: EXTERIOR DESIGN SOURCE (Catalog vs Upload Reference Photo) */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                    Step 01 · Exterior Reference
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#250d16]">
                    Choose a Signature Design or Upload an Inspo Photo
                  </h3>
                </div>
              </div>

              {/* Segmented Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setDesignSource("catalog")}
                  className={`tactile-press p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    designSource === "catalog"
                      ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md"
                      : "bg-[#fcf7f9] hover:bg-[#f7e8ee] text-[#351521] border-[#e4c6d1]"
                  }`}
                >
                  <div className="font-display font-bold text-sm">
                    Signature Marecakes Catalog
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      designSource === "catalog"
                        ? "text-pink-100/85"
                        : "text-[#6e4756]"
                    }`}
                  >
                    Instant slot confirmation with ₱300 deposit
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDesignSource("custom_upload")}
                  className={`tactile-press p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    designSource === "custom_upload"
                      ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md"
                      : "bg-[#fcf7f9] hover:bg-[#f7e8ee] text-[#351521] border-[#e4c6d1]"
                  }`}
                >
                  <div className="font-display font-bold text-sm flex items-center gap-1.5">
                    <Upload size={14} />
                    <span>Upload Custom Reference Photo</span>
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      designSource === "custom_upload"
                        ? "text-pink-100/85"
                        : "text-[#6e4756]"
                    }`}
                  >
                    Client-side ≤1280px resize + Baker Quote Review
                  </div>
                </button>
              </div>

              {designSource === "catalog" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATALOG_PRESETS.map((preset) => {
                    const active = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          const valid = ensureValidSelection(
                            preset.category,
                            preset.defaultBase,
                            preset.defaultSize
                          );
                          setCategory(preset.category);
                          setSpongeBase(valid.spongeBase);
                          setSize(valid.size);
                          setFlavor(preset.defaultFlavor);
                        }}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? "bg-[#fbe9f0] border-[#a64264] ring-1 ring-[#a64264]/30"
                            : "bg-white hover:bg-[#fdf6f8] border-[#ead1da]"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-[#260e17]">
                            {preset.title}
                          </div>
                          <div className="text-[11px] text-[#784f5e]">
                            {CATEGORIES[preset.category].shortName} ·{" "}
                            {preset.defaultSize.toUpperCase()}
                          </div>
                        </div>
                        {active && (
                          <Check
                            size={15}
                            className="text-[#9e3b5c] flex-shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#d9aebf] bg-[#fdf6f9] p-5 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="tactile-press inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#9e3b5c] hover:bg-[#852d4b] text-white text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
                  >
                    <Upload size={15} />
                    <span>
                      {uploadedPhotoUrl
                        ? "Replace Reference Photo"
                        : "Select Cake Photo from Phone / Gallery"}
                    </span>
                  </button>

                  <p className="text-xs text-[#6d4554] mt-2.5">
                    Automatically downscaled client-side to ≤1280px so Messenger
                    &amp; Instagram browsers upload smoothly even on mobile data.
                  </p>

                  {isAnalyzingUpload && (
                    <div className="mt-3 text-xs font-medium text-[#9e3b5c] animate-pulse">
                      Compressing photo &amp; running structured enum
                      classification...
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {uploadError}
                    </div>
                  )}

                  {uploadStats && (
                    <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono bg-white border border-[#e5c7d2] px-3.5 py-1.5 rounded-full text-[#4a2231]">
                      <span>{uploadStats.fileName}</span>
                      <span>·</span>
                      <span>
                        {uploadStats.originalKb} KB →{" "}
                        <strong className="text-emerald-700">
                          {uploadStats.compressedKb} KB
                        </strong>{" "}
                        ({uploadStats.dimensions})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: CANONICAL 16-CELL MATRIX (Category -> Sponge Base -> Size -> 7 Flavors) */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                  Step 02 · Architecture & Interior Flavor
                </span>
                <h3 className="font-display text-xl font-bold text-[#250d16]">
                  Configure Category, Sponge, Tier Size &amp; Flavor
                </h3>
              </div>

              {/* 2A. Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655] mb-2">
                  Design Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ALL_CATEGORIES.map((catCode) => {
                    const cat = CATEGORIES[catCode];
                    const active = category === catCode;
                    return (
                      <button
                        key={catCode}
                        type="button"
                        onClick={() => handleSelectCategory(catCode)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          active
                            ? "bg-[#fbeaf0] border-[#a64264] ring-1 ring-[#a64264]/30"
                            : "bg-[#fcf8f9] hover:bg-[#f7eaef] border-[#e5c8d3]"
                        }`}
                      >
                        <div className="font-display font-bold text-sm text-[#250d16]">
                          {cat.shortName}
                        </div>
                        <div className="text-[11px] text-[#7a4e5e] mt-0.5">
                          From {formatPhp(cat.startingPricePhp)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2B. Sponge Base */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6e4655]">
                    Sponge Crumb Base
                  </label>
                  {category === "floral" && (
                    <span className="text-[11px] text-[#9e3b5c] font-medium">
                      Mother&apos;s / Floral requires Moist sponge for floral weight
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ALL_BASES.map((base) => {
                    const allowed = CANONICAL_PRICE_MATRIX.some(
                      (c) => c.category === category && c.spongeBase === base
                    );
                    const active = validResolved.spongeBase === base;
                    return (
                      <button
                        key={base}
                        type="button"
                        disabled={!allowed}
                        onClick={() => handleSelectBase(base)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          !allowed
                            ? "bg-[#f6f1f3] text-[#b89fa8] border-[#ece0e5] cursor-not-allowed"
                            : active
                            ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm cursor-pointer"
                            : "bg-white hover:bg-[#faeef2] text-[#2a121b] border-[#e3c4cf] cursor-pointer"
                        }`}
                      >
                        <div className="font-display font-bold text-sm capitalize">
                          {base} Sponge
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            !allowed
                              ? "text-[#b89fa8]"
                              : active
                              ? "text-pink-100/80"
                              : "text-[#754c5b]"
                          }`}
                        >
                          {base === "chiffon"
                            ? "Light, airy whipped meringue lift"
                            : "Rich, dense velvet crumb saturation"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2C. Canonical Size Matrix */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655] mb-2">
                  Tier Size &amp; Flyer Price
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {ALL_SIZES.map((sz) => {
                    const cell = lookupSkuCell(
                      category,
                      validResolved.spongeBase,
                      sz
                    );
                    const active = validResolved.size === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={!cell}
                        onClick={() => handleSelectSize(sz)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                          !cell
                            ? "bg-[#f8f3f5] text-[#c2aab3] border-[#efe3e8] cursor-not-allowed"
                            : active
                            ? "bg-[#9e3b5c] text-white border-[#9e3b5c] shadow-md cursor-pointer"
                            : "bg-white hover:bg-[#fbeaf0] text-[#2a121b] border-[#e3c4cf] cursor-pointer"
                        }`}
                      >
                        <span className="text-xs font-bold uppercase">
                          {sz}
                        </span>
                        <span
                          className={`text-sm font-display font-bold mt-0.5 ${
                            !cell
                              ? "text-[#c2aab3]"
                              : active
                              ? "text-white"
                              : "text-[#8e3050]"
                          }`}
                        >
                          {cell ? formatPhp(cell.pricePhp) : "N/A"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2D. 7 Official Interior Flavors */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655] mb-2">
                  Interior Cake Flavor (All 7 Included in Base Price)
                </label>
                <div className="flex flex-wrap gap-2">
                  {FLAVORS.map((flv) => {
                    const active = flavor === flv.code;
                    return (
                      <button
                        key={flv.code}
                        type="button"
                        onClick={() => setFlavor(flv.code)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm"
                            : "bg-[#fcf7f9] hover:bg-[#f6e4ec] text-[#351521] border-[#e2c2ce]"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-black/15"
                          style={{ backgroundColor: flv.spongeColorHex }}
                        />
                        <span>{flv.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 3: ADD-ONS & SPLIT PERSONALIZATION INPUTS */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm space-y-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                  Step 03 · Finishing Touches &amp; Dedication
                </span>
                <h3 className="font-display text-xl font-bold text-[#250d16]">
                  Optional Add-Ons &amp; Cake Greeting
                </h3>
              </div>

              {/* Birthday Bundled Topper Double-Charge Guard */}
              {CATEGORIES[category].bundlesPrintedTopper && (
                <div className="rounded-2xl bg-[#fae8ef] border border-[#e7bfd0] p-3.5 flex items-start gap-2.5 text-xs text-[#73233f]">
                  <Gift size={16} className="flex-shrink-0 mt-0.5 text-[#9e3b5c]" />
                  <div>
                    <strong>Bundled Topper Protection:</strong> Customized
                    Birthday Cakes already include printed theme toppers in the
                    base price! Only toggle the{" "}
                    <strong>+{formatPhp(ADDON_CUSTOM_TOPPER_PHP)}</strong>{" "}
                    add-on below if you want an extra custom acrylic/keepsake
                    name topper.
                  </div>
                </div>
              )}

              {/* 2 Official Add-Ons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-[#e4c5d0] bg-[#fcf8f9] cursor-pointer hover:border-[#a64264] transition-colors">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={includeCustomTopper}
                      onChange={(e) => setIncludeCustomTopper(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#9e3b5c] rounded"
                    />
                    <div>
                      <div className="text-sm font-bold text-[#250d16]">
                        Customized Acrylic Topper
                      </div>
                      <div className="text-xs text-[#6f4756]">
                        Bespoke laser-cut / keepsake plaque
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#8e3050] whitespace-nowrap">
                    +{formatPhp(ADDON_CUSTOM_TOPPER_PHP)}
                  </span>
                </label>

                <div className="p-4 rounded-2xl border border-[#e4c5d0] bg-[#fcf8f9] flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#250d16]">
                        Number Candles
                      </div>
                      <div className="text-xs text-[#6f4756]">
                        {formatPhp(ADDON_NUMBER_CANDLE_PHP)} each (up to 4)
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white border border-[#e2c2ce] rounded-full px-2 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          setNumberCandleCount((c) => Math.max(0, c - 1))
                        }
                        className="w-6 h-6 rounded-full hover:bg-[#f6e4ec] flex items-center justify-center text-[#351521] cursor-pointer"
                        aria-label="Remove number candle"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">
                        {numberCandleCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNumberCandleCount((c) => Math.min(4, c + 1))
                        }
                        className="w-6 h-6 rounded-full hover:bg-[#f6e4ec] flex items-center justify-center text-[#351521] cursor-pointer"
                        aria-label="Add number candle"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {numberCandleCount > 0 && (
                    <input
                      type="text"
                      maxLength={4}
                      value={numberCandleDigits}
                      onChange={(e) => setNumberCandleDigits(e.target.value)}
                      placeholder="Which digits? (e.g. 24)"
                      className="mt-1 w-full px-3 py-1.5 rounded-lg bg-white border border-[#dfc0cc] text-xs text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                    />
                  )}
                </div>
              </div>

              {/* Split Text Inputs (Dedication vs Custom Design Instructions) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="cake-dedication"
                      className="text-xs font-bold text-[#250d16]"
                    >
                      Cake Dedication / Greeting (Free)
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Instant Confirm
                    </span>
                  </div>
                  <input
                    id="cake-dedication"
                    type="text"
                    maxLength={42}
                    value={cakeDedication}
                    onChange={(e) => setCakeDedication(e.target.value)}
                    placeholder="e.g. Happy 24th Birthday Bea!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#e2c2ce] text-sm text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                  <p className="text-[11px] text-[#784f5e] mt-1">
                    Piped on cake or board ({cakeDedication.length}/42 chars).
                    No manual quote delay!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="custom-instructions"
                      className="text-xs font-bold text-[#250d16]"
                    >
                      Custom Design Modifications (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                      Triggers Baker Review
                    </span>
                  </div>
                  <input
                    id="custom-instructions"
                    type="text"
                    maxLength={140}
                    value={customDesignInstructions}
                    onChange={(e) =>
                      setCustomDesignInstructions(e.target.value)
                    }
                    placeholder="Leave blank for standard catalog design..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#e2c2ce] text-sm text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                  <p className="text-[11px] text-[#784f5e] mt-1">
                    Use only if requesting color changes or extra sculpted
                    elements.
                  </p>
                </div>
              </div>
            </div>

            {/* STEP 4: ASIA/MANILA 3-SLOT CALENDAR & RIZAL FULFILLMENT */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                    Step 04 · Manila Slot Calendar &amp; Rizal Handoff
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#250d16]">
                    Reserve 1 of {DAILY_KITCHEN_SLOT_LIMIT} Daily Slots (
                    {MIN_ADVANCE_LEAD_DAYS}-Day Lead Time)
                  </h3>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#f8e8ee] text-[#842d4b]">
                  Asia/Manila (UTC+8)
                </span>
              </div>

              {/* Monthly Calendar Picker */}
              <div className="rounded-2xl border border-[#ead0da] bg-[#fdf9fa] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(-1)}
                    className="p-2 rounded-full hover:bg-[#f3dfe7] text-[#351521] transition-colors cursor-pointer"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="font-display font-bold text-base sm:text-lg text-[#250d16] flex items-center gap-2">
                    <CalendarIcon size={16} className="text-[#9e3b5c]" />
                    <span>{calendarMonthLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(1)}
                    className="p-2 rounded-full hover:bg-[#f3dfe7] text-[#351521] transition-colors cursor-pointer"
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-mono uppercase text-[#885c6c] mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div key={d}>{d}</div>
                    )
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((cell) => {
                    if (cell.kind === "empty") {
                      return <div key={cell.key} className="h-14" />;
                    }
                    const { dateISO, dayNumber, status } = cell;
                    const disabled = status.isPastLeadTime || status.isFull;
                    const isSelected = selectedDateISO === dateISO;

                    return (
                      <button
                        key={dateISO}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedDateISO(dateISO)}
                        title={
                          status.isPastLeadTime
                            ? `Requires ${MIN_ADVANCE_LEAD_DAYS}-day advance lead time`
                            : status.isFull
                            ? status.offlineReason || "All 3 kitchen slots full"
                            : `${status.remainingSlots} of 3 slots available`
                        }
                        className={`h-14 sm:h-16 rounded-xl border p-1 flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md scale-[1.02]"
                            : disabled
                            ? "bg-[#f4ecef]/65 text-[#bca3ad] border-transparent cursor-not-allowed"
                            : "bg-white hover:border-[#a64264] hover:bg-[#fbeaf0] text-[#250d16] border-[#ead1da] cursor-pointer"
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold leading-none">
                          {dayNumber}
                        </span>
                        <span
                          className={`text-[9px] sm:text-[10px] mt-1 font-medium leading-none ${
                            isSelected
                              ? "text-emerald-300"
                              : status.isPastLeadTime
                              ? "text-[#c4aeb7]"
                              : status.isFull
                              ? "text-rose-700 font-semibold"
                              : status.remainingSlots === 1
                              ? "text-amber-700 font-semibold"
                              : "text-emerald-700"
                          }`}
                        >
                          {status.isPastLeadTime
                            ? "Lead"
                            : status.isFull
                            ? "FULL"
                            : `${status.remainingSlots}/3 left`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedDateISO && (
                  <div className="mt-3 pt-3 border-t border-[#eed9e1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5f3b49]">
                    <span>
                      Selected Event Date:{" "}
                      <strong className="text-[#250d16]">
                        {formatReadableDate(selectedDateISO)}
                      </strong>
                    </span>
                    <span className="text-[#8e3050] font-medium">
                      15-minute slot hold locks upon checkout
                    </span>
                  </div>
                )}
              </div>

              {/* Rizal Fulfillment Method: Store Pickup vs 14-Locality Lalamove */}
              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655]">
                  Fulfillment Method (Rizal Province Scope)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("pickup")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      fulfillmentMethod === "pickup"
                        ? "bg-[#fbeaf0] border-[#a64264] ring-1 ring-[#a64264]/30"
                        : "bg-[#fcf8f9] hover:bg-[#f6e7ed] border-[#e4c5d0]"
                    }`}
                  >
                    <Store
                      size={18}
                      className="text-[#9e3b5c] flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-display font-bold text-sm text-[#250d16]">
                        Store Pickup · {ATELIER_PICKUP_INFO.municipality}
                      </div>
                      <div className="text-xs text-[#6c4554] mt-0.5">
                        {ATELIER_PICKUP_INFO.landmark}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod("lalamove")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      fulfillmentMethod === "lalamove"
                        ? "bg-[#fbeaf0] border-[#a64264] ring-1 ring-[#a64264]/30"
                        : "bg-[#fcf8f9] hover:bg-[#f6e7ed] border-[#e4c5d0]"
                    }`}
                  >
                    <Truck
                      size={18}
                      className="text-[#9e3b5c] flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <div className="font-display font-bold text-sm text-[#250d16]">
                        Customer-Booked Lalamove (Rizal)
                      </div>
                      <div className="text-xs text-[#6c4554] mt-0.5">
                        Covers all 14 Rizal localities · Courier fee paid to
                        driver
                      </div>
                    </div>
                  </button>
                </div>

                {fulfillmentMethod === "pickup" ? (
                  <div className="rounded-2xl bg-[#fcf7f9] border border-[#ead0da] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-[#5f3b49] space-y-1">
                      <div className="font-bold text-[#250d16] flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#9e3b5c]" />
                        <span>{ATELIER_PICKUP_INFO.landmark}</span>
                      </div>
                      <p>{ATELIER_PICKUP_INFO.hours}</p>
                      <p className="text-[#855768]">{ATELIER_PICKUP_INFO.note}</p>
                    </div>

                    <div className="sm:w-56 flex-shrink-0">
                      <label className="block text-[11px] font-semibold uppercase text-[#754b5a] mb-1">
                        Preferred Pickup Window
                      </label>
                      <select
                        value={pickupTimeSlot}
                        onChange={(e) => setPickupTimeSlot(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#dfc0cc] text-xs font-semibold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                      >
                        {PICKUP_WINDOWS.map((win) => (
                          <option key={win} value={win}>
                            {win}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#fcf7f9] border border-[#ead0da] p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#754b5a] mb-1">
                          Rizal Municipality / City (14 Localities)
                        </label>
                        <select
                          value={rizalLocality}
                          onChange={(e) => setRizalLocality(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#dfc0cc] text-xs sm:text-sm font-semibold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                        >
                          {RIZAL_LOCALITIES.map((loc) => (
                            <option key={loc.name} value={loc.name}>
                              {loc.name}, Rizal ({loc.estTravelMinutes})
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-[#7a505f] mt-1">
                          {selectedLocalityInfo.zone} · Est.{" "}
                          {selectedLocalityInfo.estTravelMinutes} from Taytay
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase text-[#754b5a] mb-1">
                          Dispatch Window
                        </label>
                        <select
                          value={pickupTimeSlot}
                          onChange={(e) => setPickupTimeSlot(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#dfc0cc] text-xs sm:text-sm font-semibold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                        >
                          {PICKUP_WINDOWS.map((win) => (
                            <option key={win} value={win}>
                              {win}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-[#754b5a] mb-1">
                        Barangay / Subdivision Landmark
                      </label>
                      <input
                        type="text"
                        value={deliveryLandmarkOrNotes}
                        onChange={(e) =>
                          setDeliveryLandmarkOrNotes(e.target.value)
                        }
                        placeholder={`e.g. Near ${rizalLocality} Municipal Hall / Gate 2`}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dfc0cc] text-xs sm:text-sm text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                      />
                    </div>

                    {/* Mandatory Car / MPV Safety Interlock for 6x5, 8x5, and 2-Tier */}
                    {requiresCarAck && (
                      <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-2">
                        <div className="flex items-start gap-2 text-xs text-amber-950">
                          <Car
                            size={17}
                            className="text-amber-700 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <strong>
                              Mandatory Car / MPV Lalamove Booking ({sizeMeta.label}
                              ):
                            </strong>{" "}
                            Tall 5-inch and 2-Tier cakes cannot fit safely inside
                            a motorcycle insulated box. You book the Lalamove
                            Sedan/MPV once our kitchen notifies you that your
                            remaining balance is settled.
                          </div>
                        </div>

                        <label className="flex items-center gap-2.5 text-xs font-semibold text-amber-950 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={carMpvAcknowledged}
                            onChange={(e) =>
                              setCarMpvAcknowledged(e.target.checked)
                            }
                            className="w-4 h-4 accent-amber-700 rounded"
                          />
                          <span>
                            I understand I must book a Lalamove Car / MPV (no
                            motorcycles) for this cake size.
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 5: GUEST CHECKOUT & PAYMONGO ₱300 DEPOSIT */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#943958] font-semibold">
                    Step 05 · Guest Checkout &amp; PayMongo Deposit
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#250d16]">
                    Lock Your Slot with {formatPhp(DEPOSIT_AMOUNT_PHP)}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-[#6f4655]">
                  <Lock size={13} className="text-[#9e3b5c]" />
                  <span>No Password / Account Required</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Clarisse Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                    Mobile Number (SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0917 XXX XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4f2d3a] mb-1">
                    FB Messenger or Email
                  </label>
                  <input
                    type="text"
                    value={customerMessengerOrEmail}
                    onChange={(e) =>
                      setCustomerMessengerOrEmail(e.target.value)
                    }
                    placeholder="fb.com/yourname or email"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#fcf8f9] border border-[#dfc0cc] text-sm text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                </div>
              </div>

              {/* PayMongo Channel Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#4f2d3a] mb-2">
                  PayMongo Deposit Channel ({formatPhp(DEPOSIT_AMOUNT_PHP)} due
                  today)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PAYMENT_CHANNELS.map((ch) => {
                    const active = paymentChannel === ch;
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setPaymentChannel(ch)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm"
                            : "bg-[#fcf8f9] hover:bg-[#f6e6ed] text-[#351521] border-[#e2c2ce]"
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="text-xs text-[#694351] flex items-start gap-2 max-w-md">
                  <Info size={15} className="text-[#9e3b5c] flex-shrink-0 mt-0.5" />
                  <span>
                    Remaining balance of{" "}
                    <strong>{formatPhp(pricing.remainingBalancePhp)}</strong> is
                    collected via PayMongo link only when your cake is ready
                    (or after you approve any custom photo quote adjustment).
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingCheckout}
                  className="tactile-press px-7 py-4 rounded-full bg-[#9e3b5c] hover:bg-[#832b49] disabled:opacity-60 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl cursor-pointer whitespace-nowrap"
                >
                  {isProcessingCheckout
                    ? "Verifying PayMongo Slot Hold..."
                    : `Pay ${formatPhp(DEPOSIT_AMOUNT_PHP)} via ${paymentChannel} & Reserve`}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* INSTANT ORDER RECEIPT & TRACKING LINK MODAL */}
      {confirmedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-confirmed-heading"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white border border-[#e5c5d1] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <CheckCircle2 size={26} />
            </div>

            <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
              PayMongo Deposit Verified · {confirmedOrder.paymentChannel}
            </span>
            <h3
              id="order-confirmed-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-[#250d16] mt-1"
            >
              Kitchen Slot Reserved!
            </h3>
            <p className="text-sm text-[#5f3b49] mt-2 leading-relaxed">
              {confirmedOrder.status === "AWAITING_BAKER_QUOTE"
                ? "Your ₱300 deposit locked your event date! Because your order includes a custom photo or custom design modification, our baker will verify the final quote shortly."
                : "Your ₱300 deposit locked your kitchen slot and your catalog design is confirmed immediately."}
            </p>

            <div className="my-5 rounded-2xl bg-[#fbf3f6] border border-[#e7cad5] p-4 space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Guest Tracking Code</span>
                <span className="font-mono font-bold text-base text-[#250d16]">
                  {confirmedOrder.trackingCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Event Date (Manila)</span>
                <span className="font-semibold text-[#250d16]">
                  {formatReadableDate(confirmedOrder.eventDateISO)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Cake SKU</span>
                <span className="font-semibold text-[#250d16]">
                  {confirmedOrder.skuId} ({confirmedOrder.flavor})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Deposit Paid</span>
                <span className="font-semibold text-emerald-700">
                  {formatPhp(confirmedOrder.depositPaidPhp)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Remaining Balance</span>
                <span className="font-semibold text-[#250d16]">
                  {formatPhp(confirmedOrder.remainingBalancePhp)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/track?code=${encodeURIComponent(
                  confirmedOrder.trackingCode
                )}`}
                className="flex-1 py-3 px-5 rounded-full bg-[#260e17] hover:bg-[#9e3b5c] text-white text-sm font-semibold text-center transition-colors"
              >
                Track Order {confirmedOrder.trackingCode} →
              </Link>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="py-3 px-5 rounded-full bg-[#f5e4eb] hover:bg-[#ebd0db] text-[#351521] text-sm font-semibold transition-colors cursor-pointer"
              >
                Back to Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
