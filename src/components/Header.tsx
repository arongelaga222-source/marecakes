"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sparkles } from "lucide-react";

interface HeaderProps {
  activeLink?: string;
  showBrandText?: boolean;
  forceScrolledStyle?: boolean;
}

export function Header({
  activeLink = "Home",
  showBrandText = true,
  forceScrolledStyle = false,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 56);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const useDarkFrostedGlass = forceScrolledStyle || isScrolled;

  const navLinks = [
    { name: "Home", href: "/#top" },
    { name: "Cakes", href: "/#collection" },
    { name: "Craft", href: "/#craft" },
    { name: "Custom Studio", href: "/#configurator" },
    { name: "Track Order", href: "/track" },
    { name: "Kitchen", href: "/admin" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 transition-all duration-300 ${
        useDarkFrostedGlass ? "pt-3 sm:pt-4" : "pt-5 sm:pt-7 md:pt-8"
      }`}
    >
      <div className="max-w-4xl lg:max-w-5xl mx-auto">
        {/* Floating Glassmorphic Pill */}
        <div
          className={`${
            useDarkFrostedGlass ? "glass-header-scrolled" : "glass-header"
          } rounded-full px-4 sm:px-6 py-2 sm:py-2.5 transition-all duration-300`}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Marecakes Mascot Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none select-none pl-1"
              aria-label="Marecakes Home"
            >
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <Image
                  src="/logo.png"
                  alt="Marecakes Mascot Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  priority
                />
              </div>
              {showBrandText && (
                <div className="hidden min-[440px]:flex flex-col leading-none">
                  <span className="text-white font-display font-bold tracking-tight text-base sm:text-lg group-hover:text-pink-100 transition-colors drop-shadow-sm">
                    Marecakes
                  </span>
                  <span className="text-[10px] text-pink-100/80 tracking-widest uppercase font-medium mt-0.5">
                    Taytay, Rizal
                  </span>
                </div>
              )}
            </Link>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-7">
              {navLinks.map((link) => {
                const isActive = activeLink === link.name;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm font-medium tracking-wide transition-all duration-200 relative py-1 ${
                      isActive
                        ? "text-white font-semibold"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/85 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Live Capacity Pill + Mobile Menu Toggle + Order CTA */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-pink-100 bg-white/12 border border-white/20 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                3 Slots / Day
              </span>

              {/* Mobile Menu Trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-white/90 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Primary Pill CTA */}
              <Link
                href="/#configurator"
                className="bg-white text-[#2a131f] hover:bg-pink-50 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-[#a64766]" />
                <span>Book Cake</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Panel with Glassmorphism */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2.5 glass-header-scrolled rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white/90 hover:text-white px-3.5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/12 transition-colors flex items-center justify-between"
                >
                  <span>{link.name}</span>
                  <span className="text-xs text-pink-200/70">→</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
