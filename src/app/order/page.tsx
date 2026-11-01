"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import {
  CakeConfigurator,
  ExternalStudioSelection,
} from "@/components/CakeConfigurator";
import { Footer } from "@/components/Footer";
import { CategoryCode, FlavorCode, SizeCode, SpongeBase } from "@/lib/catalog";

function OrderStudioWithParams() {
  const searchParams = useSearchParams();

  const initialSelection = useMemo<ExternalStudioSelection | null>(() => {
    const presetId = searchParams.get("preset") ?? undefined;
    const category = (searchParams.get("category") as CategoryCode | null) ?? undefined;
    const spongeBase = (searchParams.get("base") as SpongeBase | null) ?? undefined;
    const size = (searchParams.get("size") as SizeCode | null) ?? undefined;
    const flavor = (searchParams.get("flavor") as FlavorCode | null) ?? undefined;

    if (!presetId && !category && !spongeBase && !size && !flavor) {
      return null;
    }

    return {
      key: 1,
      presetId,
      category,
      spongeBase,
      size,
      flavor,
    };
  }, [searchParams]);

  return (
    <CakeConfigurator
      externalSelection={initialSelection}
      standalonePage={true}
    />
  );
}

export default function OrderPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fdf7f8]">
      <Header activeLink="Custom Studio" forceScrolledStyle={true} />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="pt-36 pb-24 px-6 max-w-5xl mx-auto text-center text-sm text-[#7b5060]">
              Loading Marecakes Bespoke Studio...
            </div>
          }
        >
          <OrderStudioWithParams />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
