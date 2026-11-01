"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  CATEGORIES,
  CategoryCode,
  FLAVORS,
  FlavorCode,
  SIZE_METADATA,
  SizeCode,
  SpongeBase,
  VisionClassificationHint,
} from "@/lib/catalog";
import { Car, Bike, Eye, Layers, Sparkles, Gift, AlertTriangle } from "lucide-react";

interface CutawayVisualizerProps {
  designSource: "catalog" | "custom_upload";
  referenceImageUrl: string;
  referenceTitle: string;
  visionHint?: VisionClassificationHint | null;
  category: CategoryCode;
  spongeBase: SpongeBase;
  size: SizeCode;
  flavor: FlavorCode;
  includeCustomTopper: boolean;
  numberCandleCount: number;
  numberCandleDigits: string;
  cakeDedication: string;
}

/**
 * Dual-view visualizer mandated by `concepts_brief.md` §3:
 * 1. "Your Exterior Design Reference" (2D catalog or uploaded photo + dedication plaque)
 * 2. "Interior Cutaway & Size Scale Preview" (hardware-accelerated 2D/SVG architectural cross-section
 *    with inch ruler, stemmed glass scale silhouette, Chiffon vs Moist crumb pores, live flavor layers,
 *    and topper/candle crown — zero WebGL crash risk in Messenger/IG mobile WebViews).
 */
