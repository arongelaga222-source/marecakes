import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  Outfit,
  Playfair_Display,
  Inter,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";
import { FontProvider } from "@/components/FontContext";
import { ScrollProgress } from "@/components/ScrollProgress";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marecakes — Bespoke Artisanal Cakes in Rizal | 3 Slots Per Day",
  description:
    "Handcrafted Coquette, Botanical Floral, and Customized Birthday cakes baked fresh in Taytay, Rizal. Configure your sponge, interior flavor, and reserve one of 3 daily kitchen slots.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${outfit.variable} ${playfair.variable} ${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-[#a64766]/25 selection:text-[#2a121b]">
        <FontProvider>
          <ScrollProgress />
          {children}
        </FontProvider>
      </body>
    </html>
  );
}
