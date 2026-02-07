"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ShoppingBag,
  User,
  ChevronDown,
  ShoppingCart,
  LogOut,
  ClipboardList,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";

export function Navbar() {
  const [accountOpen, setAccountOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Subly</span>
        </Link>

        {/* Center nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            Shop
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Cart */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>
          </Button>

          {/* My Account dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 text-sm"
              onClick={() => setAccountOpen(!accountOpen)}
              onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Account</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  accountOpen && "rotate-180"
                )}
              />
            </Button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                >
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                >
                  <ClipboardList className="h-4 w-4" />
                  My Orders
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
    </nav>
  );
}
