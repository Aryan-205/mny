"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/studio", label: "Studio" },
  { href: "/editor", label: "Editor" },
  { href: "/library", label: "Library" },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <div className="border-b w-full flex justify-center">
      <div className="flex items-center justify-between h-12 mx-auto min-w-7xl">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-semibold">
          <p className="text-sm text-green-500">MNY</p>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs px-4!",
                  pathname === link.href ? "underline! underline-offset-2!" : "text-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
