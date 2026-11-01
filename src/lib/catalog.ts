/**
 * Canonical Marecakes Catalog, 16-Cell Flyer Price Matrix,
 * Rizal 14-Locality Fulfillment Rules & Asia/Manila (UTC+8) Calendar Math.
 *
 * Strictly aligned with `concepts_brief.md`.
 */

export type CategoryCode = "coquette" | "floral" | "birthday";
export type SpongeBase = "chiffon" | "moist";
export type SizeCode = "6x3" | "6x5" | "8x3" | "8x5" | "2-tier";
export type FlavorCode =
  | "chocolate"
  | "mocha"
  | "vanilla"
  | "ube"
  | "red_velvet"
  | "strawberry"
  | "pistachio";

export type FulfillmentMethod = "pickup" | "lalamove";
export type VehicleRequirement = "motorcycle_ok" | "car_mpv_required";

export type OrderWorkflowStatus =
  | "DEPOSIT_PAID_CONFIRMED"
  | "AWAITING_BAKER_QUOTE"
  | "PRICE_ADJUSTED_AWAITING_CUSTOMER"
  | "IN_KITCHEN_PREP"
  | "READY_AWAITING_BALANCE"
  | "COMPLETED";

export interface CategoryDefinition {
  code: CategoryCode;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  bundledNote: string;
  bundlesPrintedTopper: boolean;
  heroImage: string;
  startingPricePhp: number;
  maxPricePhp: number;
  highlights: string[];
}

export interface SizeMetadata {
  code: SizeCode;
  label: string;
  dimensionsLabel: string;
  servingsLabel: string;
  diameterInches: number;
  topTierDiameterInches?: number;
  heightInches: number;
  tiers: 1 | 2;
  layersCount: number;
  vehicleRequirement: VehicleRequirement;
  vehicleReason: string;
}

export interface PriceMatrixCell {
  skuId: string;
  category: CategoryCode;
  spongeBase: SpongeBase;
  size: SizeCode;
  pricePhp: number;
}

export interface FlavorDefinition {
  code: FlavorCode;
  name: string;
  originNote: string;
  tastingNotes: string;
  spongeColorHex: string;
  spongeDarkHex: string;
  fillingColorHex: string;
  fillingLabel: string;
  badge?: string;
}

export interface CatalogPresetDesign {
  id: string;
  title: string;
  subtitle: string;
  category: CategoryCode;
  defaultBase: SpongeBase;
  defaultSize: SizeCode;
  defaultFlavor: FlavorCode;
  imageSrc: string;
  badge: string;
  aestheticNotes: string;
}

export interface RizalLocalityInfo {
  name: string;
  zone: "West Rizal (Near Atelier)" | "Central Rizal" | "East / Lakefront Rizal";
  estTravelMinutes: string;
}

export interface VisionClassificationHint {
  is_cake: boolean;
  category_code: CategoryCode;
  suggested_tiers: 1 | 2;
  needs_manual_quote: boolean;
  visible_addon_hints: {
    has_custom_topper: boolean;
    has_number_candle: boolean;
  };
  confidence_note: string;
}

export const DEPOSIT_AMOUNT_PHP = 300;
export const ADDON_CUSTOM_TOPPER_PHP = 180;
export const ADDON_NUMBER_CANDLE_PHP = 25;
export const DAILY_KITCHEN_SLOT_LIMIT = 3;
export const MIN_ADVANCE_LEAD_DAYS = 7;

export const ATELIER_PICKUP_INFO = {
  municipality: "Taytay, Rizal",
  landmark: "Near Taytay Tiangge / Highway 2000 Atelier Pickup Point",
  hours: "10:00 AM – 6:00 PM (Tuesday to Sunday)",
  note: "Exact gate pin is sent via SMS/Messenger once your slot is confirmed.",
} as const;