export function CutawayVisualizer({
  designSource,
  referenceImageUrl,
  referenceTitle,
  visionHint,
  category,
  spongeBase,
  size,
  flavor,
  includeCustomTopper,
  numberCandleCount,
  numberCandleDigits,
  cakeDedication,
}: CutawayVisualizerProps) {
  const [mobilePane, setMobilePane] = useState<"both" | "exterior" | "cutaway">(
    "both"
  );

  const catInfo = CATEGORIES[category];
  const sizeMeta = SIZE_METADATA[size];
  const flavorInfo = FLAVORS.find((f) => f.code === flavor) ?? FLAVORS[0];

  // Scale math: 1 inch = 17 SVG units
  const PX_PER_INCH = 17;
  const baseBottomY = 232;
  const bottomWidth = sizeMeta.diameterInches * PX_PER_INCH; // 6"=102, 8"=136
  const singleOrBottomHeight =
    sizeMeta.tiers === 2 ? 5 * PX_PER_INCH : sizeMeta.heightInches * PX_PER_INCH;
  const topTierWidth = (sizeMeta.topTierDiameterInches ?? 6) * PX_PER_INCH;
  const topTierHeight = sizeMeta.tiers === 2 ? 4.5 * PX_PER_INCH : 0;

  const centerX = 168;
  const bottomTierTopY = baseBottomY - singleOrBottomHeight;
  const topTierTopY =
    sizeMeta.tiers === 2 ? bottomTierTopY - topTierHeight : bottomTierTopY;

  const showTopperOnCrown =
    includeCustomTopper || catInfo.bundlesPrintedTopper;

  const bottomLayerCount = sizeMeta.heightInches === 3 ? 2 : 3;

  return (
    <div className="rounded-3xl bg-white border border-[#e5c5d1] p-5 sm:p-6 shadow-[0_20px_50px_-20px_rgba(85,16,40,0.15)]">
      {/* Header & Mobile View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#f1dfe6]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#943a59] font-semibold">
            Live Dual Studio Preview
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold text-[#250d16]">
            Exterior Reference & Architectural Cutaway
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-[#f8ebf0] p-1 rounded-full border border-[#e7cbd5] sm:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("exterior")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mobilePane === "exterior"
                ? "bg-[#2b101b] text-white"
                : "text-[#633e4c]"
            }`}
          >
            Exterior
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("cutaway")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mobilePane === "cutaway"
                ? "bg-[#2b101b] text-white"
                : "text-[#633e4c]"
            }`}
          >
            Cutaway
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("both")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              mobilePane === "both"
                ? "bg-[#2b101b] text-white"
                : "text-[#633e4c]"
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Dual Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PANE 1: Your Exterior Design Reference */}
        <div
          className={`${
            mobilePane === "cutaway" ? "hidden sm:flex" : "flex"
          } flex-col justify-between rounded-2xl bg-gradient-to-b from-[#a84867] via-[#c66a89] to-[#df94ae] text-white p-5 relative overflow-hidden min-h-[320px]`}
        >
          <div className="flex items-center justify-between gap-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
              <Eye size={12} />
              <span>Your Exterior Design Reference</span>
            </span>
            <span className="text-[11px] font-mono bg-white/20 px-2.5 py-0.5 rounded-full">
              {designSource === "custom_upload" ? "Custom Photo" : "Catalog 2D"}
            </span>
          </div>

          {/* Center Image */}
          <div className="relative my-4 flex-1 flex items-center justify-center">
            {designSource === "custom_upload" ? (
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-white/60 shadow-xl bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referenceImageUrl}
                  alt="Uploaded custom cake reference"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative w-48 h-48 animate-float-gentle">
                <Image
                  src={referenceImageUrl}
                  alt={referenceTitle}
                  fill
                  sizes="200px"
                  className="object-contain drop-shadow-[0_18px_22px_rgba(50,8,22,0.4)]"
                />
              </div>
            )}
          </div>

          {/* AI Vision Hint or Bundled Note + Live Dedication Plaque */}
          <div className="space-y-2 relative z-10">
            {visionHint && designSource === "custom_upload" && (
              <div className="rounded-xl bg-black/30 backdrop-blur-md border border-white/25 px-3 py-2 text-[11px] leading-snug">
                <div className="font-semibold text-pink-100 flex items-center gap-1.5">
                  <Sparkles size={12} />
                  <span>AI Vision Enum Pre-Classification</span>
                </div>
                <p className="text-white/85 mt-0.5">{visionHint.confidence_note}</p>
              </div>
            )}

            <div className="rounded-xl bg-white/16 backdrop-blur-md border border-white/30 px-3.5 py-2.5">
              <div className="text-[10px] uppercase tracking-widest text-pink-100/85">
                Board / Icing Dedication Preview
              </div>
              <div className="font-display text-sm font-semibold text-white truncate mt-0.5">
                {cakeDedication.trim()
                  ? `“${cakeDedication.trim()}”`
                  : "“Add your free cake greeting below...”"}
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: Interior Cutaway & Size Scale Preview */}
        <div
          className={`${
            mobilePane === "exterior" ? "hidden sm:flex" : "flex"
          } flex-col justify-between rounded-2xl bg-[#fcf6f8] border border-[#ead0da] p-5 min-h-[320px]`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider bg-[#f4e0e7] text-[#862c4b] px-2.5 py-1 rounded-full">
              <Layers size={12} />
              <span>Interior Cutaway & Size Scale</span>
            </span>
            <span className="text-[11px] font-mono text-[#7c5161] font-semibold">
              {sizeMeta.label}
            </span>
          </div>

          {/* Calibrated Architectural Cross-Section SVG */}
          <div className="my-2 flex-1 flex items-center justify-center">
            <svg
              viewBox="0 0 290 258"
              className="w-full h-full max-h-[225px]"
              role="img"
              aria-label={`Architectural cutaway of ${sizeMeta.label} ${spongeBase} ${flavorInfo.name} cake`}
            >
              <defs>
                <pattern
                  id="cutaway-crumb-pattern"
                  width={spongeBase === "chiffon" ? "9" : "5.5"}
                  height={spongeBase === "chiffon" ? "9" : "5.5"}
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx={spongeBase === "chiffon" ? "4" : "2.2"}
                    cy={spongeBase === "chiffon" ? "4" : "2.2"}
                    r={spongeBase === "chiffon" ? "1.5" : "0.9"}
                    fill={flavorInfo.spongeDarkHex}
                    fillOpacity={spongeBase === "chiffon" ? "0.35" : "0.5"}
                  />
                </pattern>
              </defs>

              {/* Left Calibrated Inch Ruler (0" to 10") */}
              <line
                x1="28"
                y1={baseBottomY - 10 * PX_PER_INCH}
                x2="28"
                y2={baseBottomY}
                stroke="#cfaab8"
                strokeWidth="1.5"
              />
              {[0, 3, 5, 8, 10].map((inch) => {
                const y = baseBottomY - inch * PX_PER_INCH;
                return (
                  <g key={inch}>
                    <line
                      x1="23"
                      y1={y}
                      x2="33"
                      y2={y}
                      stroke="#b58597"
                      strokeWidth="1.2"
                    />
                    <text
                      x="18"
                      y={y + 3}
                      textAnchor="end"
                      fontSize="8.5"
                      fill="#86596a"
                      fontFamily="monospace"
                    >
                      {inch}&quot;
                    </text>
                  </g>
                );
              })}

              {/* Reference 6-inch Stemmed Flute Silhouette on Right for Real-World Scale */}
              <g opacity="0.48">
                {/* 6" tall glass = 102px */}
                <path
                  d={`M258 ${baseBottomY} L274 ${baseBottomY} M266 ${baseBottomY} L266 ${
                    baseBottomY - 44
                  } M257 ${baseBottomY - 102} L275 ${
                    baseBottomY - 102
                  } L272 ${baseBottomY - 48} Q266 ${
                    baseBottomY - 42
                  } 260 ${baseBottomY - 48} Z`}
                  fill="#ead3dc"
                  stroke="#9f6d7f"
                  strokeWidth="1.3"
                />
                <text
                  x="266"
                  y={baseBottomY + 13}
                  textAnchor="middle"
                  fontSize="7.5"
                  fill="#7e5363"
                >
                  6&quot; Glass
                </text>
              </g>

              {/* Cake Board Pedestal */}
              <rect
                x={centerX - bottomWidth / 2 - 12}
                y={baseBottomY}
                width={bottomWidth + 24}
                height="6"
                rx="3"
                fill="#d9b4c2"
              />

              {/* BOTTOM (OR SINGLE) TIER OUTER FROSTING SHELL */}
              <rect
                x={centerX - bottomWidth / 2}
                y={bottomTierTopY}
                width={bottomWidth}
                height={singleOrBottomHeight}
                rx="6"
                fill="#fff9fb"
                stroke="#d8a7b9"
                strokeWidth="2"
              />

              {/* BOTTOM TIER SPONGE & FILLING LAYERS */}
              {Array.from({ length: bottomLayerCount }).map((_, idx) => {
                const pad = 6;
                const innerH = singleOrBottomHeight - pad * 2;
                const seamH = 5;
                const spongeH =
                  (innerH - (bottomLayerCount - 1) * seamH) / bottomLayerCount;
                const y = bottomTierTopY + pad + idx * (spongeH + seamH);

                return (
                  <g key={`btm-${idx}`}>
                    <rect
                      x={centerX - bottomWidth / 2 + pad}
                      y={y}
                      width={bottomWidth - pad * 2}
                      height={spongeH}
                      rx="3"
                      fill={flavorInfo.spongeColorHex}
                    />
                    <rect
                      x={centerX - bottomWidth / 2 + pad}
                      y={y}
                      width={bottomWidth - pad * 2}
                      height={spongeH}
                      rx="3"
                      fill="url(#cutaway-crumb-pattern)"
                    />
                    {idx < bottomLayerCount - 1 && (
                      <rect
                        x={centerX - bottomWidth / 2 + pad}
                        y={y + spongeH}
                        width={bottomWidth - pad * 2}
                        height={seamH}
                        fill={flavorInfo.fillingColorHex}
                      />
                    )}
                  </g>
                );
              })}

              {/* OPTIONAL SECOND TIER (FOR 2-TIER 8" + 6") */}
              {sizeMeta.tiers === 2 && (
                <g>
                  {/* Structural Center Dowels */}
                  {[-18, 0, 18].map((dx) => (
                    <line
                      key={dx}
                      x1={centerX + dx}
                      y1={bottomTierTopY + 4}
                      x2={centerX + dx}
                      y2={baseBottomY - 4}
                      stroke="rgba(255,255,255,0.55)"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                  ))}

                  <rect
                    x={centerX - topTierWidth / 2}
                    y={topTierTopY}
                    width={topTierWidth}
                    height={topTierHeight}
                    rx="6"
                    fill="#fff9fb"
                    stroke="#d8a7b9"
                    strokeWidth="2"
                  />

                  {[0, 1, 2].map((idx) => {
                    const pad = 5;
                    const innerH = topTierHeight - pad * 2;
                    const seamH = 4.5;
                    const spongeH = (innerH - 2 * seamH) / 3;
                    const y = topTierTopY + pad + idx * (spongeH + seamH);
                    return (
                      <g key={`top-${idx}`}>
                        <rect
                          x={centerX - topTierWidth / 2 + pad}
                          y={y}
                          width={topTierWidth - pad * 2}
                          height={spongeH}
                          rx="2.5"
                          fill={flavorInfo.spongeColorHex}
                        />
                        <rect
                          x={centerX - topTierWidth / 2 + pad}
                          y={y}
                          width={topTierWidth - pad * 2}
                          height={spongeH}
                          rx="2.5"
                          fill="url(#cutaway-crumb-pattern)"
                        />
                        {idx < 2 && (
                          <rect
                            x={centerX - topTierWidth / 2 + pad}
                            y={y + spongeH}
                            width={topTierWidth - pad * 2}
                            height={seamH}
                            fill={flavorInfo.fillingColorHex}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* CROWN ADD-ONS: CUSTOM TOPPER PLAQUE & NUMBER CANDLES */}
              {showTopperOnCrown && (
                <g>
                  <line
                    x1={centerX - 12}
                    y1={topTierTopY}
                    x2={centerX - 12}
                    y2={topTierTopY - 14}
                    stroke="#b97a90"
                    strokeWidth="2"
                  />
                  <rect
                    x={centerX - 38}
                    y={topTierTopY - 34}
                    width="52"
                    height="20"
                    rx="5"
                    fill="#9e3b5c"
                  />
                  <text
                    x={centerX - 12}
                    y={topTierTopY - 21}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#ffffff"
                  >
                    TOPPER
                  </text>
                </g>
              )}

              {numberCandleCount > 0 && (
                <g>
                  <rect
                    x={centerX + 18}
                    y={topTierTopY - 24}
                    width="18"
                    height="24"
                    rx="4"
                    fill="#fff0c2"
                    stroke="#d99b26"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={centerX + 27}
                    cy={topTierTopY - 29}
                    r="3.5"
                    fill="#ff9800"
                  />
                  <text
                    x={centerX + 27}
                    y={topTierTopY - 9}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#8c5300"
                  >
                    {numberCandleDigits.trim().slice(0, 2) ||
                      `×${numberCandleCount}`}
                  </text>
                </g>
              )}

              {/* Diameter Callout Label */}
              <text
                x={centerX}
                y={baseBottomY + 18}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill="#5e3948"
              >
                {sizeMeta.dimensionsLabel}
              </text>
            </svg>
          </div>

          {/* Bottom Spec Strip & Transport Safety Badge */}
          <div className="space-y-2 pt-2 border-t border-[#edd8e0]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#6d4554]">
                <strong className="text-[#260e17] capitalize">
                  {spongeBase}
                </strong>{" "}
                · {flavorInfo.name} ({flavorInfo.fillingLabel})
              </span>
              <span className="font-semibold text-[#8d2f50]">
                {sizeMeta.servingsLabel}
              </span>
            </div>

            {catInfo.bundlesPrintedTopper && !includeCustomTopper && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#7c304c] bg-[#fae8ef] px-2.5 py-1.5 rounded-lg">
                <Gift size={13} className="flex-shrink-0" />
                <span>
                  Printed theme toppers are already bundled in Birthday base
                  price.
                </span>
              </div>
            )}

            <div
              className={`flex items-start gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border ${
                sizeMeta.vehicleRequirement === "car_mpv_required"
                  ? "bg-amber-50/90 text-amber-950 border-amber-200"
                  : "bg-emerald-50/90 text-emerald-900 border-emerald-200"
              }`}
            >
              {sizeMeta.vehicleRequirement === "car_mpv_required" ? (
                <AlertTriangle
                  size={14}
                  className="text-amber-600 flex-shrink-0 mt-0.5"
                />
              ) : (
                <Bike
                  size={14}
                  className="text-emerald-600 flex-shrink-0 mt-0.5"
                />
              )}
              <span>
                <strong>
                  {sizeMeta.vehicleRequirement === "car_mpv_required"
                    ? "Lalamove Car / MPV Required: "
                    : "Lalamove Transport: "}
                </strong>
                {sizeMeta.vehicleReason}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
