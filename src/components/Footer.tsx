"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ATELIER_PICKUP_INFO, DAILY_KITCHEN_SLOT_LIMIT, DEPOSIT_AMOUNT_PHP, formatPhp } from "@/lib/catalog";
import { MapPin, Clock, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#230e16] text-white pt-16 sm:pt-20 pb-10 px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 overflow-hidden relative">
      <div className="max-w-[1400px] mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-14 border-b border-white/12">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative w-12 h-12 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/logo.png"
                  alt="Marecakes Mascot Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="font-display text-2xl font-bold tracking-tight">
                  Marecakes
                </div>
                <div className="text-xs text-pink-200/80 uppercase tracking-widest">
                  Bespoke Rizal Pâtisserie
                </div>
              </div>
            </Link>

            <p className="text-sm text-white/75 max-w-sm leading-relaxed">
              Handcrafted Coquette, Botanical Floral, and Customized Birthday
              cakes baked fresh to order. Limited to {DAILY_KITCHEN_SLOT_LIMIT}{" "}
              kitchen slots daily with a {formatPhp(DEPOSIT_AMOUNT_PHP)}{" "}
              reservation deposit.
            </p>

            <div className="space-y-1.5 text-xs text-pink-100/85 pt-1">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-pink-300 flex-shrink-0" />
                <span>
                  {ATELIER_PICKUP_INFO.municipality} —{" "}
                  {ATELIER_PICKUP_INFO.landmark}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-pink-300 flex-shrink-0" />
                <span>{ATELIER_PICKUP_INFO.hours}</span>
              </div>
            </div>
          </div>

          {/* Storefront Navigation */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-pink-200/80">
              Storefront
            </h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/#collection" className="hover:text-white transition-colors">
                  16-SKU Cake Collections
                </Link>
              </li>
              <li>
                <Link href="/#craft" className="hover:text-white transition-colors">
                  Sponge &amp; 7 Interior Flavors
                </Link>
              </li>
              <li>
                <Link href="/#configurator" className="hover:text-white transition-colors">
                  Interactive Cake Studio
                </Link>
              </li>
              <li>
                <Link href="/#fulfillment" className="hover:text-white transition-colors">
                  14-Locality Rizal Lalamove Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Portals & Order Tools */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-pink-200/80">
              Order &amp; Kitchen Portals
            </h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link href="/order" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Sparkles size={13} className="text-pink-300" />
                  <span>Full-Screen Cake Configurator</span>
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-white transition-colors">
                  Guest Order Tracker &amp; Balance Settlement
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Baker Kitchen &amp; 3-Slot Capacity Portal
                </Link>
              </li>
            </ul>

            <div className="pt-2">
              <span className="inline-block text-[11px] font-mono text-white/60 bg-white/8 border border-white/12 px-3 py-1.5 rounded-lg">
                Payments: GCash · Maya · QR Ph · Cards via PayMongo
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Oversized Editorial Wordmark */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/55">
          <div>
            © {new Date("2026-01-01T00:00:00Z").getUTCFullYear()} Marecakes
            Rizal Atelier. Crafted with love for every celebration.
          </div>
          <div className="flex items-center gap-4">
            <span>Asia/Manila (UTC+8)</span>
            <span>·</span>
            <span>Taytay, Rizal, PH</span>
          </div>
        </div>

        <div
          className="font-display font-bold text-[13vw] leading-[0.82] tracking-tighter text-center text-white/[0.045] select-none pointer-events-none mt-6"
          aria-hidden="true"
        >
          MARECAKES
        </div>
      </div>
    </footer>
  );
}