export const CATEGORIES: Record<CategoryCode, CategoryDefinition> = {
  coquette: {
    code: "coquette",
    name: "Coquette & Vintage Ribbon Cakes",
    shortName: "Coquette Cakes",
    tagline: "Lambeth frills, satin bows, pearl borders & romantic piping",
    description:
      "Intricate vintage piping paired with silky satin ribbons and edible pearls. Available in both airy Chiffon and rich Moist sponge across four single-tier heights.",
    bundledNote: "Includes signature ribbon bows, Lambeth piping & cake dedication.",
    bundlesPrintedTopper: false,
    heroImage: "/cakes/cake-strawberry.png",
    startingPricePhp: 999,
    maxPricePhp: 3400,
    highlights: [
      "4 single-tier sizes (6×3 to 8×5)",
      "Available in Chiffon or Moist base",
      "Hand-tied satin ribbons & pearl accents",
    ],
  },
  floral: {
    code: "floral",
    name: "Mother's & Botanical Floral Cakes",
    shortName: "Mother's / Floral",
    tagline: "Hand-piped buttercream floral wreaths & sculptural petals",
    description:
      "Lush palette-knife and Russian-tip botanical arrangements. Exclusively baked in our sturdy 5-inch tall Moist sponge to support intricate floral crowns.",
    bundledNote: "Exclusively crafted in 5\" Tall Moist sponge for structural floral stability.",
    bundlesPrintedTopper: false,
    heroImage: "/cakes/cake-mint.png",
    startingPricePhp: 2200,
    maxPricePhp: 3500,
    highlights: [
      "Exclusively 5\" Tall Moist sponge",
      "Hand-piped botanical flower wreath",
      "Ideal for milestone tributes & moms",
    ],
  },
  birthday: {
    code: "birthday",
    name: "Customized Birthday Cakes",
    shortName: "Birthday & Toppers",
    tagline: "Bespoke celebration icing bundled with custom printed toppers",
    description:
      "Show-stopping celebration cakes from 5-inch tall cylinders up to grand 2-Tier centerpieces. Custom themed printed toppers and design accents are already included.",
    bundledNote: "Base price already includes Icing + Printed Theme Toppers/Design.",
    bundlesPrintedTopper: true,
    heroImage: "/cakes/cake-chocolate.png",
    startingPricePhp: 1500,
    maxPricePhp: 5600,
    highlights: [
      "Printed theme toppers included free",
      "Up to grand 2-Tier (8\" + 6\") scale",
      "Chiffon or Moist interior sponge",
    ],
  },
};

export const SIZE_METADATA: Record<SizeCode, SizeMetadata> = {
  "6x3": {
    code: "6x3",
    label: '6" × 3" Petite',
    dimensionsLabel: "6 in diameter × 3 in height",
    servingsLabel: "8–10 dessert servings",
    diameterInches: 6,
    heightInches: 3,
    tiers: 1,
    layersCount: 2,
    vehicleRequirement: "motorcycle_ok",
    vehicleReason:
      "Standard 3-inch profile fits level inside an insulated Lalamove motorcycle box with flat-base support.",
  },
  "6x5": {
    code: "6x5",
    label: '6" × 5" Tall',
    dimensionsLabel: "6 in diameter × 5 in tall",
    servingsLabel: "12–16 party servings",
    diameterInches: 6,
    heightInches: 5,
    tiers: 1,
    layersCount: 3,
    vehicleRequirement: "car_mpv_required",
    vehicleReason:
      "Tall 5-inch barrel height + box clearance tilts in motorcycle boxes. Must be booked via Lalamove Sedan/Car or MPV with AC on flat floor.",
  },
  "8x3": {
    code: "8x3",
    label: '8" × 3" Classic',
    dimensionsLabel: "8 in diameter × 3 in height",
    servingsLabel: "16–20 family servings",
    diameterInches: 8,
    heightInches: 3,
    tiers: 1,
    layersCount: 2,
    vehicleRequirement: "motorcycle_ok",
    vehicleReason:
      "Low center of gravity; car is recommended in warm afternoons, though large flat Lalamove thermal box works for short Rizal hops.",
  },
  "8x5": {
    code: "8x5",
    label: '8" × 5" Grand Tall',
    dimensionsLabel: "8 in diameter × 5 in tall",
    servingsLabel: "24–30 banquet servings",
    diameterInches: 8,
    heightInches: 5,
    tiers: 1,
    layersCount: 3,
    vehicleRequirement: "car_mpv_required",
    vehicleReason:
      "Heavy 8×5 tall structure requires air-conditioned Lalamove Car/MPV transport on a level passenger floorboard.",
  },
  "2-tier": {
    code: "2-tier",
    label: '2-Tier (8" + 6")',
    dimensionsLabel: '8" base tier + 6" crown tier (9.5" total cake height)',
    servingsLabel: "38–48 grand event servings",
    diameterInches: 8,
    topTierDiameterInches: 6,
    heightInches: 9.5,
    tiers: 2,
    layersCount: 6,
    vehicleRequirement: "car_mpv_required",
    vehicleReason:
      " internally doweled 2-Tier centerpiece strictly requires Store Pickup by car or Lalamove MPV/SUV with full AC.",
  },
};

/**
 * THE 16 OFFICIAL MARECAKES FLYER SKU CELLS
 * Do NOT synthesize prices via additive formulas; ~40% of pairs are intentionally disallowed.
 */
