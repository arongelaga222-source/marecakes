"use client";

import React, { useState } from "react";
import {
  FLAVORS,
  FlavorCode,
  SpongeBase,
  DAILY_KITCHEN_SLOT_LIMIT,
  MIN_ADVANCE_LEAD_DAYS,
  DEPOSIT_AMOUNT_PHP,
  formatPhp,
} from "@/lib/catalog";
import { ScrollReveal } from "./ScrollReveal";
import { Sparkles, Clock, ShieldCheck, Layers, ArrowRight } from "lucide-react";

interface ArtisanStorySectionProps {
  onTryFlavorInStudio?: (flavor: FlavorCode, sponge: SpongeBase) => void;
}

export function ArtisanStorySection({
  onTryFlavorInStudio,
}: ArtisanStorySectionProps) {
  const [selectedSponge, setSelectedSponge] = useState<SpongeBase>("moist");
  const [selectedFlavorCode, setSelectedFlavorCode] =
    useState<FlavorCode>("chocolate");

  const activeFlavor =
    FLAVORS.find((f) => f.code === selectedFlavorCode) ?? FLAVORS[0];

  return (
    <section
      id="craft"
      className="relative py-20 sm:py-28 px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 bg-[#fdf7f8] text-[#2a121b] overflow-hidden"
    >
      {/* Subtle decorative radial warmth */}
      <div
        className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full pointer-events-none opacity-45"
        style={{
          background:
            "radial-gradient(circle, rgba(217, 133, 163, 0.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Top Editorial Intro + 3 Discipline Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-end mb-16 sm:mb-20">
          <ScrollReveal className="lg:col-span-7" direction="up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f4e2e8] border border-[#e5c5d0] text-[#852d4b] text-xs font-semibold tracking-wider uppercase mb-4">
              <Sparkles size={13} />
              <span>Small-Batch Rizal Atelier</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.12] text-[#260e17]">
              Never mass-frosted.{" "}
              <span className="text-[#a64264]">
                Strictly {DAILY_KITCHEN_SLOT_LIMIT} bespoke cakes
              </span>{" "}
              leave our Taytay kitchen each day.
            </h2>
          </ScrollReveal>

          <ScrollReveal className="lg:col-span-5" direction="up" delayMs={110}>
            <p className="text-[#5d3a47] text-base sm:text-[17px] leading-relaxed">
              Every sponge is baked from scratch, chilled overnight for clean
              structural doweling, and hand-piped hours before pickup or
              air-conditioned Rizal Lalamove dispatch.
            </p>
          </ScrollReveal>
        </div>

        {/* 3 Architectural Metric Strips (No generic SaaS cards — crisp editorial ledger) */}
        <ScrollReveal direction="up" delayMs={140}>
          <div className="grid grid-cols-1 md:grid-cols-3 border-y border-[#e7cdd6] divide-y md:divide-y-0 md:divide-x divide-[#e7cdd6] mb-20">
            <div className="py-6 md:pr-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f5e3e9] text-[#9b3b5c] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Layers size={18} />
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-[#8e586c]">
                  Daily Capacity Cap
                </div>
                <div className="font-display text-xl font-bold text-[#260e17] mt-0.5">
                  Max {DAILY_KITCHEN_SLOT_LIMIT} Cakes / Day
                </div>
                <p className="text-sm text-[#6b4553] mt-1 leading-relaxed">
                  Hard-capped daily calendar ensures unhurried Lambeth piping and
                  sculptural floral detail.
                </p>
              </div>
            </div>

            <div className="py-6 md:px-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f5e3e9] text-[#9b3b5c] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock size={18} />
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-[#8e586c]">
                  Preparation Window
                </div>
                <div className="font-display text-xl font-bold text-[#260e17] mt-0.5">
                  {MIN_ADVANCE_LEAD_DAYS}-Day Advance Lead Time
                </div>
                <p className="text-sm text-[#6b4553] mt-1 leading-relaxed">
                  Normalized to Philippine Time (UTC+8) for custom topper
                  printing, ingredient sourcing, and crumb chilling.
                </p>
              </div>
            </div>

            <div className="py-6 md:pl-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f5e3e9] text-[#9b3b5c] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-[#8e586c]">
                  Slot Lock Guarantee
                </div>
                <div className="font-display text-xl font-bold text-[#260e17] mt-0.5">
                  {formatPhp(DEPOSIT_AMOUNT_PHP)} Reservation Deposit
                </div>
                <p className="text-sm text-[#6b4553] mt-1 leading-relaxed">
                  Instant GCash, Maya, QR Ph, or Card deposit holds your slot;
                  settle the remaining balance before release.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Interactive Sponge Crumb & 7-Flavor Tactile Explorer */}
        <ScrollReveal direction="up" delayMs={180}>
          <div className="rounded-3xl bg-[#f7eaef] border border-[#e6c8d3] p-6 sm:p-9 lg:p-12 shadow-[0_20px_50px_-20px_rgba(90,20,45,0.12)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left: Sponge Base Toggle + 7 Official Flavors */}
              <div className="lg:col-span-7 space-y-7">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-[#8f425e] font-semibold">
                    Interior Architecture
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#260e17] mt-1">
                    2 Signature Sponge Bases × 7 Artisanal Flavors
                  </h3>
                  <p className="text-sm sm:text-base text-[#633e4c] mt-2">
                    Tap any sponge structure and interior flavor below to inspect
                    its crumb density, filling pairing, and tasting profile.
                  </p>
                </div>

                {/* Sponge Structure Segmented Switch */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655] mb-2.5">
                    1. Select Sponge Crumb Structure
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSponge("chiffon")}
                      className={`tactile-press text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedSponge === "chiffon"
                          ? "bg-white border-[#a64264] shadow-md ring-1 ring-[#a64264]/25"
                          : "bg-white/55 hover:bg-white/85 border-[#e2c3ce]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-base text-[#260e17]">
                          Airy Chiffon Base
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f8e7ed] text-[#8f3555]">
                          Featherlight
                        </span>
                      </div>
                      <p className="text-xs text-[#694452] mt-1.5 leading-relaxed">
                        Whipped meringue lift with delicate, springy pores—less
                        sweet, cloud-soft bite for Coquette & Birthday cakes.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSponge("moist")}
                      className={`tactile-press text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedSponge === "moist"
                          ? "bg-white border-[#a64264] shadow-md ring-1 ring-[#a64264]/25"
                          : "bg-white/55 hover:bg-white/85 border-[#e2c3ce]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-base text-[#260e17]">
                          Rich Moist Base
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#3a1624] text-pink-100">
                          Signature Velvet
                        </span>
                      </div>
                      <p className="text-xs text-[#694452] mt-1.5 leading-relaxed">
                        Decadent, tight-crumb butter-oil emulsion engineered for
                        deep flavor saturation and tall floral/2-tier stability.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 7 Official Flavors Swatch Pills */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6e4655] mb-2.5">
                    2. Explore the 7 Official Interior Flavors
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {FLAVORS.map((flavor) => {
                      const active = flavor.code === activeFlavor.code;
                      return (
                        <button
                          key={flavor.code}
                          type="button"
                          onClick={() => setSelectedFlavorCode(flavor.code)}
                          className={`tactile-press inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                            active
                              ? "bg-[#2b101b] text-white border-[#2b101b] shadow-md"
                              : "bg-white/80 hover:bg-white text-[#341622] border-[#dfbeca]"
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/15 flex-shrink-0 shadow-inner"
                            style={{ backgroundColor: flavor.spongeColorHex }}
                          />
                          <span>{flavor.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Live Layered Crumb Slice Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-white border border-[#e5c7d2] p-6 sm:p-7 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#8e566a]">
                        {selectedSponge === "chiffon"
                          ? "Chiffon Cellular Crumb"
                          : "Dense Velvet Moist Crumb"}
                      </span>
                      <h4 className="font-display text-xl font-bold text-[#260e17]">
                        {activeFlavor.name}
                      </h4>
                    </div>
                    {activeFlavor.badge && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fae8ef] text-[#8d2f50]">
                        {activeFlavor.badge}
                      </span>
                    )}
                  </div>

                  {/* Interactive SVG Slice Cross-Section */}
                  <div className="w-full h-44 rounded-xl bg-[#fcf6f8] border border-[#efe0e5] flex items-center justify-center p-4 mb-5">
                    <svg
                      viewBox="0 0 280 140"
                      className="w-full h-full max-w-[260px] overflow-visible"
                      role="img"
                      aria-label={`${activeFlavor.name} ${selectedSponge} cake slice preview`}
                    >
                      <defs>
                        <pattern
                          id="crumb-pores-craft"
                          width={selectedSponge === "chiffon" ? "10" : "6"}
                          height={selectedSponge === "chiffon" ? "10" : "6"}
                          patternUnits="userSpaceOnUse"
                        >
                          <circle
                            cx={selectedSponge === "chiffon" ? "4" : "2.5"}
                            cy={selectedSponge === "chiffon" ? "4" : "2.5"}
                            r={selectedSponge === "chiffon" ? "1.6" : "0.95"}
                            fill={activeFlavor.spongeDarkHex}
                            fillOpacity={
                              selectedSponge === "chiffon" ? "0.34" : "0.48"
                            }
                          />
                        </pattern>
                      </defs>

                      {/* Plate shadow */}
                      <ellipse
                        cx="140"
                        cy="126"
                        rx="108"
                        ry="8"
                        fill="rgba(75, 20, 40, 0.1)"
                      />

                      {/* Outer Buttercream Coat */}
                      <rect
                        x="42"
                        y="18"
                        width="196"
                        height="102"
                        rx="10"
                        fill="#fff8fa"
                        stroke="#e3bfc9"
                        strokeWidth="2"
                      />

                      {/* 3 Sponge Layers + 2 Filling Seams */}
                      {[0, 1, 2].map((layerIdx) => {
                        const y = 26 + layerIdx * 31;
                        return (
                          <g key={layerIdx}>
                            <rect
                              x="50"
                              y={y}
                              width="180"
                              height="23"
                              rx="4"
                              fill={activeFlavor.spongeColorHex}
                              className="transition-colors duration-300"
                            />
                            <rect
                              x="50"
                              y={y}
                              width="180"
                              height="23"
                              rx="4"
                              fill="url(#crumb-pores-craft)"
                            />
                            {layerIdx < 2 && (
                              <rect
                                x="50"
                                y={y + 23}
                                width="180"
                                height="8"
                                rx="2"
                                fill={activeFlavor.fillingColorHex}
                                stroke="rgba(0,0,0,0.06)"
                                strokeWidth="0.5"
                                className="transition-colors duration-300"
                              />
                            )}
                          </g>
                        );
                      })}

                      {/* Piped top rosettes */}
                      {[62, 100, 140, 180, 218].map((cx) => (
                        <circle
                          key={cx}
                          cx={cx}
                          cy="17"
                          r="6.5"
                          fill="#fde8ef"
                          stroke="#dfa8ba"
                          strokeWidth="1.2"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Tasting Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-xs text-[#7b5261]">
                      <span>Origin Note</span>
                      <span className="font-semibold text-[#2a121b]">
                        {activeFlavor.originNote}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#7b5261]">
                      <span>Paired Filling</span>
                      <span className="font-semibold text-[#2a121b] inline-flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/15"
                          style={{
                            backgroundColor: activeFlavor.fillingColorHex,
                          }}
                        />
                        {activeFlavor.fillingLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#5d3a47] pt-2 border-t border-[#f0dfe5] leading-relaxed">
                      {activeFlavor.tastingNotes}
                    </p>
                  </div>

                  {/* 1-Click Action into Studio Configurator */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onTryFlavorInStudio) {
                        onTryFlavorInStudio(activeFlavor.code, selectedSponge);
                      } else {
                        document
                          .getElementById("configurator")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="mt-5 w-full py-3 px-4 rounded-xl bg-[#9e3b5c] hover:bg-[#852d4b] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow"
                  >
                    <span>
                      Build a{" "}
                      {selectedSponge === "chiffon" ? "Chiffon" : "Moist"}{" "}
                      {activeFlavor.name} Cake
                    </span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
