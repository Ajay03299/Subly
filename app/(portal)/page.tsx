"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { useCart } from "@/lib/cart-context";

const PRODUCT_TYPES: Record<string, string> = {
  SERVICE: "Service",
  CONSUMABLE: "Consumable",
  STORABLE: "Storable",
};

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductTag {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: "SERVICE" | "CONSUMABLE" | "STORABLE";
  salesPrice: number;
  tag: ProductTag | null;
  averageRating: number;
  images: ProductImage[];
  recurringPlans?: Array<{
    id: string;
    price: number;
    billingPeriod: string;
  }>;
}

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          // API returns {products: [...]}
          const productsArray = data.products || data;
          if (Array.isArray(productsArray)) {
            setProducts(productsArray);
          } else {
            console.error("API did not return an array:", data);
            setProducts([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.tag?.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    const priceA = a.recurringPlans?.[0]?.price ?? Number(a.salesPrice) ?? 0;
    const priceB = b.recurringPlans?.[0]?.price ?? Number(b.salesPrice) ?? 0;
    return sortAsc ? priceA - priceB : priceB - priceA;
  });

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/10 px-4 pb-16 pt-20 sm:px-6 lg:px-8">
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
          </p>
        </div>
      </section>

      {/* ── Filters & Search ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

        {/* Product count */}
        <div className="mt-4 text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "product" : "products"} found`}
        </div>
      </section>

      {/* ── Product Grid ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {loading ? (
          <p className="py-20 text-center text-muted-foreground">
            Loading products...
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            No products found. Try a different search.
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
                    {product.tag.name}
                  </Badge>
                )}

                <Link href={`/shop/${product.id}`}>
                  <CardHeader className="p-0">
                    <div className="flex h-48 items-center justify-center bg-muted/50 transition-colors group-hover:bg-muted/70">
                      {product.images.length > 0 ? (
                        <img
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/30 text-3xl font-bold text-primary">
                          {product.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Link>

                <CardContent className="p-5">
                  <div className="flex items-center gap-1.5">
                    {product.tag && (
                      <>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {product.tag.name}
                        </p>
                        <span className="text-muted-foreground/40">·</span>
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {PRODUCT_TYPES[product.type] ?? product.type}
                    </p>
                  </div>
                  <Link href={`/shop/${product.id}`}>
                    <h3 className="mt-1 text-lg font-semibold hover:underline">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {product.description}
                  </p>

                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-chart-4 text-chart-4" />
                    <span className="text-sm text-muted-foreground">
                      {Number(product.averageRating).toFixed(1)}
                    </span>
                  </div>

                  {product.recurringPlans?.length ? (
                    <>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold">
                          ₹{Number(product.recurringPlans[0].price).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{product.recurringPlans[0].billingPeriod.toLowerCase()}
                        </span>
                      </div>
                      {product.recurringPlans.length > 1 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          +{product.recurringPlans.length - 1} more plan{product.recurringPlans.length > 2 ? "s" : ""} available
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold">
                        ₹{Number(product.salesPrice).toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        one-time
                      </span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="px-5 pb-5 pt-0">
                  <Link href={`/shop/${product.id}`} className="w-full">
                    <Button className="w-full gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Subly — Subscription Management System
      </footer>
    </div>
  );
}
