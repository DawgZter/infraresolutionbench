"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/cases", label: "Cases" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/architecture", label: "Architecture" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between py-5 border-b border-[var(--color-border)] mb-10 relative">
      <Link
        href="/"
        className="font-[var(--font-mono)] text-sm font-semibold tracking-wider text-[var(--color-text)] no-underline uppercase"
      >
        InfraResolution Bench
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex gap-5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm no-underline transition-colors ${
              pathname === link.href
                ? "text-[var(--color-text)]"
                : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 bg-transparent border-none cursor-pointer p-1"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation"
        aria-expanded={open}
      >
        <span
          className={`block w-5 h-[2px] bg-[var(--color-text)] rounded transition-all duration-200 ${open ? "translate-y-[7px] rotate-45" : ""}`}
        />
        <span
          className={`block w-5 h-[2px] bg-[var(--color-text)] rounded transition-all duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block w-5 h-[2px] bg-[var(--color-text)] rounded transition-all duration-200 ${open ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-2 mt-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 text-sm no-underline transition-colors ${
                pathname === link.href
                  ? "text-[var(--color-text)] bg-[var(--color-accent-soft)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