export const CANONICAL_PRICE_MATRIX: readonly PriceMatrixCell[] = [
  // 1. Coquette Cakes — 8 cells (Chiffon 999–2,700 | Moist 1,100–3,400)
  { skuId: "COQ-CHF-6X3", category: "coquette", spongeBase: "chiffon", size: "6x3", pricePhp: 999 },
  { skuId: "COQ-CHF-6X5", category: "coquette", spongeBase: "chiffon", size: "6x5", pricePhp: 1450 },
  { skuId: "COQ-CHF-8X3", category: "coquette", spongeBase: "chiffon", size: "8x3", pricePhp: 1950 },
  { skuId: "COQ-CHF-8X5", category: "coquette", spongeBase: "chiffon", size: "8x5", pricePhp: 2700 },
  { skuId: "COQ-MST-6X3", category: "coquette", spongeBase: "moist", size: "6x3", pricePhp: 1100 },
  { skuId: "COQ-MST-6X5", category: "coquette", spongeBase: "moist", size: "6x5", pricePhp: 1850 },
  { skuId: "COQ-MST-8X3", category: "coquette", spongeBase: "moist", size: "8x3", pricePhp: 2500 },
  { skuId: "COQ-MST-8X5", category: "coquette", spongeBase: "moist", size: "8x5", pricePhp: 3400 },

  // 2. Mother's / Floral Cakes — 2 cells (Moist ONLY: 6x5 @ 2,200 | 8x5 @ 3,500)
  { skuId: "FLR-MST-6X5", category: "floral", spongeBase: "moist", size: "6x5", pricePhp: 2200 },
  { skuId: "FLR-MST-8X5", category: "floral", spongeBase: "moist", size: "8x5", pricePhp: 3500 },

  // 3. Customized Birthday Cakes — 6 cells (6x5, 8x5, 2-Tier in Chiffon & Moist)
  { skuId: "BDY-CHF-6X5", category: "birthday", spongeBase: "chiffon", size: "6x5", pricePhp: 1500 },
  { skuId: "BDY-CHF-8X5", category: "birthday", spongeBase: "chiffon", size: "8x5", pricePhp: 2500 },
  { skuId: "BDY-CHF-2TR", category: "birthday", spongeBase: "chiffon", size: "2-tier", pricePhp: 4200 },
  { skuId: "BDY-MST-6X5", category: "birthday", spongeBase: "moist", size: "6x5", pricePhp: 2200 },
  { skuId: "BDY-MST-8X5", category: "birthday", spongeBase: "moist", size: "8x5", pricePhp: 3200 },
  { skuId: "BDY-MST-2TR", category: "birthday", spongeBase: "moist", size: "2-tier", pricePhp: 5600 },
] as const;

export const FLAVORS: readonly FlavorDefinition[] = [
  {
    code: "chocolate",
    name: "Belgian Dark Chocolate",
    originNote: "Dutch-processed dark cacao",
    tastingNotes: "Deep roasted cocoa crumb layered with velvety dark chocolate ganache",
    spongeColorHex: "#4A2518",
    spongeDarkHex: "#31160D",
    fillingColorHex: "#241009",
    fillingLabel: "Dark Ganache Whip",
    badge: "Most Ordered",
  },
  {
    code: "ube",
    name: "Artisanal Ube Halaya",
    originNote: "Real purple yam halaya fold",
    tastingNotes: "Fragrant Filipino purple yam sponge swirled with creamy ube halaya custard",
    spongeColorHex: "#7A49A5",
    spongeDarkHex: "#5B3282",
    fillingColorHex: "#A174CB",
    fillingLabel: "Real Ube Halaya Cream",
    badge: "Rizal Favorite",
  },
  {
    code: "strawberry",
    name: "Strawberry Chantilly",
    originNote: "Sweet berry reduction",
    tastingNotes: "Blush pink strawberry crumb paired with whipped berry compote",
    spongeColorHex: "#E88CA5",
    spongeDarkHex: "#C96A85",
    fillingColorHex: "#FAD2DF",
    fillingLabel: "Berry Compote Cream",
    badge: "Coquette Pick",
  },
  {
    code: "red_velvet",
    name: "Classic Red Velvet",
    originNote: "Buttermilk & hint of cocoa",
    tastingNotes: " Silky crimson buttermilk crumb balanced by tangy whipped cream cheese",
    spongeColorHex: "#9E2432",
    spongeDarkHex: "#781722",
    fillingColorHex: "#FFF7EE",
    fillingLabel: "Whipped Cream Cheese",
  },
  {
    code: "pistachio",
    name: "Roasted Pistachio",
    originNote: "Finely ground pistachio paste",
    tastingNotes: "Nutty aromatic green pistachio sponge layered with praline mascarpone",
    spongeColorHex: "#9AB377",
    spongeDarkHex: "#799357",
    fillingColorHex: "#DCE8C6",
    fillingLabel: "Pistachio Mascarpone",
    badge: "Chef's Signature",
  },
  {
    code: "mocha",
    name: "Espresso Mocha",
    originNote: " Highland arabica espresso",
    tastingNotes: "Aromatic coffee-cocoa sponge finished with silky espresso buttercream",
    spongeColorHex: "#6D4632",
    spongeDarkHex: "#4F3020",
    fillingColorHex: "#B58D73",
    fillingLabel: "Espresso Mousseline",
  },
  {
    code: "vanilla",
    name: "Madagascar Vanilla",
    originNote: "Pure vanilla bean custard",
    tastingNotes: "Golden butter-vanilla sponge with delicate diplomat pastry cream",
    spongeColorHex: "#F2D59B",
    spongeDarkHex: "#D9B673",
    fillingColorHex: "#FFFDF7",
    fillingLabel: "Vanilla Bean Diplomat",
  },
] as const;

