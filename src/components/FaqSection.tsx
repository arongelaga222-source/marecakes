"use client";

import React, { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Why do you only accept 3 cakes per day and require 7 days lead time?",
    answer:
      "Every Marecakes creation is baked to order from scratch, chilled overnight for clean structural crumb stability, and hand-piped by our Taytay kitchen. Capping production at 3 cakes per day (with a 7-day Philippine Time lead window) guarantees your Lambeth piping, floral wreaths, and custom printed toppers are never rushed.",
  },
  {
    question: "How do the ₱300 deposit and remaining balance work?",
    answer:
      "Paying the fixed ₱300 deposit via PayMongo (GCash, Maya, QR Ph, or Card) immediately reserves 1 of our 3 daily slots. Your remaining balance (Total minus ₱300) is settled via a PayMongo checkout link on your Guest Order Tracking page before Store Pickup or Lalamove release.",
  },
  {
    question: "What happens if I upload a custom reference photo and the baker adjusts the quote?",
    answer:
      "Custom reference photos and bespoke design modification notes are reviewed personally by our baker. If intricate sculpted toppers, extra tiers, or metallic accents adjust your estimated price, your order enters Customer Re-Approval status on the Track Order page—where you can approve the updated quote in one tap or cancel if it exceeds your budget.",
  },
  {
    question: "Does adding a birthday greeting on the cake delay my confirmation?",
    answer:
      "Not at all! Standard cake dedications (up to 42 characters, such as “Happy 24th Birthday Bea!”) are completely free and confirm immediately when ordering from our Signature Catalog.",
  },
  {
    question: "Do Customized Birthday Cakes already include toppers?",
    answer:
      "Yes! Our Customized Birthday Cake category already bundles themed icing and printed toppers in the base flyer price. Only select the +₱180 Customized Topper add-on if you want an extra bespoke laser-cut acrylic keepsake plaque.",
  },
  {
    question: "How does Lalamove delivery across Rizal work?",
    answer:
      "We serve all 14 localities of Rizal Province from our Taytay atelier. Once your cake is boxed and your remaining balance is paid, you book Lalamove directly from your phone using our exact pickup pin. For 6×5, 8×5, and 2-Tier cakes, please book a Lalamove Car/Sedan or MPV with air-conditioning so your cake travels flat on the floorboard.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="py-20 sm:py-28 px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 bg-[#fdf7f8] text-[#2a121b]"
    >
      <div className="max-w-4xl mx-auto">
        <ScrollReveal direction="up">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#943958] font-semibold">
              <HelpCircle size={13} />
              <span>Atelier Policies &amp; Guidance</span>
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#250d16] tracking-tight mt-2">
              Frequently Asked Questions
            </h2>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <ScrollReveal key={item.question} direction="up" delayMs={idx * 50}>
                <div className="rounded-2xl bg-white border border-[#e5c6d2] overflow-hidden transition-shadow hover:shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-display font-bold text-base sm:text-lg text-[#250d16]">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={19}
                      className={`text-[#9e3b5c] flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 pt-1 text-sm sm:text-[15px] text-[#5f3b49] leading-relaxed border-t border-[#f5e7ec]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
