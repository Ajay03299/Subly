"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ShoppingBag,
  User,
  ChevronDown,
  LogOut,
  UserCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { label: "Subscriptions", href: "/internal/subscriptions" },
  { label: "Products", href: "/internal/products" },
  { label: "Reporting", href: "/internal/reporting" },
  { label: "Users/Contacts", href: "/internal/users" },
  { label: "Configuration", href: "/internal/configuration" },
];

export function InternalNavbar() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

  // Mock user
  const userName = "Ashik D";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* ── Top row: logo + search + user ──────────────── */}
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/internal/subscriptions" className="flex shrink-0 items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">Subly</span>
          </Link>

          {/* Search */}
          <div className="relative hidden w-full max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-9 pl-9 text-sm"
            />
          </div>

          {/* Right: user + theme */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Profile dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-sm"
                onClick={() => setProfileOpen(!profileOpen)}
                onBlur={() => setTimeout(() => setProfileOpen(false), 150)}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <span className="hidden font-medium sm:inline">{userName}</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    profileOpen && "rotate-180"
                  )}
                />
              </Button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                  <Link
                    href="/internal/profile"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                  >
                    <UserCircle className="h-4 w-4" />
                    My Profile
                  </Link>
                  <hr className="my-1 border-border" />
                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab row ────────────────────────────────────── */}
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {NAV_TABS.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}

          {/* My Profile tab on far right */}
          <Link
            href="/internal/profile"
            className={cn(
              "ml-auto whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/internal/profile")
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            My Profile
          </Link>
        </div>
      </div>
    </nav>
  );
}
