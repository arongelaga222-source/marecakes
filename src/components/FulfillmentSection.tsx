"use client";

import React, { useState } from "react";
import {
  ATELIER_PICKUP_INFO,
  RIZAL_LOCALITIES,
  RizalLocalityInfo,
} from "@/lib/catalog";
import { ScrollReveal } from "./ScrollReveal";
import { Car, Bike, MapPin, ShieldCheck, Store, Truck, Clock } from "lucide-react";

export function FulfillmentSection() {
  const [selectedLocality, setSelectedLocality] = useState<RizalLocalityInfo>(
    RIZAL_LOCALITIES[0]
  );

  return (
    <section
      id="fulfillment"
      className="py-20 sm:py-28 px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 bg-[#f7eaef] text-[#2a121b]"
    >
      <div className="max-w-[1400px] mx-auto">
        <ScrollReveal direction="up">
          <div className="max-w-2xl mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
              <MapPin size={13} />
              <span>Rizal Province Fulfillment</span>
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[#250d16] tracking-tight mt-2">
              Safe Chilled Handoff Across All 14 Rizal Localities
            </h2>
            <p className="text-[#613d4b] text-base sm:text-lg mt-3 leading-relaxed">
              Every cake is deep-chilled to structural core temperature before
              leaving our Taytay kitchen via Store Pickup or customer-booked
              Lalamove.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: Interactive 14-Locality Rizal Explorer */}
          <ScrollReveal
            direction="up"
            delayMs={80}
            className="lg:col-span-7 flex"
          >
            <div className="w-full rounded-3xl bg-white border border-[#e5c6d2] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-[#250d16]">
                    Check Transit Time from Taytay Atelier
                  </h3>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#fae8ef] text-[#8b2e4e]">
                    1 City + 13 Municipalities
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {RIZAL_LOCALITIES.map((loc) => {
                    const active = selectedLocality.name === loc.name;
                    return (
                      <button
                        key={loc.name}
                        type="button"
                        onClick={() => setSelectedLocality(loc)}
                        className={`tactile-press px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-[#2b101b] text-white border-[#2b101b] shadow-sm"
                            : "bg-[#fcf8f9] hover:bg-[#f6e6ed] text-[#351521] border-[#e2c2ce]"
                        }`}
                      >
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Locality Dispatch Card */}
              <div className="rounded-2xl bg-[#fbf4f7] border border-[#e8cbd6] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[#8c5468]">
                      {selectedLocality.zone}
                    </div>
                    <div className="font-display text-2xl font-bold text-[#250d16]">
                      {selectedLocality.name}, Rizal
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#e2c2ce] text-xs font-bold text-[#8e3050]">
                    <Clock size={14} />
                    <span>{selectedLocality.estTravelMinutes}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#5f3b49] leading-relaxed">
                  <strong>How Lalamove Dispatch Works:</strong> Once your
                  remaining balance is settled on event day, our kitchen sends
                  the exact Taytay pickup pin. You book Lalamove directly in
                  your app and pay the rider&apos;s delivery fee so you have live
                  GPS tracking from our door to {selectedLocality.name}.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Store Pickup vs Vehicle Rules */}
          <ScrollReveal
            direction="up"
            delayMs={160}
            className="lg:col-span-5 flex flex-col gap-5"
          >
            {/* Store Pickup Card */}
            <div className="rounded-3xl bg-white border border-[#e5c6d2] p-6 shadow-sm">
              <div className="flex items-center gap-2.5 text-[#8e3050] font-semibold text-xs uppercase tracking-wider mb-2">
                <Store size={16} />
                <span>Option A · Direct Atelier Pickup</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#250d16]">
                {ATELIER_PICKUP_INFO.municipality}
              </h3>
              <p className="text-sm text-[#5f3b49] mt-1">
                {ATELIER_PICKUP_INFO.landmark}
              </p>
              <p className="text-xs text-[#845768] mt-2 font-medium">
                {ATELIER_PICKUP_INFO.hours}
              </p>
            </div>

            {/* Vehicle Safety Matrix Card */}
            <div className="rounded-3xl bg-[#260e17] text-white p-6 shadow-md flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-pink-200 font-semibold text-xs uppercase tracking-wider mb-2">
                  <Truck size={16} />
                  <span>Option B · Lalamove Vehicle Rules</span>
                </div>
                <h3 className="font-display text-xl font-bold">
                  Why Tall Cakes Require a Car / MPV
                </h3>
              </div>

              <div className="space-y-3 my-4 text-xs">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-3.5 flex items-start gap-3">
                  <Bike
                    size={18}
                    className="text-emerald-300 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-white">
                      6×3 &amp; 8×3 Single-Tier (3&quot; Height)
                    </div>
                    <p className="text-white/75 mt-0.5">
                      Low center of gravity fits level inside an insulated
                      motorcycle box for nearby West/Central Rizal trips.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-400/15 border border-amber-300/30 p-3.5 flex items-start gap-3">
                  <Car
                    size={18}
                    className="text-amber-300 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-amber-100">
                      6×5, 8×5 &amp; 2-Tier Cakes (5&quot; to 9.5&quot; Tall)
                    </div>
                    <p className="text-white/80 mt-0.5">
                      Strictly requires Lalamove Sedan/Car or MPV with full AC
                      placed flat on the passenger floorboard—never on angled
                      car seats.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-pink-200/85 pt-2 border-t border-white/12">
                <ShieldCheck size={14} />
                <span>
                  Handoff photos are captured with your driver before dispatch.
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
