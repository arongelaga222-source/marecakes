"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { CATALOG_PRESETS, ensureValidSelection, formatPhp } from "@/lib/catalog";

export interface CakeItem {
  id: string;
  presetId: string;
  name: string;
  tagline: string;
  badge: string;
  priceTag: string;
  src: string;
}

export const CAKE_COLLECTION: CakeItem[] = CATALOG_PRESETS.map((preset) => {
  const { cell } = ensureValidSelection(
    preset.category,
    preset.defaultBase,
    preset.defaultSize
  );
  return {
    id: preset.id,
    presetId: preset.id,
    name: preset.title,
    tagline: preset.subtitle,
    badge: preset.badge,
    priceTag: formatPhp(cell.pricePhp),
    src: preset.imageSrc,
  };
});

// Duplicate collection 4 times to ensure infinite continuous flow without empty gaps
const REPEAT_COUNT = 4;
const CONTINUOUS_ITEMS = Array.from({ length: REPEAT_COUNT }, (_, setIdx) =>
  CAKE_COLLECTION.map((cake) => ({
    ...cake,
    uniqueKey: `${cake.id}-flow-${setIdx}`,
    setIdx,
  }))
).flat();

interface CakeShowcaseProps {
  onSelectPreset?: (presetId: string) => void;
}

