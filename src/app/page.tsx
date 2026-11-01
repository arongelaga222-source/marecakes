"use client";

import React, { useState } from "react";
import { Hero } from "@/components/Hero";
import { ArtisanStorySection } from "@/components/ArtisanStorySection";
import { CatalogSection } from "@/components/CatalogSection";
import {
  CakeConfigurator,
  ExternalStudioSelection,
} from "@/components/CakeConfigurator";
import { FulfillmentSection } from "@/components/FulfillmentSection";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { CategoryCode, FlavorCode, SizeCode, SpongeBase } from "@/lib/catalog";

export default function HomePage() {
  const [studioSelection, setStudioSelection] =
    useState<ExternalStudioSelection | null>(null);

  const jumpToConfigurator = (
    payload: Omit<ExternalStudioSelection, "key">
  ) => {
    setStudioSelection((prev) => ({
      ...payload,
      key: (prev?.key ?? 0) + 1,
    }));
    const target = document.getElementById("configurator");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col">
      {/* 1. Approved Dusty-Rose 3D Cyclorama Hero with Continuous Borderless Cake Showcase */}
      <Hero
        onSelectPreset={(presetId: string) =>
          jumpToConfigurator({ presetId })
        }
      />

      {/* 2. Small-Batch Rizal Atelier Philosophy + Interactive Chiffon vs Moist & 7-Flavor Slice Deck */}
      <ArtisanStorySection
        onTryFlavorInStudio={(flavor: FlavorCode, spongeBase: SpongeBase) =>
          jumpToConfigurator({ flavor, spongeBase })
        }
      />

      {/* 3. Canonical 3-Category Showcase + Interactive 16-Cell Flyer Matrix */}
      <CatalogSection
        onSelectSkuForStudio={(sku: {
          category: CategoryCode;
          spongeBase: SpongeBase;
          size: SizeCode;
        }) => jumpToConfigurator(sku)}
      />

      {/* 4. Interactive Bespoke Cake Studio, Dual Cutaway Visualizer & Manila 3-Slot Booker */}
      <CakeConfigurator externalSelection={studioSelection} />

      {/* 5. 14-Locality Rizal Province Lalamove Transit Explorer & Car/MPV Safety Guide */}
      <FulfillmentSection />

      {/* 6. Atelier Policies & FAQ Accordion */}
      <FaqSection />

      {/* 7. Haute Pâtisserie Footer */}
      <Footer />
    </main>
  );
}
