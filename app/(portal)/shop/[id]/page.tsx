"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Star,
  Minus,
  Plus,
  Truck,
  Shield,
  ChevronRight,
  CalendarDays,
  RefreshCw,
  Pause,
  X as XIcon,
  Lock,
  Info,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart, type ProductVariant } from "@/lib/cart-context";
import { getProduct, PRODUCT_TYPES } from "@/lib/products-data";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helper: group variants by attribute                               */
/* ------------------------------------------------------------------ */
function groupVariants(variants: ProductVariant[]) {
  const map = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const arr = map.get(v.attribute) ?? [];
    arr.push(v);
    map.set(v.attribute, arr);
  }
  return map;
}

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const product = getProduct(id);

  /* ── local state ────────────────────────────────────── */
  const [selectedImage, setSelectedImage] = useState(0);
  const [plan, setPlan] = useState<"Monthly" | "Yearly">("Monthly");
  const [quantity, setQuantity] = useState(1);

  // Per-attribute variant selection
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, ProductVariant>
  >({});

  // Variant dropdown open state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Computed
  const grouped = useMemo(
    () => (product ? groupVariants(product.variants) : new Map()),
    [product]
  );

  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Product not found</h2>
          <p className="mt-2 text-muted-foreground">
            The product you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/">Back to Shop</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── pricing ───────────────────────────────────────── */
  const basePrice =
    plan === "Monthly" ? product.monthlyPrice : product.yearlyPrice;

  const totalExtraPrice = Object.values(selectedVariants).reduce(
    (sum, v) => sum + v.extraPrice,
    0
  );

  const unitPrice = basePrice + totalExtraPrice;
  const untaxedTotal = unitPrice * quantity;
  const taxAmount = untaxedTotal * (product.taxRate / 100);
  const grandTotal = untaxedTotal + taxAmount;

  /* ── variant helpers ───────────────────────────────── */
  function selectVariant(attribute: string, variant: ProductVariant) {
    setSelectedVariants((prev) => {
      // Toggle off if already selected
      if (prev[attribute]?.value === variant.value) {
        const next = { ...prev };
        delete next[attribute];
        return next;
      }
      return { ...prev, [attribute]: variant };
    });
    setOpenDropdown(null);
  }

  // For cart: pick the first selected variant (or combine label)
  const primaryVariant: ProductVariant | null = (() => {
    const vals = Object.values(selectedVariants);
    if (vals.length === 0) return null;
    if (vals.length === 1) return vals[0];
    // Combine into a single "virtual" variant
    return {
      attribute: vals.map((v) => v.attribute).join(" + "),
      value: vals.map((v) => v.value).join(", "),
      extraPrice: totalExtraPrice,
    };
  })();

  function handleAddToCart() {
    addItem({
      product,
      quantity,
      plan,
      selectedVariant: primaryVariant,
    });
    router.push("/cart");
  }

  /* ── render ────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Breadcrumb ──────────────────────────────────── */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          All Products
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/?category=${product.category}`} className="hover:text-foreground transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* ── Left: Images ──────────────────────────────── */}
        <div className="space-y-4">
          {/* Main image — click thumbnails to show in big */}
          <div className="relative flex h-80 items-center justify-center rounded-xl border border-border bg-muted/30 sm:h-[440px]">
            <div className="flex h-44 w-44 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 text-7xl font-bold text-primary">
              {product.name.charAt(0)}
            </div>
            <span className="absolute bottom-3 right-3 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
              {product.images[selectedImage]}
            </span>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-lg border-2 bg-muted/30 text-xs font-medium transition-all",
                    selectedImage === i
                      ? "border-primary shadow-sm"
                      : "border-transparent hover:border-border"
                  )}
                >
                  {img}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Details ────────────────────────────── */}
        <div className="space-y-6">
          {/* Header badges */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              <Badge variant="outline">
                {PRODUCT_TYPES[product.type] ?? product.type}
              </Badge>
              {product.tag && <Badge>{product.tag}</Badge>}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-2 flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-chart-4 text-chart-4" />
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-xs text-muted-foreground">/5</span>
            </div>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* ── Billing Plan toggle ──────────────────────── */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Billing Period
            </label>
            <div className="inline-flex rounded-lg border border-border p-1">
              {(["Monthly", "Yearly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={cn(
                    "rounded-md px-5 py-2.5 text-sm font-medium transition-all",
                    plan === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                  <span className="ml-1 text-xs opacity-70">
                    ₹{p === "Monthly" ? product.monthlyPrice : product.yearlyPrice}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Recurring Plan info ──────────────────────── */}
          {product.recurringPlan && (
            <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Subscription Plan: {product.recurringPlan.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted-foreground">Billing:</span>{" "}
                    <span className="font-medium capitalize">
                      {product.recurringPlan.billingPeriod.toLowerCase()}
                    </span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Min Qty:</span>{" "}
                    <span className="font-medium">
                      {product.recurringPlan.minimumQuantity}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.recurringPlan.closeable && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <XIcon className="h-3 w-3" /> Closeable
                    </Badge>
                  )}
                  {product.recurringPlan.renewable && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Renewable
                    </Badge>
                  )}
                  {product.recurringPlan.pausable && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Pause className="h-3 w-3" /> Pausable
                    </Badge>
                  )}
                  {product.recurringPlan.autoClose && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Lock className="h-3 w-3" /> Auto Close
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Variant selectors (grouped by attribute) ── */}
          {product.variants.length > 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Variants Available
              </label>

              {[...grouped.entries()].map(([attribute, options]) => (
                <div key={attribute} className="space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {attribute}
                  </span>

                  {/* Dropdown-style selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === attribute ? null : attribute
                        )
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors",
                        selectedVariants[attribute]
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {selectedVariants[attribute] ? (
                        <span>
                          {selectedVariants[attribute].value}
                          {selectedVariants[attribute].extraPrice > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (+₹{selectedVariants[attribute].extraPrice})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Select {attribute}...</span>
                      )}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          openDropdown === attribute && "rotate-180"
                        )}
                      />
                    </button>

                    {openDropdown === attribute && (
                      <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg">
                        {options.map((v) => {
                          const isSelected =
                            selectedVariants[attribute]?.value === v.value;
                          return (
                            <button
                              key={v.value}
                              type="button"
                              onClick={() => selectVariant(attribute, v)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "text-popover-foreground hover:bg-accent"
                              )}
                            >
                              <span>
                                {v.value}
                                {v.extraPrice > 0 && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    +₹{v.extraPrice}
                                  </span>
                                )}
                              </span>
                              {isSelected && <Check className="h-4 w-4" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Quantity ─────────────────────────────────── */}
          <div>
            <label className="mb-2 block text-sm font-medium">Quantity</label>
            <div className="inline-flex items-center rounded-lg border border-border">
              <button
                className="px-3 py-2.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={
                  quantity <=
                  (product.recurringPlan?.minimumQuantity ?? 1)
                }
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[3rem] text-center text-sm font-semibold">
                {quantity}
              </span>
              <button
                className="px-3 py-2.5 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {product.recurringPlan &&
              product.recurringPlan.minimumQuantity > 1 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Minimum quantity: {product.recurringPlan.minimumQuantity}
                </p>
              )}
          </div>

          {/* ── Price breakdown ──────────────────────────── */}
          <Card>
            <CardContent className="space-y-3 p-5">
              {/* Unit price */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  Unit Price
                </span>
                <span className="text-2xl font-bold">
                  ₹{unitPrice.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan === "Monthly" ? "mo" : "yr"}
                  </span>
                </span>
              </div>

              {totalExtraPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base ₹{basePrice.toLocaleString()} + variant extras ₹
                  {totalExtraPrice.toLocaleString()}
                </p>
              )}

              <hr className="border-border" />

              {/* Breakdown */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Untaxed Amount ({quantity} × ₹{unitPrice.toLocaleString()})
                  </span>
                  <span className="font-medium tabular-nums">
                    ₹{untaxedTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax {product.taxRate}%
                  </span>
                  <span className="font-medium tabular-nums">
                    ₹
                    {taxAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    ₹
                    {grandTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Add to Cart ─────────────────────────────── */}
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </Button>

          {/* ── Info cards ───────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Truck className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Shipping</p>
                  <p className="text-xs text-muted-foreground">
                    2-3 Business days
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Shield className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Terms</p>
                  <p className="text-xs text-muted-foreground">
                    T&amp;C apply
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tax</p>
                  <p className="text-xs text-muted-foreground">
                    {product.taxRate}% included
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