export const CATALOG_PRESETS: readonly CatalogPresetDesign[] = [
  {
    id: "rose-coquette-blush",
    title: "Blush Coquette Berry Ribbon",
    subtitle: "Satin bows, Lambeth vintage frills & rose-berry glaze",
    category: "coquette",
    defaultBase: "chiffon",
    defaultSize: "6x5",
    defaultFlavor: "strawberry",
    imageSrc: "/cakes/cake-strawberry.png",
    badge: "Coquette Signature",
    aestheticNotes: "Soft blush palette with vintage piped swags",
  },
  {
    id: "belgian-cocoa-celebration",
    title: "Grand Cocoa Birthday Crown",
    subtitle: "Rich chocolate drip, truffle rosettes & custom birthday topper",
    category: "birthday",
    defaultBase: "moist",
    defaultSize: "8x5",
    defaultFlavor: "chocolate",
    imageSrc: "/cakes/cake-chocolate.png",
    badge: "Bestseller",
    aestheticNotes: "Glossy dark ganache drip with berry & truffle crown",
  },
  {
    id: "pastel-garden-tribute",
    title: "Tiffany Mint Botanical Wreath",
    subtitle: "Pastel mint buttercream piping, ivory rosettes & ruby cherries",
    category: "floral",
    defaultBase: "moist",
    defaultSize: "6x5",
    defaultFlavor: "pistachio",
    imageSrc: "/cakes/cake-mint.png",
    badge: "Mother's Tribute",
    aestheticNotes: "5-inch tall Moist sponge supporting lush piped crests",
  },
  {
    id: "atelier-bespoke-celebration",
    title: "Bespoke Multi-Theme Centerpiece",
    subtitle: "Custom celebration palette with included printed theme toppers",
    category: "birthday",
    defaultBase: "moist",
    defaultSize: "2-tier",
    defaultFlavor: "ube",
    imageSrc: "/cakes/cake-slices.png",
    badge: "2-Tier Showcase",
    aestheticNotes: "Showcases Marecakes' vibrant interior flavor craft",
  },
] as const;

/**
 * Official 14 Localities of Rizal Province (1 City + 13 Municipalities)
 */
export const RIZAL_LOCALITIES: readonly RizalLocalityInfo[] = [
  { name: "Taytay", zone: "West Rizal (Near Atelier)", estTravelMinutes: "10–20 mins" },
  { name: "Cainta", zone: "West Rizal (Near Atelier)", estTravelMinutes: "15–25 mins" },
  { name: "Angono", zone: "West Rizal (Near Atelier)", estTravelMinutes: "15–25 mins" },
  { name: "Antipolo City", zone: "West Rizal (Near Atelier)", estTravelMinutes: "20–40 mins" },
  { name: "Binangonan", zone: "Central Rizal", estTravelMinutes: "25–40 mins" },
  { name: "San Mateo", zone: "Central Rizal", estTravelMinutes: "35–50 mins" },
  { name: "Teresa", zone: "Central Rizal", estTravelMinutes: "30–45 mins" },
  { name: "Rodriguez (Montalban)", zone: "Central Rizal", estTravelMinutes: "45–65 mins" },
  { name: "Morong", zone: "Central Rizal", estTravelMinutes: "40–55 mins" },
  { name: "Cardona", zone: "Central Rizal", estTravelMinutes: "35–50 mins" },
  { name: "Baras", zone: "East / Lakefront Rizal", estTravelMinutes: "45–60 mins" },
  { name: "Tanay", zone: "East / Lakefront Rizal", estTravelMinutes: "55–75 mins" },
  { name: "Pililla", zone: "East / Lakefront Rizal", estTravelMinutes: "60–80 mins" },
  { name: "Jalajala", zone: "East / Lakefront Rizal", estTravelMinutes: "75–95 mins" },
] as const;

