"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CANONICAL_PRICE_MATRIX,
  CATEGORIES,
  CategoryCode,
  SIZE_METADATA,
  SizeCode,
  SpongeBase,
  ensureValidSelection,
  formatPhp,
  lookupSkuCell,
} from "@/lib/catalog";
import { ScrollReveal } from "./ScrollReveal";
import {
  Sparkles,
  Check,
  Car,
  Bike,
  Table2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Gift,
} from "lucide-react";

interface CatalogSectionProps {
  onSelectSkuForStudio?: (selection: {
    category: CategoryCode;
    spongeBase: SpongeBase;
    size: SizeCode;
  }) => void;
}

const ALL_CATEGORIES: CategoryCode[] = ["coquette", "floral", "birthday"];
const ALL_BASES: SpongeBase[] = ["chiffon", "moist"];
const ALL_SIZES: SizeCode[] = ["6x3", "6x5", "8x3", "8x5", "2-tier"];

export function CatalogSection({ onSelectSkuForStudio }: CatalogSectionProps) {
  // Per-category interactive SKU explorer state
  const [cardSelections, setCardSelections] = useState<
    Record<CategoryCode, { spongeBase: SpongeBase; size: SizeCode }>
  >({
    coquette: { spongeBase: "chiffon", size: "6x5" },
    floral: { spongeBase: "moist", size: "6x5" },
    birthday: { spongeBase: "moist", size: "8x5" },
  });

  const [showFullFlyerMatrix, setShowFullFlyerMatrix] = useState(false);

  const handleBaseChange = (category: CategoryCode, nextBase: SpongeBase) => {
    setCardSelections((prev) => {
      const current = prev[category];
      const valid = ensureValidSelection(category, nextBase, current.size);
      return {
        ...prev,
        [category]: { spongeBase: valid.spongeBase, size: valid.size },
      };
    });
  };

  const handleSizeChange = (category: CategoryCode, nextSize: SizeCode) => {
    setCardSelections((prev) => {
      const current = prev[category];
      const cell = lookupSkuCell(category, current.spongeBase, nextSize);
      if (!cell) return prev;
      return {
        ...prev,
        [category]: { spongeBase: current.spongeBase, size: nextSize },
      };
    });
  };

  return (
    <section
      id="collection"
      className="py-20 sm:py-28 px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 bg-[#f9eef2] text-[#2a121b] relative"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <ScrollReveal direction="up">
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#8f3857] font-semibold">
              <Sparkles size={13} />
              <span>Official 16-SKU Flyer Menu</span>
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#250d16] tracking-tight mt-2">
              Three Signature Cake Collections
            </h2>
            <p className="text-[#633f4d] text-base sm:text-lg max-w-2xl mt-3">
              Select a sponge base and tier dimension on any collection below to
              check exact whole-Peso pricing, serving scale, and transport
              guidelines.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delayMs={100}>
            <button
              type="button"
              onClick={() => setShowFullFlyerMatrix((v) => !v)}
              className="tactile-press inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#dfbCC8] text-[#351521] text-xs sm:text-sm font-semibold shadow-sm hover:border-[#a64264] cursor-pointer"
            >
              <Table2 size={15} className="text-[#a64264]" />
              <span>
                {showFullFlyerMatrix
                  ? "Hide 16-Cell Flyer Table"
                  : "Compare All 16 Flyer Prices"}
              </span>
              {showFullFlyerMatrix ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}
            </button>
          </ScrollReveal>
        </div>

        {/* Collapsible Full 16-Cell Flyer Matrix Ledger */}
        {showFullFlyerMatrix && (
          <div className="mb-14 rounded-3xl bg-white border border-[#e3c2ce] p-5 sm:p-8 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-[#f0dde4]">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#250d16]">
                  Marecakes Canonical 16-Cell Flyer Price Matrix
                </h3>
                <p className="text-xs sm:text-sm text-[#6b4553]">
                  Click any active Peso price cell to load that exact SKU into
                  the Studio Configurator. Dashed cells (`—`) are intentionally
                  not offered for structural reasons.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#fae8ef] text-[#8d2f50] self-start sm:self-auto">
                16 Official SKUs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#ecd7df] text-[11px] font-mono uppercase tracking-wider text-[#7f5262]">
                    <th className="py-3 pr-4">Category & Base</th>
                    {ALL_SIZES.map((sz) => (
                      <th key={sz} className="py-3 px-3 text-center">
                        <div className="font-bold text-[#2a121b]">
                          {SIZE_METADATA[sz].label}
                        </div>
                        <div className="text-[10px] font-normal text-[#8b6271]">
                          {SIZE_METADATA[sz].servingsLabel}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4e5eb] text-sm">
                  {ALL_CATEGORIES.flatMap((cat) =>
                    ALL_BASES.map((base) => {
                      const rowHasAny = CANONICAL_PRICE_MATRIX.some(
                        (c) => c.category === cat && c.spongeBase === base
                      );
                      return (
                        <tr
                          key={`${cat}-${base}`}
                          className={
                            rowHasAny ? "hover:bg-[#fdf6f8]" : "bg-[#faf4f6]/60 opacity-60"
                          }
                        >
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-[#260e17]">
                              {CATEGORIES[cat].shortName}
                            </div>
                            <div className="text-xs text-[#7c5161] capitalize">
                              {base} Sponge
                            </div>
                          </td>
                          {ALL_SIZES.map((sz) => {
                            const cell = lookupSkuCell(cat, base, sz);
                            if (!cell) {
                              return (
                                <td
                                  key={sz}
                                  className="py-3.5 px-3 text-center text-xs text-[#b79aa5] font-mono"
                                  title="Not offered in this sponge/dimension combination"
                                >
                                  —
                                </td>
                              );
                            }
                            return (
                              <td key={sz} className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSelectSkuForStudio?.({
                                      category: cat,
                                      spongeBase: base,
                                      size: sz,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#fbeaf0] hover:bg-[#9e3b5c] text-[#802746] hover:text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                                >
                                  {formatPhp(cell.pricePhp)}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3 Category Interactive Showcase Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {ALL_CATEGORIES.map((catCode, idx) => {
            const cat = CATEGORIES[catCode];
            const current = cardSelections[catCode];
            const resolved = ensureValidSelection(
              catCode,
              current.spongeBase,
              current.size
            );
            const sizeMeta = SIZE_METADATA[resolved.size];

            return (
              <ScrollReveal
                key={catCode}
                direction="up"
                delayMs={idx * 100}
                className="flex"
              >
                <article className="flex flex-col justify-between w-full rounded-3xl bg-white border border-[#e6c8d3] overflow-hidden shadow-[0_18px_42px_-18px_rgba(85,18,42,0.14)] hover:shadow-[0_24px_52px_-16px_rgba(85,18,42,0.22)] transition-shadow duration-300">
                  {/* Top Visual Studio Pedestal */}
                  <div>
                    <div className="relative h-60 bg-gradient-to-b from-[#b45373] via-[#ca708f] to-[#e49cb5] flex items-center justify-center p-6 overflow-hidden group">
                      {/* Price range pill */}
                      <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/25 text-white text-xs font-medium">
                        {formatPhp(cat.startingPricePhp)} –{" "}
                        {formatPhp(cat.maxPricePhp)}
                      </div>

                      {cat.bundlesPrintedTopper && (
                        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 rounded-full bg-white/90 text-[#852d4b] text-[11px] font-bold inline-flex items-center gap-1 shadow-sm">
                          <Gift size={12} />
                          <span>Toppers Included</span>
                        </div>
                      )}

                      <div className="relative w-48 h-48 transition-transform duration-500 group-hover:scale-108">
                        <Image
                          src={cat.heroImage}
                          alt={cat.name}
                          fill
                          sizes="220px"
                          className="object-contain drop-shadow-[0_18px_22px_rgba(55,10,25,0.38)]"
                        />
                      </div>
                    </div>

                    {/* Copy & Highlights */}
                    <div className="p-6 sm:p-7 pb-4">
                      <h3 className="font-display text-2xl font-bold text-[#250d16]">
                        {cat.shortName}
                      </h3>
                      <p className="text-xs font-medium text-[#963d5d] mt-1">
                        {cat.tagline}
                      </p>
                      <p className="text-sm text-[#613d4b] mt-3 leading-relaxed">
                        {cat.description}
                      </p>

                      {/* Inline Sponge Picker */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#7e5262] mb-1.5">
                          <span>Sponge Base</span>
                          {catCode === "floral" && (
                            <span className="text-[#9e3b5c] font-semibold">
                              Moist Exclusive
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_BASES.map((base) => {
                            const baseAllowed = CANONICAL_PRICE_MATRIX.some(
                              (c) =>
                                c.category === catCode && c.spongeBase === base
                            );
                            const isSelected = resolved.spongeBase === base;
                            return (
                              <button
                                key={base}
                                type="button"
                                disabled={!baseAllowed}
                                onClick={() => handleBaseChange(catCode, base)}
                                className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                                  !baseAllowed
                                    ? "bg-[#f7f1f3] text-[#b79ea8] border-[#eee0e5] cursor-not-allowed line-through"
                                    : isSelected
                                    ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm cursor-pointer"
                                    : "bg-[#fcf7f9] hover:bg-[#f7e8ee] text-[#3a1725] border-[#e4c6d1] cursor-pointer"
                                }`}
                              >
                                {base}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Inline Size Picker */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#7e5262] mb-1.5">
                          <span>Tier Dimension</span>
                          <span>{sizeMeta.servingsLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_SIZES.map((sz) => {
                            const cell = lookupSkuCell(
                              catCode,
                              resolved.spongeBase,
                              sz
                            );
                            const isSelected = resolved.size === sz;
                            return (
                              <button
                                key={sz}
                                type="button"
                                disabled={!cell}
                                onClick={() => handleSizeChange(catCode, sz)}
                                title={
                                  cell
                                    ? `${SIZE_METADATA[sz].dimensionsLabel} — ${formatPhp(cell.pricePhp)}`
                                    : `Not offered for ${cat.shortName}`
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                  !cell
                                    ? "bg-[#f8f3f5] text-[#c2aab3] border-[#efe3e8] cursor-not-allowed"
                                    : isSelected
                                    ? "bg-[#9e3b5c] text-white border-[#9e3b5c] shadow-sm cursor-pointer"
                                    : "bg-white hover:bg-[#fae9ef] text-[#3a1725] border-[#e2c3ce] cursor-pointer"
                                }`}
                              >
                                {sz.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Live Price & Action Footer */}
                  <div className="px-6 sm:px-7 pb-6 pt-4 border-t border-[#f2e2e8] bg-[#fdf9fa]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] font-mono text-[#7d5262]">
                          SKU: {resolved.cell.skuId}
                        </div>
                        <div className="font-display text-2xl font-bold text-[#250d16]">
                          {formatPhp(resolved.cell.pricePhp)}
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          sizeMeta.vehicleRequirement === "car_mpv_required"
                            ? "bg-amber-50 text-amber-900 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {sizeMeta.vehicleRequirement === "car_mpv_required" ? (
                          <>
                            <Car size={13} />
                            <span>Car / MPV Required</span>
                          </>
                        ) : (
                          <>
                            <Bike size={13} />
                            <span>Moto Box OK</span>
                          </>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-1 mb-4">
                      {cat.highlights.map((item) => (
                        <li
                          key={item}
                          className="text-xs text-[#64404e] flex items-center gap-1.5"
                        >
                          <Check
                            size={13}
                            className="text-[#a64264] flex-shrink-0"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() =>
                        onSelectSkuForStudio?.({
                          category: catCode,
                          spongeBase: resolved.spongeBase,
                          size: resolved.size,
                        })
                      }
                      className="tactile-press w-full py-3 px-4 rounded-xl bg-[#260e17] hover:bg-[#9e3b5c] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Customize This Design</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
