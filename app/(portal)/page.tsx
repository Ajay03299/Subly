"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ShoppingCart, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Mock data — replace with real API calls later                     */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["All Products", "SaaS", "Support", "Hosting", "Add-ons"];

const PRODUCTS = [
  {
    id: "1",
    name: "Subly Pro",
    category: "SaaS",
    image: "/products/placeholder1.svg",
    monthlyPrice: 1200,
    yearlyPrice: 12000,
    rating: 4.8,
    tag: "Popular",
  },
  {
    id: "2",
    name: "Subly Starter",
    category: "SaaS",
    image: "/products/placeholder2.svg",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    rating: 4.5,
    tag: null,
  },
  {
    id: "3",
    name: "Priority Support",
    category: "Support",
    image: "/products/placeholder3.svg",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    rating: 4.9,
    tag: "New",
  },
  {
    id: "4",
    name: "Cloud Hosting",
    category: "Hosting",
    image: "/products/placeholder4.svg",
    monthlyPrice: 799,
    yearlyPrice: 7990,
    rating: 4.6,
    tag: null,
  },
  {
    id: "5",
    name: "Analytics Add-on",
    category: "Add-ons",
    image: "/products/placeholder5.svg",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    rating: 4.3,
    tag: null,
  },
  {
    id: "6",
    name: "Enterprise Suite",
    category: "SaaS",
    image: "/products/placeholder6.svg",
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    rating: 4.9,
    tag: "Best Value",
  },
];

/* ------------------------------------------------------------------ */
/*  Home / Shop page                                                  */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = PRODUCTS.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All Products" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) =>
    sortAsc
      ? a.monthlyPrice - b.monthlyPrice
      : b.monthlyPrice - a.monthlyPrice
  );

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        {/* subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] dark:opacity-[0.06]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            Subscription Management Made Easy
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Your Subscriptions,{" "}
            <span className="bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
              Simplified
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Browse products, pick a plan, and manage everything from one place.
            Flexible billing, transparent pricing, zero hassle.
          </p>
        </div>
      </section>

      {/* ── Filters & Search ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search + Sort row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setSortAsc(!sortAsc)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Price: {sortAsc ? "Low → High" : "High → Low"}
          </Button>
        </div>

        {/* Category chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── Product Grid ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No products found. Try a different search or category.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <Card
                key={product.id}
                className="group relative overflow-hidden transition-shadow hover:shadow-lg"
              >
                {product.tag && (
                  <Badge className="absolute right-3 top-3 z-10">
                    {product.tag}
                  </Badge>
                )}

                <CardHeader className="p-0">
                  <div className="flex h-48 items-center justify-center bg-muted/50">
                    {/* Placeholder product image */}
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/30 text-3xl font-bold text-primary">
                      {product.name.charAt(0)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {product.category}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>

                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" />
                    <span className="text-sm text-muted-foreground">
                      {product.rating}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      ₹{product.monthlyPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    or ₹{product.yearlyPrice}/year
                  </p>
                </CardContent>

                <CardFooter className="px-5 pb-5 pt-0">
                  <Button className="w-full gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Subly — Subscription Management System
      </footer>
    </div>
  );
}
