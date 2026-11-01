"use client";

import React from "react";
import { Header } from "./Header";
import { CakeShowcase } from "./CakeShowcase";
import { useActiveFont } from "./FontContext";
import { ArrowDown } from "lucide-react";

interface HeroProps {
  onSelectPreset?: (presetId: string) => void;
}

export function Hero({ onSelectPreset }: HeroProps) {
  const { selectedFont } = useActiveFont();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section
      id="top"
      className="cyclorama-stage min-h-screen w-full flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Top Fixed Glassmorphic Header Bar with Mascot Logo on the left */}
      <Header activeLink="Home" />

      {/* Spacer for fixed top glassmorphic pill so Hero alignment matches exact approved layout */}
      <div className="h-20 sm:h-24 md:h-28 flex-shrink-0" aria-hidden="true" />

      {/* Main Hero Viewport Area: 2-Column Responsive Split */}
      <div className="flex-1 w-full max-w-[1540px] mx-auto px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 xl:gap-20 py-4 sm:py-8 md:py-10 relative z-10">
        {/* Left Column: Headline, Copy & CTA Buttons (Anchored gracefully on the left) */}
        <div className="w-full lg:w-[42%] xl:w-[39%] max-w-[520px] lg:mr-auto flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-700">
          {/* Frosted Glass Badge Pill */}
          <div className="inline-block mb-5 sm:mb-7">
            <div className="glass-badge rounded-full px-4 sm:px-5 py-1.5 sm:py-2 inline-flex items-center gap-2 sm:gap-2.5">
              <span
                className="text-base sm:text-lg leading-none select-none"
                role="img"
                aria-label="Cake"
              >
                🍰
              </span>
              <span
                className="text-white/95 text-xs sm:text-sm font-medium tracking-wide"
                style={{ fontFamily: selectedFont.bodyCss }}
              >
                Bespoke Cakes in Taytay, Rizal · 3 Slots Daily
              </span>
            </div>
          </div>

          {/* Hero Headline */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] xl:text-[68px] font-bold text-white tracking-tight leading-[1.08] sm:leading-[1.06] text-balance mb-5 sm:mb-7 drop-shadow-sm"
            style={{ fontFamily: selectedFont.headingCss }}
          >
            Delicious Cakes,
            <br />
            Crafted for
            <br />
            Every Occasion
          </h1>

          {/* Subtitle Paragraph */}
          <p
            className="text-white/85 text-base sm:text-lg md:text-[18px] leading-relaxed max-w-lg mb-7 sm:mb-9 font-normal drop-shadow-sm"
            style={{ fontFamily: selectedFont.bodyCss }}
          >
            Indulge in our freshly baked Coquette, Botanical Floral, and
            Customized Birthday cakes crafted to order in Rizal. Choose your
            sponge, preview the interior slice, and reserve your celebration
            date with a ₱300 deposit.
          </p>

          {/* CTA Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-4">
            {/* Primary Button */}
            <button
              type="button"
              onClick={() => scrollToSection("configurator")}
              className="primary-button text-sm sm:text-base font-semibold px-7 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all duration-300 cursor-pointer"
              style={{ fontFamily: selectedFont.bodyCss }}
            >
              Order Now
            </button>

            {/* Secondary Button */}
            <button
              type="button"
              onClick={() => scrollToSection("collection")}
              className="glass-button text-sm sm:text-base text-white font-medium px-6 sm:px-7 py-3.5 sm:py-4 rounded-full transition-all duration-300 cursor-pointer"
              style={{ fontFamily: selectedFont.bodyCss }}
            >
              Browse Our Cakes
            </button>
          </div>
        </div>

        {/* Right Column: Horizontal Scrolling Showcase resting on the gradient white floor line */}
        <div className="w-full lg:w-[55%] xl:w-[57%] flex flex-col justify-center relative mt-4 lg:mt-0 animate-in fade-in slide-in-from-right-4 duration-700">
          <CakeShowcase onSelectPreset={onSelectPreset} />
        </div>
      </div>

      {/* Bottom Floor Bracketed Features + Gentle Scroll Cue */}
      <div className="w-full max-w-[1540px] mx-auto px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 pb-7 sm:pb-9 pt-2 relative z-10">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left text-white/80 text-xs sm:text-sm md:text-base font-medium tracking-wider"
          style={{ fontFamily: selectedFont.bodyCss }}
        >
          <div className="transition-opacity hover:text-white cursor-default">
            [ Delicious Perfection ]
          </div>
          <button
            type="button"
            onClick={() => scrollToSection("craft")}
            className="inline-flex items-center gap-2 text-white/85 hover:text-white transition-all group cursor-pointer"
          >
            <span>[ Crafted with Love · Scroll to Explore ]</span>
            <ArrowDown
              size={15}
              className="text-pink-200 group-hover:translate-y-0.5 transition-transform"
            />
          </button>
          <div className="transition-opacity hover:text-white cursor-default">
            [ Elegantly Decorated ]
          </div>
        </div>
      </div>
    </section>
  );
}
