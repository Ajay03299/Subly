"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/lib/auth-context";

const NAV_TABS = [
  { label: "Dashboard", href: "/internal" },
  { label: "Subscriptions", href: "/internal/subscriptions" },
  { label: "Products", href: "/internal/products" },
  { label: "Reporting", href: "/internal/reporting" },
  { label: "Users/Contacts", href: "/internal/users" },
];

export function InternalNavbar() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const configRef = useRef<HTMLDivElement | null>(null);
  const { user, logout } = useAuth();

  const getToken = () => localStorage.getItem("accessToken") ?? "";



  useEffect(() => {
    if (!configOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!configRef.current) return;
      if (!configRef.current.contains(event.target as Node)) {
        setConfigOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [configOpen]);



  // Get user name from email
  const userName = user?.email?.split("@")[0]?.charAt(0).toUpperCase() + user?.email?.split("@")[0]?.slice(1) || "User";
  const userInitial = user?.email?.substring(0, 1).toUpperCase() || "U";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* ── Top row: logo + search + user ──────────────── */}
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/internal" className="flex shrink-0 items-center gap-2">
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
                  {userInitial}
                </div>
                <span className="hidden font-medium sm:inline">{user?.email?.split("@")[0]}</span>
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
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab row ────────────────────────────────────── */}
        <div className="-mb-px flex gap-1 overflow-visible">
          <div className="flex gap-1 overflow-x-auto">
            {NAV_TABS.map((tab) => {
              const isActive = tab.href === "/internal"
                ? pathname === "/internal" || pathname === "/internal/"
                : pathname.startsWith(tab.href);
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
          </div>

          {user?.role === "ADMIN" && (
            <div className="relative" ref={configRef}>
              <Button
                variant="ghost"
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  configOpen
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
                onClick={() => setConfigOpen((prev) => !prev)}
              >
                Configuration
                <ChevronDown
                  className={cn(
                    "ml-2 h-3 w-3 transition-transform",
                    configOpen && "rotate-180"
                  )}
                />
              </Button>

              {configOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg space-y-2">
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration">Configuration Home</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration/tags">Product Tags</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration/recurring-plans">Recurring Plans</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration/quotation-templates">Quotation Templates</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration/attributes">Attributes</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(false)}>
                    <Link href="/internal/configuration/discounts">Discounts</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
