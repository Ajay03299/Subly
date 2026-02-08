"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShoppingCart, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFilters, type FilterState } from "@/components/product-filters";

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

type SortOption = "price-asc" | "price-desc" | "rating" | "newest";

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 100000],
    rating: 0,
    productTypes: [],
    tags: [],
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          const productsArray = data.products || data;
          if (Array.isArray(productsArray)) {
            setProducts(productsArray);
            const maxPrice = Math.max(
              ...productsArray.map((p: Product) => {
                const recurringPrice = p.recurringPlans?.[0]?.price;
                return Math.max(recurringPrice ?? 0, Number(p.salesPrice) ?? 0);
              })
            );
            setFilters((prev) => ({
              ...prev,
              priceRange: [0, maxPrice],
            }));
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

  const availableTypes = useMemo(() => {
    const types = new Set(products.map((p) => p.type));
    return Array.from(types)
      .map((type) => PRODUCT_TYPES[type] || type)
      .sort();
  }, [products]);

  const availableTags = useMemo(() => {
    const tags = new Set(products.map((p) => p.tag?.name).filter(Boolean));
    return Array.from(tags).sort();
  }, [products]);

  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(
      ...products.map((p) => {
        const recurringPrice = p.recurringPlans?.[0]?.price;
        return Math.max(recurringPrice ?? 0, Number(p.salesPrice) ?? 0);
      })
    );
  }, [products]);

  const filteredAndSearched = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.tag?.name.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      const productPrice =
        p.recurringPlans?.[0]?.price ?? Number(p.salesPrice) ?? 0;
      if (
        productPrice < filters.priceRange[0] ||
        productPrice > filters.priceRange[1]
      ) {
        return false;
      }

      if (filters.rating > 0 && Number(p.averageRating) < filters.rating) {
        return false;
      }

      if (
        filters.productTypes.length > 0 &&
        !filters.productTypes.includes(PRODUCT_TYPES[p.type] || p.type)
      ) {
        return false;
      }

      if (filters.tags.length > 0) {
        if (!p.tag || !filters.tags.includes(p.tag.name)) {
          return false;
        }
      }

      return true;
    });
  }, [products, search, filters]);

  const sorted = useMemo(() => {
    const items = [...filteredAndSearched];

    switch (sortBy) {
      case "price-asc":
        return items.sort((a, b) => {
          const priceA =
            a.recurringPlans?.[0]?.price ?? Number(a.salesPrice) ?? 0;
          const priceB =
            b.recurringPlans?.[0]?.price ?? Number(b.salesPrice) ?? 0;
          return priceA - priceB;
        });
      case "price-desc":
        return items.sort((a, b) => {
          const priceA =
            a.recurringPlans?.[0]?.price ?? Number(a.salesPrice) ?? 0;
          const priceB =
            b.recurringPlans?.[0]?.price ?? Number(b.salesPrice) ?? 0;
          return priceB - priceA;
        });
      case "rating":
        return items.sort(
          (a, b) => Number(b.averageRating) - Number(a.averageRating)
        );
      case "newest":
        return items;
      default:
        return items;
    }
  }, [filteredAndSearched, sortBy]);

  const hasActiveFilters =
    filters.rating > 0 ||
    filters.productTypes.length > 0 ||
    filters.tags.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/40 bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <Badge variant="secondary" className="mb-3">
            Browse & Manage
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find Your Perfect{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Subscription
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
            Explore a curated selection of subscription services tailored for
            your needs
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <ProductFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableTypes={availableTypes}
                availableTags={availableTags as string[]}
                maxPrice={maxPrice}
              />
            </div>

            <div className="lg:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? "Loading products..."
                    : `${sorted.length} ${sorted.length === 1 ? "product" : "products"} found`}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() =>
                      setFilters({
                        priceRange: [0, maxPrice],
                        rating: 0,
                        productTypes: [],
                        tags: [],
                      })
                    }
                    className="text-sm text-primary hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              ) : sorted.length === 0 ? (
                <div className="rounded-lg border border-border/40 bg-muted/20 py-20 text-center">
                  <p className="text-muted-foreground">
                    {filteredAndSearched.length === 0
                      ? "No products match your search. Try different keywords."
                      : "No products match your filters. Try adjusting them."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {sorted.map((product) => (
                    <Card
                      key={product.id}
                      className="group overflow-hidden border-border/60 bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg"
                    >
                      <Link href={`/shop/${product.id}`}>
                        <CardHeader className="relative overflow-hidden p-0">
                          <div className="flex h-48 items-center justify-center bg-muted/50">
                            {product.images.length > 0 ? (
                              <img
                                src={product.images[0].url || "/placeholder.svg"}
                                alt={product.images[0].alt || product.name}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/30 text-3xl font-bold text-primary">
                                {product.name.charAt(0)}
                              </div>
                            )}
                          </div>

                          {product.tag && (
                            <Badge className="absolute right-3 top-3">
                              {product.tag.name}
                            </Badge>
                          )}
                        </CardHeader>
                      </Link>

                      <CardContent className="p-4">
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
                          <h3 className="mt-2 line-clamp-2 text-lg font-semibold hover:underline">
                            {product.name}
                          </h3>
                        </Link>

                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {product.description}
                        </p>

                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {Number(product.averageRating).toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(Number(product.averageRating) * 10)} reviews)
                          </span>
                        </div>

                        {product.recurringPlans?.length ? (
                          <div className="mt-3 space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">
                                ₹{Number(product.recurringPlans[0].price).toLocaleString()}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                /{product.recurringPlans[0].billingPeriod.toLowerCase()}
                              </span>
                            </div>
                            {product.recurringPlans.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                +{product.recurringPlans.length - 1} more{" "}
                                {product.recurringPlans.length > 2
                                  ? "plans"
                                  : "plan"}{" "}
                                available
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                              ₹{Number(product.salesPrice).toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              one-time
                            </span>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                        <Link href={`/shop/${product.id}`} className="w-full">
                          <Button className="w-full gap-2" size="sm">
                            <ShoppingCart className="h-4 w-4" />
                            View Details
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Subly — Subscription Management System
      </footer>
    </div>
  );
}