export function getValidBasesForCategory(category: CategoryCode): SpongeBase[] {
  const bases = new Set<SpongeBase>();
  for (const cell of CANONICAL_PRICE_MATRIX) {
    if (cell.category === category) {
      bases.add(cell.spongeBase);
    }
  }
  return Array.from(bases);
}

export function getValidSizesForCategoryAndBase(
  category: CategoryCode,
  spongeBase: SpongeBase
): SizeCode[] {
  const sizes: SizeCode[] = [];
  for (const cell of CANONICAL_PRICE_MATRIX) {
    if (cell.category === category && cell.spongeBase === spongeBase) {
      sizes.push(cell.size);
    }
  }
  return sizes;
}

export function lookupSkuCell(
  category: CategoryCode,
  spongeBase: SpongeBase,
  size: SizeCode
): PriceMatrixCell | null {
  return (
    CANONICAL_PRICE_MATRIX.find(
      (c) =>
        c.category === category &&
        c.spongeBase === spongeBase &&
        c.size === size
    ) ?? null
  );
}

export function ensureValidSelection(
  category: CategoryCode,
  preferredBase: SpongeBase,
  preferredSize: SizeCode
): { spongeBase: SpongeBase; size: SizeCode; cell: PriceMatrixCell } {
  const validBases = getValidBasesForCategory(category);
  const resolvedBase = validBases.includes(preferredBase)
    ? preferredBase
    : validBases[0];

  const validSizes = getValidSizesForCategoryAndBase(category, resolvedBase);
  const resolvedSize = validSizes.includes(preferredSize)
    ? preferredSize
    : validSizes[0];

  const cell = lookupSkuCell(category, resolvedBase, resolvedSize);
  if (!cell) {
    throw new Error(
      `Invalid canonical price matrix configuration for (${category}, ${resolvedBase}, ${resolvedSize})`
    );
  }

  return { spongeBase: resolvedBase, size: resolvedSize, cell };
}

export interface PriceCalculationInput {
  category: CategoryCode;
  spongeBase: SpongeBase;
  size: SizeCode;
  includeCustomTopper: boolean;
  numberCandleCount: number;
  isCustomPhotoOrInstructions: boolean;
}

export interface CalculatedOrderPricing {
  skuId: string;
  basePricePhp: number;
  topperAddonPhp: number;
  candlesAddonPhp: number;
  estimatedTotalPhp: number;
  depositDueNowPhp: number;
  remainingBalancePhp: number;
  requiresBakerReview: boolean;
}

export function calculateOrderPricing(
  input: PriceCalculationInput
): CalculatedOrderPricing {
  const { cell } = ensureValidSelection(
    input.category,
    input.spongeBase,
    input.size
  );

  const safeCandleQty = Math.max(0, Math.min(4, Math.floor(input.numberCandleCount)));
  const topperAddonPhp = input.includeCustomTopper ? ADDON_CUSTOM_TOPPER_PHP : 0;
  const candlesAddonPhp = safeCandleQty * ADDON_NUMBER_CANDLE_PHP;
  const estimatedTotalPhp = cell.pricePhp + topperAddonPhp + candlesAddonPhp;

  return {
    skuId: cell.skuId,
    basePricePhp: cell.pricePhp,
    topperAddonPhp,
    candlesAddonPhp,
    estimatedTotalPhp,
    depositDueNowPhp: DEPOSIT_AMOUNT_PHP,
    remainingBalancePhp: Math.max(0, estimatedTotalPhp - DEPOSIT_AMOUNT_PHP),
    requiresBakerReview: input.isCustomPhotoOrInstructions,
  };
}

/**
 * Format whole-Peso currency cleanly: e.g., ₱1,500
 */
export function formatPhp(amount: number): string {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

/**
 * Normalize any Date to YYYY-MM-DD in `Asia/Manila` (`UTC+8`)
 * Prevents UTC vs Manila midnight-to-8AM off-by-one lead time bugs.
 */
export function toManilaDateISO(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // returns YYYY-MM-DD
}

export function addDaysToISODate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "Select a date";
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}
