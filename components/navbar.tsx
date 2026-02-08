"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  useEffect(() => {
    if (!configOpen || user?.role !== "ADMIN") return;

    const fetchTags = async () => {
      try {
        const res = await fetch("/api/admin/product-tags", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTags(data.tags || []);
      } catch {
        // silent
      }
    };

    fetchTags();
  }, [configOpen, user?.role]);

  // Close account dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    if (accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [accountOpen]);

  const handleAddTag = async () => {
    if (!tagName.trim()) {
      setTagError("Tag name is required");
      return;
    }

    try {
      setTagLoading(true);
      setTagError(null);
      const res = await fetch("/api/admin/product-tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: tagName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create tag");
      }

      const data = await res.json();
      setTags((prev) => [data.tag, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      setTagName("");
    } catch (err) {
      setTagError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setTagLoading(false);
    }
  };

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
          <div className="relative" ref={accountDropdownRef}>
            <Button
              variant="ghost"
              className="flex items-center gap-1.5 text-sm"
              onClick={() => setAccountOpen(!accountOpen)}
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
                  onClick={() => setAccountOpen(false)}
                >
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent"
                  onClick={() => setAccountOpen(false)}
                >
                  <ClipboardList className="h-4 w-4" />
                  My Orders
                </Link>
                <hr className="my-1 border-border" />
                <button
                  onClick={() => {
                    logout();
                    setAccountOpen(false);
                  }}
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
    </nav>
  );
}
