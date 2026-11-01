"use client";

import React, { useState } from "react";
import { Type, Sparkles, Check } from "lucide-react";

export type FontOption = {
  id: string;
  name: string;
  category: string;
  headingCss: string;
  bodyCss: string;
  preview: string;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    category: "Modern Geometric",
    headingCss: "var(--font-jakarta), system-ui, sans-serif",
    bodyCss: "var(--font-jakarta), system-ui, sans-serif",
    preview: "Clean, punchy, modern high-end brand feel",
  },
  {
    id: "outfit",
    name: "Outfit",
    category: "Soft Modern Sans",
    headingCss: "var(--font-outfit), system-ui, sans-serif",
    bodyCss: "var(--font-outfit), system-ui, sans-serif",
    preview: "Friendly, contemporary confectionery aesthetic",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    category: "Editorial Luxury Serif",
    headingCss: "var(--font-playfair), Georgia, serif",
    bodyCss: "var(--font-jakarta), system-ui, sans-serif",
    preview: "Haute pâtisserie & bespoke wedding cake elegance",
  },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    category: "Artisanal Heritage Serif",
    headingCss: "var(--font-cormorant), Garamond, serif",
    bodyCss: "var(--font-jakarta), system-ui, sans-serif",
    preview: "French patisserie, classical royal tier styling",
  },
  {
    id: "inter",
    name: "Inter",
    category: "Clean Neutral Sans",
    headingCss: "var(--font-inter), system-ui, sans-serif",
    bodyCss: "var(--font-inter), system-ui, sans-serif",
    preview: "Balanced, neutral, Swiss-inspired legibility",
  },
];

interface FontCustomizerProps {
  currentFont: string;
  onSelectFont: (font: FontOption) => void;
}

export function FontCustomizer({ currentFont, onSelectFont }: FontCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];

  return (
    <aside
      aria-label="Font Customizer"
      className="fixed bottom-5 right-5 z-50 select-none print:hidden transition-all duration-300"
    >
      {/* Floating Pill Toggle Button — legible over both dusty-rose Hero & warm cream sections */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#361321]/85 hover:bg-[#2a0d19]/95 backdrop-blur-xl border border-pink-200/35 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 group"
          title="Click to test different typography styles across the site"
        >
          <Type size={15} className="text-pink-200 group-hover:rotate-12 transition-transform" />
          <span className="text-xs sm:text-sm font-medium tracking-wide">
            Font:{" "}
            <span className="font-semibold text-white underline decoration-pink-200/60">
              {selected.name}
            </span>
          </span>
          <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider text-pink-100">
            Switch
          </span>
        </button>
      )}

      {/* Expanded Font Selector Drawer */}
      {isOpen && (
        <div className="w-[320px] sm:w-[360px] rounded-2xl bg-[#220b14]/92 backdrop-blur-2xl border border-pink-200/30 shadow-2xl p-4 text-white animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-pink-300" />
              <h2 className="text-sm font-semibold tracking-wide">Live Font Switcher</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-white/75 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-white/70 mt-2 mb-3 leading-relaxed">
            Test typography pairings live across the Hero, Catalog, and Cake Studio:
          </p>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {FONT_OPTIONS.map((font) => {
              const isCurrent = font.id === selected.id;
              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => onSelectFont(font)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between border ${
                    isCurrent
                      ? "bg-white/20 border-pink-200/70 shadow-md"
                      : "bg-white/5 hover:bg-white/12 border-white/10"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-semibold text-white"
                        style={{ fontFamily: font.headingCss }}
                      >
                        {font.name}
                      </span>
                      <span className="text-[10px] text-pink-200 font-medium px-1.5 py-0.5 rounded bg-white/10">
                        {font.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 mt-0.5">{font.preview}</p>
                  </div>
                  {isCurrent && (
                    <div className="bg-white text-rose-950 p-1 rounded-full mt-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/15 text-[11px] text-white/60 flex items-center justify-between">
            <span>Applies instantly across all sections</span>
            <span className="font-mono text-[10px] text-pink-200">Live Preview</span>
          </div>
        </div>
      )}
    </aside>
  );
}
