"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/cases", label: "Cases" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/architecture", label: "Architecture" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between py-5 border-b border-[var(--color-border)] mb-10">
      <Link
        href="/"
        className="font-[var(--font-mono)] text-sm font-semibold tracking-wider text-[var(--color-text)] no-underline uppercase"
      >
        InfraResolution Bench
      </Link>
      <nav className="flex gap-5">
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
    </header>
  );
}