export function CakeShowcase({ onSelectPreset }: CakeShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [realActiveIndex, setRealActiveIndex] = useState(0);

  // Continuous auto-scroll physics
  const isInteractingRef = useRef(false);
  const scrollPosRef = useRef(0);
  const speedRef = useRef(0.75); // Silky smooth constant forward velocity (pixels per frame)

  // Drag physics
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const movedRef = useRef(false);

  // Measure single cycle width (4 cards + gaps)
  const getSingleCycleWidth = useCallback(() => {
    const card0 = cardsRef.current[0];
    const card4 = cardsRef.current[CAKE_COLLECTION.length];
    if (card0 && card4) {
      return card4.offsetLeft - card0.offsetLeft;
    }
    return 0;
  }, []);

  // Update dynamic center fade & scale
  const updateCardFades = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const maxDistance = containerRect.width * 0.55;

    let closestIdx = 0;
    let minDistance = Infinity;

    cardsRef.current.forEach((card, idx) => {
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(containerCenter - cardCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = idx;
      }

      // Normalized distance (0 = exact center, 1 = boundary edge)
      const normalizedDist = Math.min(distance / maxDistance, 1);

      // Parabolic falloff: dead center is 1.0, non-center smoothly fades to ~0.26
      const opacity = Math.max(1 - Math.pow(normalizedDist, 1.15) * 0.74, 0.26);

      // Gentle scale: center is 1.06, sides scale down to ~0.84
      const scale = Math.max(1.06 - Math.pow(normalizedDist, 1.15) * 0.22, 0.84);

      // Floor shadow intensity on the glowing white line
      const shadowOpacity = Math.max(1 - normalizedDist * 0.75, 0.2);

      card.style.opacity = `${opacity}`;
      card.style.transform = `scale(${scale})`;

      const shadowEl = card.querySelector<HTMLElement>(".cake-ground-shadow");
      if (shadowEl) {
        shadowEl.style.opacity = `${shadowOpacity}`;
      }
    });

    setRealActiveIndex(closestIdx % CAKE_COLLECTION.length);
  }, []);

  // Continuous linear animation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animId: number;

    const tick = () => {
      const cycleWidth = getSingleCycleWidth();

      // If not dragging or hovering (and reduced motion not enabled), advance forward continuously
      if (
        !prefersReduced &&
        !isInteractingRef.current &&
        !isDraggingRef.current &&
        cycleWidth > 0
      ) {
        scrollPosRef.current += speedRef.current;

        // Seamless wrap: when past 2 cycles, subtract 1 cycle (never resets to the beginning!)
        if (scrollPosRef.current >= cycleWidth * 2) {
          scrollPosRef.current -= cycleWidth;
        }

        container.scrollLeft = scrollPosRef.current;
      } else {
        // Sync scrollPos with user scroll
        scrollPosRef.current = container.scrollLeft;

        // Wrap check during user scroll
        if (cycleWidth > 0) {
          if (container.scrollLeft >= cycleWidth * 2.5) {
            container.scrollLeft -= cycleWidth;
            scrollPosRef.current = container.scrollLeft;
          } else if (container.scrollLeft <= cycleWidth * 0.5) {
            container.scrollLeft += cycleWidth;
            scrollPosRef.current = container.scrollLeft;
          }
        }
      }

      updateCardFades();
      animId = requestAnimationFrame(tick);
    };

    // Initial mount setup in middle set
    const initTimer = setTimeout(() => {
      const cycleWidth = getSingleCycleWidth();
      if (cycleWidth > 0 && container) {
        container.scrollLeft = cycleWidth;
        scrollPosRef.current = cycleWidth;
      }
      updateCardFades();
    }, 60);

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(initTimer);
    };
  }, [getSingleCycleWidth, updateCardFades]);

  // Nudge controls (< and >) smoothly advance or rewind without snapping
  const nudgeScroll = (amount: number) => {
    if (!containerRef.current) return;
    scrollPosRef.current += amount;
    containerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    movedRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftStartRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    movedRef.current = true;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.35;
    containerRef.current.scrollLeft = scrollLeftStartRef.current - walk;
    scrollPosRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      className="w-full relative select-none"
      onMouseEnter={() => {
        isInteractingRef.current = true;
      }}
      onMouseLeave={() => {
        isInteractingRef.current = false;
        handleMouseUp();
      }}
    >
      {/* Top Header Label & Controls */}
      <div className="flex items-center justify-between mb-2 px-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-300 animate-pulse" />
          <span className="text-white/85 text-xs font-semibold tracking-widest uppercase">
            Signature Rizal Creations
          </span>
          <span className="text-white/45 text-[10px] tracking-wider uppercase font-mono hidden sm:inline">
            · Click cake to customize
          </span>
        </div>

        {/* Nudge Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => nudgeScroll(-320)}
            className="p-2 rounded-full text-white/90 hover:text-white bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-300"
            aria-label="Previous cake"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => nudgeScroll(320)}
            className="p-2 rounded-full text-white/90 hover:text-white bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-300"
            aria-label="Next cake"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/*
        Horizontal Track Viewport
        - Masked linear gradients on both edges for seamless entry/exit
        - Borderless, 100% transparent background
      */}
      <div
        className="relative w-full"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)",
        }}
      >
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex items-end gap-6 sm:gap-10 overflow-x-hidden pt-6 pb-6 no-scrollbar cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {CONTINUOUS_ITEMS.map((cake, idx) => (
            <div
              key={cake.uniqueKey}
              ref={(el) => {
                cardsRef.current[idx] = el;
              }}
              onClick={() => {
                if (!movedRef.current && containerRef.current) {
                  const card = cardsRef.current[idx];
                  if (card) {
                    card.scrollIntoView({
                      behavior: "smooth",
                      inline: "center",
                      block: "nearest",
                    });
                  }
                  if (onSelectPreset) {
                    onSelectPreset(cake.presetId);
                  }
                }
              }}
              className="cake-card group flex-shrink-0 flex flex-col items-center w-[270px] sm:w-[300px] md:w-[320px] transition-[opacity,transform] duration-200 ease-out will-change-[transform,opacity] cursor-pointer bg-transparent"
            >
              {/* Minimalist Floating Badge (No Border, Transparent) */}
              <div className="mb-2 text-center transition-all duration-300">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-pink-200/95 drop-shadow-sm">
                  <Sparkles size={11} className="text-pink-300" />
                  {cake.badge} · {cake.priceTag}
                </span>
              </div>

              {/* Transparent Cake Image */}
              <div className="relative w-[240px] h-[230px] sm:w-[270px] sm:h-[260px] md:w-[290px] md:h-[280px] pointer-events-none transition-transform duration-300 group-hover:-translate-y-1.5">
                <Image
                  src={cake.src}
                  alt={cake.name}
                  fill
                  sizes="(max-width: 640px) 240px, (max-width: 768px) 270px, 290px"
                  className="object-contain filter drop-shadow-[0_20px_24px_rgba(60,10,25,0.35)]"
                  priority={idx >= 4 && idx < 8}
                />
              </div>

              {/* Ground Contact Shadow resting on the white floor line */}
              <div
                className="cake-ground-shadow w-[210px] sm:w-[240px] h-[20px] rounded-full mx-auto -mt-2 pointer-events-none transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(55, 10, 24, 0.48) 0%, rgba(85, 16, 38, 0.18) 50%, transparent 75%)",
                  filter: "blur(5px)",
                }}
              />

              {/* Transparent Text Details (NO BORDERS, NO BOX BACKGROUND) */}
              <div className="mt-4 text-center w-full px-2 bg-transparent">
                <h3 className="text-white font-display font-bold text-base sm:text-lg tracking-tight drop-shadow-sm transition-colors duration-300 group-hover:text-pink-100">
                  {cake.name}
                </h3>
                <p className="text-white/75 text-xs sm:text-[13px] mt-1 line-clamp-1 leading-normal font-normal drop-shadow-sm">
                  {cake.tagline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dot Indicators */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {CAKE_COLLECTION.map((cake, idx) => (
          <button
            key={cake.id}
            type="button"
            onClick={() => {
              const cycleWidth = getSingleCycleWidth();
              if (cycleWidth > 0 && containerRef.current) {
                const targetCard = cardsRef.current.find(
                  (c, cIdx) =>
                    cIdx % CAKE_COLLECTION.length === idx &&
                    c &&
                    c.offsetLeft > containerRef.current!.scrollLeft
                );
                if (targetCard) {
                  targetCard.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }
              }
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              realActiveIndex === idx
                ? "w-7 bg-white shadow-sm"
                : "w-2 bg-white/25 hover:bg-white/50"
            }`}
            aria-label={`Focus on ${cake.name}`}
          />
        ))}
      </div>
    </div>
  );
}
