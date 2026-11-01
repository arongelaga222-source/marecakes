"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Info,
  ListChecks,
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

type WizardStepNumber = 1 | 2 | 3 | 4 | 5;

interface WizardStepMeta {
  step: WizardStepNumber;
  shortTitle: string;
  questionHeading: string;
  helperSubtitle: string;
  nextButtonLabel: string;
}

const WIZARD_STEPS: readonly WizardStepMeta[] = [
  {
    step: 1,
    shortTitle: "1. Cake Design",
    questionHeading: "Step 1 of 5: Pick Your Cake Design",
    helperSubtitle:
      "Tap one of our ready-made cake designs below, or upload a photo from your phone.",
    nextButtonLabel: "Next: Choose Size & Flavor",
  },
  {
    step: 2,
    shortTitle: "2. Size & Flavor",
    questionHeading: "Step 2 of 5: Choose Size, Sponge & Inside Flavor",
    helperSubtitle:
      "Pick how many guests you are feeding and your favorite flavor inside the cake.",
    nextButtonLabel: "Next: Add Cake Greeting",
  },
  {
    step: 3,
    shortTitle: "3. Greeting & Extras",
    questionHeading: "Step 3 of 5: Write Your Cake Message & Extras",
    helperSubtitle:
      "Writing a short birthday or celebration greeting on the cake is completely free!",
    nextButtonLabel: "Next: Pick Date & Delivery",
  },
  {
    step: 4,
    shortTitle: "4. Date & Delivery",
    questionHeading: "Step 4 of 5: Pick Your Celebration Date & Pickup/Delivery",
    helperSubtitle:
      "Tap an open date on the calendar, then choose Taytay Store Pickup or Rizal Lalamove.",
    nextButtonLabel: "Next: Final Review & ₱300 Deposit",
  },
  {
    step: 5,
    shortTitle: "5. Confirm & Pay ₱300",
    questionHeading: "Step 5 of 5: Enter Your Contact Info & Pay ₱300 Deposit",
    helperSubtitle:
      "No account or password needed! Pay ₱300 now to lock your date, and pay the rest when your cake is ready.",
    nextButtonLabel: "Reserve Cake Slot",
  },
] as const;

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
    reader.onerror = () =>
      reject(new Error("Could not read selected image file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () =>
        reject(new Error("Selected file is not a valid image."));
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

  if (
    lower.includes("floral") ||
    lower.includes("flower") ||
    lower.includes("mom")
  ) {
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
        'Detected botanical buttercream piping → Mapped to Mother\'s / Floral (Moist 5" Tall). Final piping complexity reviewed by baker.',
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
  const wizardCardTopRef = useRef<HTMLDivElement>(null);

  // Guided Wizard State (1 question at a time vs Show All)
  const [currentStep, setCurrentStep] = useState<WizardStepNumber>(1);
  const [showAllStepsAtOnce, setShowAllStepsAtOnce] = useState(false);

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
        setCurrentStep(2);
        setStudioToast(
          `Selected “${preset.title}” — Now choose your size & flavor!`
        );
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
      setCurrentStep(2);
      setStudioToast(
        `Loaded ${CATEGORIES[nextCat].shortName} (${valid.spongeBase.toUpperCase()} · ${valid.size.toUpperCase()})`
      );
    }

    const timer = setTimeout(() => setStudioToast(null), 3500);
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
  const activeFlavorObj =
    FLAVORS.find((f) => f.code === flavor) ?? FLAVORS[0];
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

  const activeStepMeta =
    WIZARD_STEPS.find((s) => s.step === currentStep) ?? WIZARD_STEPS[0];

  // Scroll wizard card smoothly into view when changing steps
  const goToStep = (targetStep: WizardStepNumber) => {
    setFormError(null);
    setCurrentStep(targetStep);
    setTimeout(() => {
      wizardCardTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 40);
  };

  // Validate current step before advancing with the big "Next Step →" button
  const handleNextStep = () => {
    setFormError(null);

    if (currentStep === 1) {
      if (designSource === "custom_upload" && !uploadedPhotoUrl) {
        setFormError(
          "Please select a cake photo from your phone first, or tap 'Ready-Made Marecakes Designs' above."
        );
        return;
      }
      goToStep(2);
      return;
    }

    if (currentStep === 2) {
      goToStep(3);
      return;
    }

    if (currentStep === 3) {
      goToStep(4);
      return;
    }

    if (currentStep === 4) {
      if (!selectedDateISO) {
        setFormError("Please tap an available date on the calendar first.");
        return;
      }
      if (requiresCarAck && !carMpvAcknowledged) {
        setFormError(
          `Because ${sizeMeta.label} is a tall cake, please check the yellow box confirming you will book a Lalamove Car / MPV (not a motorcycle).`
        );
        return;
      }
      goToStep(5);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as WizardStepNumber);
    }
  };

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
    setFormError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError(
        "Please select a valid JPG, PNG, or WebP cake reference photo."
      );
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
      setFormError(
        "Please select an available celebration date on Step 4 first."
      );
      if (!showAllStepsAtOnce) setCurrentStep(4);
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
      if (!showAllStepsAtOnce) setCurrentStep(4);
      return;
    }
    if (slotCheck.isFull) {
      setFormError(
        "That date just reached our 3-cake daily limit. Please pick another date."
      );
      if (!showAllStepsAtOnce) setCurrentStep(4);
      return;
    }

    if (designSource === "custom_upload" && !uploadedPhotoUrl) {
      setFormError(
        "Please upload your custom cake reference photo on Step 1 or switch back to Ready-Made Designs."
      );
      if (!showAllStepsAtOnce) setCurrentStep(1);
      return;
    }

    if (requiresCarAck && !carMpvAcknowledged) {
      setFormError(
        `Please check the box on Step 4 acknowledging Lalamove Car / MPV transport for ${sizeMeta.label} cakes.`
      );
      if (!showAllStepsAtOnce) setCurrentStep(4);
      return;
    }

    if (customerName.trim().length < 2) {
      setFormError("Please enter your full name so we know who to hand the cake to.");
      return;
    }
    if (customerPhone.trim().length < 7) {
      setFormError(
        "Please enter your mobile number so our kitchen can text you updates."
      );
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
      } px-4 sm:px-8 md:px-14 lg:px-16 xl:px-24 bg-[#fdf7f8] text-[#2a121b] relative`}
    >
      <div className="max-w-[1440px] mx-auto" ref={wizardCardTopRef}>
        {/* Top Studio Heading + Easy Guided Mode Toggle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono uppercase tracking-widest text-[#943958] font-semibold">
              <Sparkles size={14} />
              <span>Easy Step-by-Step Cake Ordering</span>
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#250d16] tracking-tight mt-2">
              Order Your Cake in 5 Simple Steps
            </h2>
            <p className="text-[#5d3947] text-base sm:text-lg max-w-2xl mt-2">
              Answer one question at a time using the big{" "}
              <strong>Next Step</strong> button. Reserve your celebration date
              with just a <strong>{formatPhp(DEPOSIT_AMOUNT_PHP)}</strong>{" "}
              deposit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {studioToast && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2b101b] text-white text-xs sm:text-sm font-medium shadow-lg">
                <CheckCircle2 size={15} className="text-emerald-300" />
                <span>{studioToast}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAllStepsAtOnce((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#dfbCC8] hover:border-[#9e3b5c] text-[#351521] text-xs sm:text-sm font-semibold shadow-sm cursor-pointer transition-colors"
            >
              <ListChecks size={16} className="text-[#9e3b5c]" />
              <span>
                {showAllStepsAtOnce
                  ? "Switch to Step-by-Step Guide (Recommended)"
                  : "Show All 5 Steps on One Page"}
              </span>
            </button>
          </div>
        </div>

        {/* 5-STEP CLICKABLE PROGRESS BAR (Shown in Guided Wizard Mode) */}
        {!showAllStepsAtOnce && (
          <div className="mb-8 rounded-3xl bg-white border-2 border-[#e5c5d1] p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {WIZARD_STEPS.map((st) => {
                const isCurrent = currentStep === st.step;
                const isCompleted = currentStep > st.step;
                return (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => goToStep(st.step)}
                    className={`min-h-[54px] px-3.5 py-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isCurrent
                        ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md scale-[1.01]"
                        : isCompleted
                        ? "bg-[#fbeaf0] text-[#250d16] border-[#d395ac] hover:bg-[#f6dce5]"
                        : "bg-[#fcf8fa] text-[#6d4554] border-[#ead1da] hover:border-[#c996a8]"
                    }`}
                  >
                    <div>
                      <div
                        className={`text-[11px] font-mono uppercase tracking-wider ${
                          isCurrent
                            ? "text-pink-200"
                            : isCompleted
                            ? "text-[#8e3050] font-bold"
                            : "text-[#8a6271]"
                        }`}
                      >
                        {isCompleted ? "Completed" : `Step ${st.step} of 5`}
                      </div>
                      <div className="font-display font-bold text-sm sm:text-[15px] leading-snug mt-0.5">
                        {st.shortTitle.replace(/^\d+\.\s*/, "")}
                      </div>
                    </div>

                    {isCompleted && (
                      <span className="w-6 h-6 rounded-full bg-[#9e3b5c] text-white flex items-center justify-center flex-shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reassuring "Your Cake So Far" Summary Strip */}
            <div className="mt-4 pt-3.5 border-t border-[#f0dde4] flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-[#4c2836]">
                <span className="font-bold text-[#250d16]">
                  Your Cake So Far:
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f8e7ee] text-[#802443] font-semibold">
                  {CATEGORIES[category].shortName}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f8e7ee] text-[#802443] font-semibold capitalize">
                  {validResolved.spongeBase} Sponge
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f8e7ee] text-[#802443] font-semibold">
                  {sizeMeta.label} ({sizeMeta.servingsLabel})
                </span>
                <span className="px-3 py-1 rounded-full bg-[#f8e7ee] text-[#802443] font-semibold">
                  {activeFlavorObj.name}
                </span>
                {selectedDateISO && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
                    {formatReadableDate(selectedDateISO)}
                  </span>
                )}
              </div>

              <div className="font-display text-lg font-bold text-[#250d16]">
                Total: {formatPhp(pricing.estimatedTotalPhp)}{" "}
                <span className="text-xs font-normal text-[#784f5e]">
                  ({formatPhp(DEPOSIT_AMOUNT_PHP)} deposit today)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main 12-Column Asymmetric Studio Layout */}
        <form
          onSubmit={handleReserveSlot}
          className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 items-start"
        >
          {/* RIGHT BUILDER STEPS PUT FIRST ON MOBILE/WIZARD SO QUESTION IS CLEAR, STICKY PREVIEW ON LEFT FOR DESKTOP */}
          <div className="xl:col-span-7 xl:order-2 space-y-7">
            {/* Active Step Banner (Guided Mode) */}
            {!showAllStepsAtOnce && (
              <div className="rounded-3xl bg-[#260e17] text-white p-6 sm:p-7 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-pink-200 text-xs font-mono uppercase tracking-widest font-semibold">
                    Step {currentStep} of 5
                  </span>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-pink-200 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft size={15} />
                      <span>Go Back a Step</span>
                    </button>
                  )}
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold mt-2.5">
                  {activeStepMeta.questionHeading}
                </h3>
                <p className="text-white/85 text-sm sm:text-base mt-1.5 leading-relaxed">
                  {activeStepMeta.helperSubtitle}
                </p>
              </div>
            )}

            {/* STEP 1: EXTERIOR DESIGN SOURCE (Catalog vs Upload Reference Photo) */}
            {(showAllStepsAtOnce || currentStep === 1) && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-6 sm:p-8 shadow-sm space-y-6">
                {showAllStepsAtOnce && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
                      Step 01 · Exterior Reference
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#250d16] mt-1">
                      1. Pick a Ready-Made Design or Upload a Photo
                    </h3>
                  </div>
                )}

                {/* Big 2-Button Choice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDesignSource("catalog")}
                    className={`tactile-press min-h-[76px] p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      designSource === "catalog"
                        ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md"
                        : "bg-[#fcf7f9] hover:bg-[#f7e8ee] text-[#351521] border-[#e4c6d1]"
                    }`}
                  >
                    <div className="font-display font-bold text-base sm:text-lg">
                      Option A: Ready-Made Marecakes Designs
                    </div>
                    <div
                      className={`text-xs sm:text-sm mt-1 ${
                        designSource === "catalog"
                          ? "text-pink-100/90"
                          : "text-[#6e4756]"
                      }`}
                    >
                      Pick from our popular cakes below (Confirms immediately!)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesignSource("custom_upload")}
                    className={`tactile-press min-h-[76px] p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      designSource === "custom_upload"
                        ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md"
                        : "bg-[#fcf7f9] hover:bg-[#f7e8ee] text-[#351521] border-[#e4c6d1]"
                    }`}
                  >
                    <div className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
                      <Upload size={18} />
                      <span>Option B: Upload My Own Cake Photo</span>
                    </div>
                    <div
                      className={`text-xs sm:text-sm mt-1 ${
                        designSource === "custom_upload"
                          ? "text-pink-100/90"
                          : "text-[#6e4756]"
                      }`}
                    >
                      Have a picture from Facebook or Pinterest? Upload it here
                    </div>
                  </button>
                </div>

                {designSource === "catalog" ? (
                  <div>
                    <label className="block text-sm font-bold text-[#351521] mb-3">
                      Tap a Cake Picture Below to Select It:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {CATALOG_PRESETS.map((preset) => {
                        const active = selectedPresetId === preset.id;
                        const { cell } = ensureValidSelection(
                          preset.category,
                          preset.defaultBase,
                          preset.defaultSize
                        );
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
                            className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                              active
                                ? "bg-[#fbe9f0] border-[#9e3b5c] ring-2 ring-[#9e3b5c]/25 shadow-sm"
                                : "bg-white hover:bg-[#fdf6f8] border-[#ead1da]"
                            }`}
                          >
                            <div className="relative w-16 h-16 rounded-xl bg-gradient-to-b from-[#b45373] to-[#df94ae] flex-shrink-0 p-1.5">
                              <Image
                                src={preset.imageSrc}
                                alt={preset.title}
                                fill
                                sizes="64px"
                                className="object-contain p-1"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-bold text-[#260e17]">
                                {preset.title}
                              </div>
                              <div className="text-xs sm:text-sm text-[#6f4655] mt-0.5">
                                {CATEGORIES[preset.category].shortName} ·{" "}
                                <strong className="text-[#8e3050]">
                                  {formatPhp(cell.pricePhp)}
                                </strong>
                              </div>
                            </div>
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                active
                                  ? "bg-[#9e3b5c] text-white"
                                  : "border-2 border-[#d8b4c2]"
                              }`}
                            >
                              {active && <Check size={16} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-[#c78da2] bg-[#fdf6f9] p-6 sm:p-8 text-center">
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
                      className="tactile-press min-h-[54px] inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#9e3b5c] hover:bg-[#852d4b] text-white text-base font-bold shadow-md cursor-pointer"
                    >
                      <Upload size={18} />
                      <span>
                        {uploadedPhotoUrl
                          ? "Change Uploaded Cake Photo"
                          : "Tap Here to Choose Photo from Your Phone"}
                      </span>
                    </button>

                    <p className="text-sm text-[#5f3b49] mt-3 max-w-md mx-auto">
                      Our baker will review your photo to make sure the icing
                      and toppers match what you want.
                    </p>

                    {isAnalyzingUpload && (
                      <div className="mt-3 text-sm font-semibold text-[#9e3b5c] animate-pulse">
                        Preparing your photo...
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                        {uploadError}
                      </div>
                    )}

                    {uploadStats && (
                      <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full text-emerald-900">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>
                          Photo Uploaded: {uploadStats.fileName} (
                          {uploadStats.compressedKb} KB)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: CANONICAL 16-CELL MATRIX (Category -> Sponge Base -> Size -> 7 Flavors) */}
            {(showAllStepsAtOnce || currentStep === 2) && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-6 sm:p-8 shadow-sm space-y-7">
                {showAllStepsAtOnce && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
                      Step 02 · Size, Sponge &amp; Flavor
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#250d16] mt-1">
                      2. Choose Cake Style, Sponge, Size &amp; Inside Flavor
                    </h3>
                  </div>
                )}

                {/* 2A. Category */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#250d16] mb-2.5">
                    A. Which Cake Style Would You Like?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ALL_CATEGORIES.map((catCode) => {
                      const cat = CATEGORIES[catCode];
                      const active = category === catCode;
                      return (
                        <button
                          key={catCode}
                          type="button"
                          onClick={() => handleSelectCategory(catCode)}
                          className={`min-h-[72px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                            active
                              ? "bg-[#fbeaf0] border-[#9e3b5c] ring-2 ring-[#9e3b5c]/25"
                              : "bg-[#fcf8f9] hover:bg-[#f7eaef] border-[#e5c8d3]"
                          }`}
                        >
                          <div>
                            <div className="font-display font-bold text-base text-[#250d16]">
                              {cat.shortName}
                            </div>
                            <div className="text-xs sm:text-sm text-[#7a4e5e] mt-0.5 font-medium">
                              Starts at {formatPhp(cat.startingPricePhp)}
                            </div>
                          </div>
                          {active && (
                            <Check
                              size={18}
                              className="text-[#9e3b5c] flex-shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2B. Sponge Base */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <label className="text-sm sm:text-base font-bold text-[#250d16]">
                      B. Choose Your Cake Sponge Inside:
                    </label>
                    {category === "floral" && (
                      <span className="text-xs sm:text-sm text-[#9e3b5c] font-semibold bg-[#fbeaf0] px-3 py-1 rounded-full">
                        Floral cakes use Rich Moist Sponge to hold heavy flowers
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                          className={`min-h-[76px] p-4 rounded-2xl border-2 text-left transition-all ${
                            !allowed
                              ? "bg-[#f6f1f3] text-[#b89fa8] border-[#ece0e5] cursor-not-allowed"
                              : active
                              ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md cursor-pointer"
                              : "bg-white hover:bg-[#faeef2] text-[#2a121b] border-[#e3c4cf] cursor-pointer"
                          }`}
                        >
                          <div className="font-display font-bold text-base sm:text-lg capitalize">
                            {base === "chiffon"
                              ? "Light & Soft Chiffon Sponge"
                              : "Rich & Velvety Moist Sponge"}
                          </div>
                          <div
                            className={`text-xs sm:text-sm mt-1 ${
                              !allowed
                                ? "text-[#b89fa8]"
                                : active
                                ? "text-pink-100/90"
                                : "text-[#6d4554]"
                            }`}
                          >
                            {base === "chiffon"
                              ? "Fluffy, airy, and less sweet"
                              : "Deeper, richer cake bite"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2C. Canonical Size Matrix with Guest Servings Shown Clearly */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#250d16] mb-2.5">
                    C. Pick Cake Size (How Many People Are Eating?):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ALL_SIZES.map((sz) => {
                      const cell = lookupSkuCell(
                        category,
                        validResolved.spongeBase,
                        sz
                      );
                      const active = validResolved.size === sz;
                      const meta = SIZE_METADATA[sz];
                      return (
                        <button
                          key={sz}
                          type="button"
                          disabled={!cell}
                          onClick={() => handleSelectSize(sz)}
                          className={`min-h-[84px] p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                            !cell
                              ? "bg-[#f8f3f5] text-[#c2aab3] border-[#efe3e8] cursor-not-allowed"
                              : active
                              ? "bg-[#9e3b5c] text-white border-[#9e3b5c] shadow-md cursor-pointer"
                              : "bg-white hover:bg-[#fbeaf0] text-[#2a121b] border-[#e3c4cf] cursor-pointer"
                          }`}
                        >
                          <div>
                            <div className="text-base font-bold">
                              {meta.label}
                            </div>
                            <div
                              className={`text-xs sm:text-sm mt-0.5 ${
                                !cell
                                  ? "text-[#c2aab3]"
                                  : active
                                  ? "text-pink-100"
                                  : "text-[#6d4554]"
                              }`}
                            >
                              Good for {meta.servingsLabel}
                            </div>
                          </div>
                          <div
                            className={`text-base sm:text-lg font-display font-bold whitespace-nowrap ${
                              !cell
                                ? "text-[#c2aab3]"
                                : active
                                ? "text-white"
                                : "text-[#8e3050]"
                            }`}
                          >
                            {cell ? formatPhp(cell.pricePhp) : "Not Offered"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2D. 7 Official Interior Flavors */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#250d16] mb-2.5">
                    D. Pick Your Inside Cake Flavor (Included Free!):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FLAVORS.map((flv) => {
                      const active = flavor === flv.code;
                      return (
                        <button
                          key={flv.code}
                          type="button"
                          onClick={() => setFlavor(flv.code)}
                          className={`min-h-[54px] px-4 py-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            active
                              ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm"
                              : "bg-[#fcf7f9] hover:bg-[#f6e4ec] text-[#351521] border-[#e2c2ce]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="w-5 h-5 rounded-full border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: flv.spongeColorHex }}
                            />
                            <div>
                              <div className="text-sm sm:text-base font-bold">
                                {flv.name}
                              </div>
                              <div
                                className={`text-xs ${
                                  active ? "text-pink-100/80" : "text-[#784f5e]"
                                }`}
                              >
                                {flv.fillingLabel}
                              </div>
                            </div>
                          </div>
                          {active && <Check size={17} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: ADD-ONS & SPLIT PERSONALIZATION INPUTS */}
            {(showAllStepsAtOnce || currentStep === 3) && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-6 sm:p-8 shadow-sm space-y-6">
                {showAllStepsAtOnce && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
                      Step 03 · Greeting &amp; Extras
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#250d16] mt-1">
                      3. Write Your Free Cake Greeting &amp; Optional Candles
                    </h3>
                  </div>
                )}

                {/* Free Cake Greeting Box First (Most Important for Seniors!) */}
                <div className="rounded-2xl bg-[#fdf6f9] border-2 border-[#e4c5d0] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="cake-dedication"
                      className="text-base font-bold text-[#250d16]"
                    >
                      1. What Greeting Should We Write on the Cake? (FREE)
                    </label>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Free · No Extra Charge
                    </span>
                  </div>
                  <input
                    id="cake-dedication"
                    type="text"
                    maxLength={42}
                    value={cakeDedication}
                    onChange={(e) => setCakeDedication(e.target.value)}
                    placeholder="Example: Happy 60th Birthday Mama Elena!"
                    className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-[#d8b4c2] text-base font-medium text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                  />
                  <p className="text-xs sm:text-sm text-[#6d4554] mt-2">
                    Written on the cake top or cake board (
                    {cakeDedication.length}/42 letters).
                  </p>
                </div>

                {/* Birthday Bundled Topper Double-Charge Guard */}
                {CATEGORIES[category].bundlesPrintedTopper && (
                  <div className="rounded-2xl bg-[#fae8ef] border border-[#e7bfd0] p-4 flex items-start gap-3 text-sm text-[#73233f]">
                    <Gift
                      size={20}
                      className="flex-shrink-0 mt-0.5 text-[#9e3b5c]"
                    />
                    <div>
                      <strong>Good News:</strong> Customized Birthday Cakes
                      already come with free printed theme toppers! Only check
                      the <strong>+{formatPhp(ADDON_CUSTOM_TOPPER_PHP)}</strong>{" "}
                      box below if you want an extra hard acrylic keepsake name
                      topper.
                    </div>
                  </div>
                )}

                {/* 2 Official Add-Ons */}
                <div>
                  <label className="block text-base font-bold text-[#250d16] mb-3">
                    2. Optional Extras (Skip if you don&apos;t need these):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-start justify-between gap-3 p-4 rounded-2xl border-2 border-[#e4c5d0] bg-[#fcf8f9] cursor-pointer hover:border-[#a64264] transition-colors">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={includeCustomTopper}
                          onChange={(e) =>
                            setIncludeCustomTopper(e.target.checked)
                          }
                          className="mt-1 w-5 h-5 accent-[#9e3b5c] rounded"
                        />
                        <div>
                          <div className="text-base font-bold text-[#250d16]">
                            Custom Acrylic Name Topper
                          </div>
                          <div className="text-xs sm:text-sm text-[#6f4756]">
                            Hard keepsake topper on top of the cake
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#8e3050] whitespace-nowrap">
                        +{formatPhp(ADDON_CUSTOM_TOPPER_PHP)}
                      </span>
                    </label>

                    <div className="p-4 rounded-2xl border-2 border-[#e4c5d0] bg-[#fcf8f9] flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-bold text-[#250d16]">
                            Number Candles
                          </div>
                          <div className="text-xs sm:text-sm text-[#6f4756]">
                            {formatPhp(ADDON_NUMBER_CANDLE_PHP)} per candle
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-2 bg-white border-2 border-[#d8b4c2] rounded-full px-2.5 py-1">
                          <button
                            type="button"
                            onClick={() =>
                              setNumberCandleCount((c) => Math.max(0, c - 1))
                            }
                            className="w-8 h-8 rounded-full hover:bg-[#f6e4ec] flex items-center justify-center text-[#351521] cursor-pointer"
                            aria-label="Remove number candle"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-base font-bold w-6 text-center">
                            {numberCandleCount}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNumberCandleCount((c) => Math.min(4, c + 1))
                            }
                            className="w-8 h-8 rounded-full hover:bg-[#f6e4ec] flex items-center justify-center text-[#351521] cursor-pointer"
                            aria-label="Add number candle"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {numberCandleCount > 0 && (
                        <input
                          type="text"
                          maxLength={4}
                          value={numberCandleDigits}
                          onChange={(e) =>
                            setNumberCandleDigits(e.target.value)
                          }
                          placeholder="What age/numbers? (Example: 60)"
                          className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-[#d8b4c2] text-sm font-medium text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Optional Special Requests */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="custom-instructions"
                      className="text-sm sm:text-base font-bold text-[#250d16]"
                    >
                      3. Special Color or Design Requests (Optional — Leave
                      blank if none)
                    </label>
                  </div>
                  <input
                    id="custom-instructions"
                    type="text"
                    maxLength={140}
                    value={customDesignInstructions}
                    onChange={(e) =>
                      setCustomDesignInstructions(e.target.value)
                    }
                    placeholder="Example: Please make the ribbon baby blue instead of pink..."
                    className="w-full px-4 py-3 rounded-xl bg-[#fcf8f9] border-2 border-[#e2c2ce] text-sm sm:text-base text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: ASIA/MANILA 3-SLOT CALENDAR & RIZAL FULFILLMENT */}
            {(showAllStepsAtOnce || currentStep === 4) && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-6 sm:p-8 shadow-sm space-y-7">
                {showAllStepsAtOnce && (
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
                      Step 04 · Celebration Date &amp; Delivery
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#250d16] mt-1">
                      4. Pick Your Celebration Date &amp; Rizal Handoff
                    </h3>
                  </div>
                )}

                {/* Monthly Calendar Picker */}
                <div className="rounded-2xl border-2 border-[#ead0da] bg-[#fdf9fa] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => shiftCalendarMonth(-1)}
                      className="px-3.5 py-2 rounded-full bg-white border border-[#dfbCC8] hover:bg-[#f3dfe7] text-[#351521] text-xs sm:text-sm font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={18} />
                      <span>Prev Month</span>
                    </button>
                    <div className="font-display font-bold text-lg sm:text-xl text-[#250d16] flex items-center gap-2">
                      <CalendarIcon size={18} className="text-[#9e3b5c]" />
                      <span>{calendarMonthLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => shiftCalendarMonth(1)}
                      className="px-3.5 py-2 rounded-full bg-white border border-[#dfbCC8] hover:bg-[#f3dfe7] text-[#351521] text-xs sm:text-sm font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      aria-label="Next month"
                    >
                      <span>Next Month</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase text-[#7a4e5e] mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <div key={d}>{d}</div>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {calendarDays.map((cell) => {
                      if (cell.kind === "empty") {
                        return <div key={cell.key} className="h-16" />;
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
                          className={`h-16 sm:h-[68px] rounded-xl border-2 p-1 flex flex-col items-center justify-center transition-all ${
                            isSelected
                              ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md scale-[1.03]"
                              : disabled
                              ? "bg-[#f4ecef]/65 text-[#bca3ad] border-transparent cursor-not-allowed"
                              : "bg-white hover:border-[#9e3b5c] hover:bg-[#fbeaf0] text-[#250d16] border-[#e2c2ce] cursor-pointer"
                          }`}
                        >
                          <span className="text-sm sm:text-base font-bold leading-none">
                            {dayNumber}
                          </span>
                          <span
                            className={`text-[10px] sm:text-xs mt-1 font-semibold leading-none ${
                              isSelected
                                ? "text-emerald-300"
                                : status.isPastLeadTime
                                ? "text-[#c4aeb7]"
                                : status.isFull
                                ? "text-rose-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {status.isPastLeadTime
                              ? "Closed"
                              : status.isFull
                              ? "FULL"
                              : `${status.remainingSlots} open`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDateISO && (
                    <div className="mt-4 pt-3.5 border-t border-[#eed9e1] flex flex-wrap items-center justify-between gap-2 text-sm text-[#4e2b39]">
                      <span>
                        Chosen Celebration Date:{" "}
                        <strong className="text-[#250d16] text-base">
                          {formatReadableDate(selectedDateISO)}
                        </strong>
                      </span>
                      <span className="text-emerald-800 font-semibold">
                        ✓ Slot Available
                      </span>
                    </div>
                  )}
                </div>

                {/* Rizal Fulfillment Method: Store Pickup vs 14-Locality Lalamove */}
                <div className="space-y-4">
                  <label className="block text-base font-bold text-[#250d16]">
                    How Will You Get Your Cake?
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("pickup")}
                      className={`min-h-[78px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                        fulfillmentMethod === "pickup"
                          ? "bg-[#fbeaf0] border-[#9e3b5c] ring-2 ring-[#9e3b5c]/25"
                          : "bg-[#fcf8f9] hover:bg-[#f6e7ed] border-[#e4c5d0]"
                      }`}
                    >
                      <Store
                        size={22}
                        className="text-[#9e3b5c] flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <div className="font-display font-bold text-base text-[#250d16]">
                          Pick Up at Store ({ATELIER_PICKUP_INFO.municipality})
                        </div>
                        <div className="text-xs sm:text-sm text-[#6c4554] mt-0.5">
                          {ATELIER_PICKUP_INFO.landmark}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("lalamove")}
                      className={`min-h-[78px] p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                        fulfillmentMethod === "lalamove"
                          ? "bg-[#fbeaf0] border-[#9e3b5c] ring-2 ring-[#9e3b5c]/25"
                          : "bg-[#fcf8f9] hover:bg-[#f6e7ed] border-[#e4c5d0]"
                      }`}
                    >
                      <Truck
                        size={22}
                        className="text-[#9e3b5c] flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <div className="font-display font-bold text-base text-[#250d16]">
                          Lalamove Delivery (Rizal Area)
                        </div>
                        <div className="text-xs sm:text-sm text-[#6c4554] mt-0.5">
                          We help coordinate Lalamove to your town in Rizal
                        </div>
                      </div>
                    </button>
                  </div>

                  {fulfillmentMethod === "pickup" ? (
                    <div className="rounded-2xl bg-[#fcf7f9] border-2 border-[#ead0da] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-sm text-[#5f3b49] space-y-1">
                        <div className="font-bold text-[#250d16] flex items-center gap-1.5">
                          <MapPin size={16} className="text-[#9e3b5c]" />
                          <span>{ATELIER_PICKUP_INFO.landmark}</span>
                        </div>
                        <p>{ATELIER_PICKUP_INFO.hours}</p>
                        <p className="text-xs text-[#855768]">
                          {ATELIER_PICKUP_INFO.note}
                        </p>
                      </div>

                      <div className="sm:w-64 flex-shrink-0">
                        <label className="block text-xs font-bold uppercase text-[#5f3b49] mb-1.5">
                          What Time Will You Pick Up?
                        </label>
                        <select
                          value={pickupTimeSlot}
                          onChange={(e) => setPickupTimeSlot(e.target.value)}
                          className="w-full px-3.5 py-3 rounded-xl bg-white border-2 border-[#d8b4c2] text-sm font-bold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
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
                    <div className="rounded-2xl bg-[#fcf7f9] border-2 border-[#ead0da] p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-[#5f3b49] mb-1.5">
                            Your Town / City in Rizal
                          </label>
                          <select
                            value={rizalLocality}
                            onChange={(e) => setRizalLocality(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-xl bg-white border-2 border-[#d8b4c2] text-sm font-bold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                          >
                            {RIZAL_LOCALITIES.map((loc) => (
                              <option key={loc.name} value={loc.name}>
                                {loc.name}, Rizal ({loc.estTravelMinutes})
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-[#7a505f] mt-1">
                            Travel time from Taytay:{" "}
                            {selectedLocalityInfo.estTravelMinutes}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-[#5f3b49] mb-1.5">
                            Preferred Delivery Time
                          </label>
                          <select
                            value={pickupTimeSlot}
                            onChange={(e) => setPickupTimeSlot(e.target.value)}
                            className="w-full px-3.5 py-3 rounded-xl bg-white border-2 border-[#d8b4c2] text-sm font-bold text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
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
                        <label className="block text-xs font-bold uppercase text-[#5f3b49] mb-1.5">
                          Your House Address / Barangay / Landmark
                        </label>
                        <input
                          type="text"
                          value={deliveryLandmarkOrNotes}
                          onChange={(e) =>
                            setDeliveryLandmarkOrNotes(e.target.value)
                          }
                          placeholder={`Example: Near ${rizalLocality} Church / Green Gate`}
                          className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[#d8b4c2] text-sm text-[#250d16] focus:outline-none focus:border-[#9e3b5c]"
                        />
                      </div>

                      {/* Mandatory Car / MPV Safety Interlock for 6x5, 8x5, and 2-Tier */}
                      {requiresCarAck && (
                        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 space-y-2.5">
                          <div className="flex items-start gap-2.5 text-sm text-amber-950">
                            <Car
                              size={20}
                              className="text-amber-700 flex-shrink-0 mt-0.5"
                            />
                            <div>
                              <strong>
                                Important for {sizeMeta.label} Cakes:
                              </strong>{" "}
                              Because this cake is tall, it must travel inside a{" "}
                              <strong>Lalamove Car / Sedan or MPV</strong> (not
                              a motorcycle box) so it does not tilt or melt.
                            </div>
                          </div>

                          <label className="flex items-center gap-3 text-sm font-bold text-amber-950 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={carMpvAcknowledged}
                              onChange={(e) =>
                                setCarMpvAcknowledged(e.target.checked)
                              }
                              className="w-5 h-5 accent-amber-700 rounded"
                            />
                            <span>
                              Yes, I understand this cake needs a Lalamove Car /
                              MPV.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: GUEST CHECKOUT & PAYMONGO ₱300 DEPOSIT */}
            {(showAllStepsAtOnce || currentStep === 5) && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
                      Step 05 · Contact Info &amp; ₱300 Deposit
                    </span>
                    <h3 className="font-display text-2xl font-bold text-[#250d16] mt-1">
                      5. Your Name, Phone Number &amp; {formatPhp(DEPOSIT_AMOUNT_PHP)} Deposit
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#6f4655] bg-[#f8e7ee] px-3 py-1 rounded-full">
                    <Lock size={14} className="text-[#9e3b5c]" />
                    <span>No Account Password Needed</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#351521] mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Clarisse Santos"
                      className="w-full px-4 py-3 rounded-xl bg-[#fcf8f9] border-2 border-[#d8b4c2] text-base text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#351521] mb-1.5">
                      Cellphone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0917 XXX XXXX"
                      className="w-full px-4 py-3 rounded-xl bg-[#fcf8f9] border-2 border-[#d8b4c2] text-base text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#351521] mb-1.5">
                      FB Messenger Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerMessengerOrEmail}
                      onChange={(e) =>
                        setCustomerMessengerOrEmail(e.target.value)
                      }
                      placeholder="Your Facebook name"
                      className="w-full px-4 py-3 rounded-xl bg-[#fcf8f9] border-2 border-[#d8b4c2] text-base text-[#250d16] focus:bg-white focus:outline-none focus:border-[#9e3b5c]"
                    />
                  </div>
                </div>

                {/* PayMongo Channel Picker */}
                <div>
                  <label className="block text-sm sm:text-base font-bold text-[#351521] mb-2.5">
                    How Would You Like to Pay the {formatPhp(DEPOSIT_AMOUNT_PHP)}{" "}
                    Deposit Today?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PAYMENT_CHANNELS.map((ch) => {
                      const active = paymentChannel === ch;
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setPaymentChannel(ch)}
                          className={`min-h-[54px] py-3 px-4 rounded-2xl text-sm sm:text-base font-bold border-2 transition-all cursor-pointer ${
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
                  <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4 flex items-start gap-3 text-sm font-medium text-red-900">
                    <AlertTriangle
                      size={18}
                      className="flex-shrink-0 mt-0.5 text-red-700"
                    />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="text-xs sm:text-sm text-[#5f3b49] flex items-start gap-2.5 max-w-md">
                    <Info
                      size={18}
                      className="text-[#9e3b5c] flex-shrink-0 mt-0.5"
                    />
                    <span>
                      You only pay <strong>{formatPhp(DEPOSIT_AMOUNT_PHP)}</strong>{" "}
                      today. The remaining{" "}
                      <strong>{formatPhp(pricing.remainingBalancePhp)}</strong>{" "}
                      is paid only when your cake is ready!
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingCheckout}
                    className="tactile-press min-h-[58px] px-8 py-4 rounded-full bg-[#9e3b5c] hover:bg-[#832b49] disabled:opacity-60 text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl cursor-pointer whitespace-nowrap"
                  >
                    {isProcessingCheckout
                      ? "Reserving Your Cake Slot..."
                      : `Pay ${formatPhp(DEPOSIT_AMOUNT_PHP)} via ${paymentChannel} & Reserve`}
                  </button>
                </div>
              </div>
            )}

            {/* BIG STEP-BY-STEP WIZARD FOOTER ("← Go Back" & "Next Step →") */}
            {!showAllStepsAtOnce && (
              <div className="rounded-3xl bg-white border-2 border-[#e5c6d2] p-5 sm:p-6 shadow-md">
                {formError && currentStep < 5 && (
                  <div className="mb-4 rounded-2xl bg-red-50 border-2 border-red-200 p-4 flex items-start gap-3 text-sm font-medium text-red-900">
                    <AlertTriangle
                      size={18}
                      className="flex-shrink-0 mt-0.5 text-red-700"
                    />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="tactile-press min-h-[56px] px-6 py-3.5 rounded-full bg-[#f5e3ea] hover:bg-[#ebd0db] text-[#2b101b] font-bold text-base inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft size={19} />
                      <span>
                        Go Back (Step {currentStep - 1})
                      </span>
                    </button>
                  ) : (
                    <div className="text-xs sm:text-sm text-[#6d4554] font-medium px-2">
                      Step 1 of 5 · Pick a cake design above, then tap{" "}
                      <strong>Next</strong>
                    </div>
                  )}

                  {currentStep < 5 && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="tactile-press min-h-[56px] px-8 py-3.5 rounded-full bg-[#9e3b5c] hover:bg-[#822a48] text-white font-bold text-base sm:text-lg inline-flex items-center justify-center gap-2.5 shadow-lg cursor-pointer"
                    >
                      <span>{activeStepMeta.nextButtonLabel}</span>
                      <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* LEFT / STICKY STAGE (5 cols on XL): Live Dual Exterior + Cutaway Visualizer & Price Receipt */}
          <div className="xl:col-span-5 xl:order-1 xl:sticky xl:top-24 space-y-6">
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
                  <div className="text-xs font-mono uppercase tracking-widest text-pink-200/80">
                    Your Cake Price Summary
                  </div>
                  <div className="font-display text-lg font-bold">
                    {CATEGORIES[category].shortName}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
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
                <div className="flex items-center justify-between text-white/90">
                  <span>
                    {validResolved.spongeBase === "chiffon"
                      ? "Chiffon"
                      : "Moist"}{" "}
                    · {sizeMeta.label} ({activeFlavorObj.name})
                  </span>
                  <span className="font-semibold">
                    {formatPhp(pricing.basePricePhp)}
                  </span>
                </div>

                {pricing.topperAddonPhp > 0 && (
                  <div className="flex items-center justify-between text-white/80 text-xs sm:text-sm">
                    <span>+ Custom Acrylic Topper</span>
                    <span>{formatPhp(pricing.topperAddonPhp)}</span>
                  </div>
                )}

                {pricing.candlesAddonPhp > 0 && (
                  <div className="flex items-center justify-between text-white/80 text-xs sm:text-sm">
                    <span>
                      + Number Candles ({numberCandleCount} ×{" "}
                      {formatPhp(ADDON_NUMBER_CANDLE_PHP)})
                    </span>
                    <span>{formatPhp(pricing.candlesAddonPhp)}</span>
                  </div>
                )}

                <div className="pt-3 mt-2 border-t border-white/15 flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-pink-200/90">
                    Total Cake Price
                  </span>
                  <span className="font-display text-2xl font-bold text-white">
                    {formatPhp(pricing.estimatedTotalPhp)}
                  </span>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-4 mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm sm:text-base font-bold text-pink-100">
                    <span>Deposit to Reserve Date Today</span>
                    <span className="text-lg text-white">
                      {formatPhp(pricing.depositDueNowPhp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm text-white/75">
                    <span>Pay Later When Cake is Ready</span>
                    <span>{formatPhp(pricing.remainingBalancePhp)}</span>
                  </div>
                </div>
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
            <p className="text-sm sm:text-base text-[#5f3b49] mt-2 leading-relaxed">
              {confirmedOrder.status === "AWAITING_BAKER_QUOTE"
                ? "Your ₱300 deposit locked your event date! Because your order includes a custom photo or custom design modification, our baker will verify the final quote shortly."
                : "Your ₱300 deposit locked your kitchen slot and your cake design is confirmed immediately."}
            </p>

            <div className="my-5 rounded-2xl bg-[#fbf3f6] border border-[#e7cad5] p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Your Tracking Code</span>
                <span className="font-mono font-bold text-base text-[#250d16]">
                  {confirmedOrder.trackingCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Celebration Date</span>
                <span className="font-semibold text-[#250d16]">
                  {formatReadableDate(confirmedOrder.eventDateISO)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Deposit Paid Today</span>
                <span className="font-semibold text-emerald-700">
                  {formatPhp(confirmedOrder.depositPaidPhp)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#734a59]">Balance Due When Ready</span>
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
                className="flex-1 py-3.5 px-5 rounded-full bg-[#260e17] hover:bg-[#9e3b5c] text-white text-sm sm:text-base font-bold text-center transition-colors"
              >
                Track Order {confirmedOrder.trackingCode} →
              </Link>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="py-3.5 px-5 rounded-full bg-[#f5e4eb] hover:bg-[#ebd0db] text-[#351521] text-sm sm:text-base font-bold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
