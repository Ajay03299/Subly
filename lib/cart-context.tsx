"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProductVariant {
  id?: string;
  attribute: string;
  value: string;
  extraPrice: number;
}

export interface RecurringPlanInfo {
  id: string;
  billingPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  autoClose: boolean;
  closeable: boolean;
  renewable: boolean;
  pausable: boolean;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  type: "SERVICE" | "CONSUMABLE" | "STORABLE";
  description?: string | null;
  salesPrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  costPrice?: number;
  rating?: number;
  averageRating?: number;
  tag: { id: string; name: string } | string | null;
  variants: ProductVariant[];
  images?: string[] | { id: string; url: string; alt: string | null }[];
  recurringPlan?: RecurringPlanInfo | null;
  recurringPlans?: RecurringPlanInfo[];
  tax?: { id: string; name: string; rate: number } | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  plan: RecurringPlanInfo | "Monthly" | "Yearly" | null; // null for one-time purchases
  selectedVariant: ProductVariant | null;
}

interface CartCtx {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  refreshItemTaxes: () => Promise<void>;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  taxBreakdown: Array<{ name: string; rate: number; amount: number }>;
  taxAmount: number;
  total: number;
  discountCode: string;
  setDiscountCode: (c: string) => void;
  discountApplied: boolean;
  applyDiscount: () => Promise<void>;
  discountAmount: number;
}
/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE" | null>(null);
  const [discountValue, setDiscountValue] = useState(0);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === item.product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === item.product.id
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                plan: item.plan,
                selectedVariant: item.selectedVariant,
              }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      )
    );
  }, []);

  const refreshItemTaxes = useCallback(async () => {
    const missingTaxIds = items
      .filter((i) => !i.product.tax)
      .map((i) => i.product.id);

    if (missingTaxIds.length === 0) return;

    try {
      const [defaultTaxRes, ...productResults] = await Promise.all([
        fetch("/api/portal/tax/default"),
        ...missingTaxIds.map((id) => fetch(`/api/products/${id}`)),
      ]);

      const defaultTaxData = defaultTaxRes.ok ? await defaultTaxRes.json() : null;
      const defaultTax = defaultTaxData?.tax || null;

      const products = await Promise.all(
        productResults.map(async (res) => {
          if (!res.ok) return null;
          const data = await res.json();
          return data.product || null;
        })
      );

      setItems((prev) =>
        prev.map((item) => {
          const updated = products.find((p) => p?.id === item.product.id);
          const tax = updated?.tax || defaultTax || null;
          if (!tax) return item;
          return {
            ...item,
            product: {
              ...item.product,
              tax,
            },
          };
        })
      );
    } catch {
      // Silent fail
    }
  }, [items]);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountApplied(false);
    setDiscountType(null);
    setDiscountValue(0);
    setDiscountCode("");
  }, []);

  const applyDiscount = useCallback(async () => {
    const code = discountCode.trim();
    if (!code) return;

    try {
      const quantity = items.reduce((s, i) => s + i.quantity, 0);
      const subtotalValue = items.reduce((s, i) => {
        const base =
          typeof i.plan === "string"
            ? i.plan === "Monthly"
              ? (i.product.monthlyPrice ?? Number(i.product.salesPrice) ?? 0)
              : (i.product.yearlyPrice ?? Number(i.product.salesPrice) ?? 0)
            : Number(i.product.salesPrice) || 0;
        const extra = i.selectedVariant?.extraPrice ?? 0;
        return s + (base + extra) * i.quantity;
      }, 0);

      const res = await fetch("/api/portal/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: subtotalValue,
          quantity,
        }),
      });

      if (!res.ok) {
        setDiscountApplied(false);
        setDiscountType(null);
        setDiscountValue(0);
        return;
      }

      const data = await res.json();
      const discount = data.discount;

      setDiscountType(discount.type);
      setDiscountValue(Number(discount.value));
      setDiscountApplied(true);
    } catch {
      setDiscountApplied(false);
      setDiscountType(null);
      setDiscountValue(0);
    }
  }, [discountCode, items]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const subtotal = items.reduce((s, i) => {
    const base =
      typeof i.plan === "string"
        ? i.plan === "Monthly"
          ? (i.product.monthlyPrice ?? Number(i.product.salesPrice) ?? 0)
          : (i.product.yearlyPrice ?? Number(i.product.salesPrice) ?? 0)
        : Number(i.product.salesPrice) || 0;
    const extra = i.selectedVariant?.extraPrice ?? 0;
    return s + (base + extra) * i.quantity;
  }, 0);

  const rawDiscountAmount =
    discountApplied && discountType
      ? discountType === "PERCENTAGE"
        ? subtotal * (discountValue / 100)
        : discountValue
      : 0;
  const discountAmount = Math.min(rawDiscountAmount, subtotal);
  const afterDiscount = subtotal - discountAmount;
  const taxRatio = subtotal > 0 ? afterDiscount / subtotal : 1;

  const taxMap = new Map<string, { name: string; rate: number; amount: number }>();
  items.forEach((item) => {
    const base =
      typeof item.plan === "string"
        ? item.plan === "Monthly"
          ? (item.product.monthlyPrice ?? Number(item.product.salesPrice) ?? 0)
          : (item.product.yearlyPrice ?? Number(item.product.salesPrice) ?? 0)
        : Number(item.product.salesPrice) || 0;
    const extra = item.selectedVariant?.extraPrice ?? 0;
    const lineSubtotal = (base + extra) * item.quantity;
    const rate = Number(item.product.tax?.rate ?? 0);
    if (rate <= 0) return;
    const baseTax = lineSubtotal * (rate / 100);
    const name = item.product.tax?.name || `Tax (${rate.toFixed(0)}%)`;
    const key = item.product.tax?.id || `rate-${rate}`;
    const existing = taxMap.get(key);
    if (existing) {
      existing.amount += baseTax;
    } else {
      taxMap.set(key, { name, rate, amount: baseTax });
    }
  });

  const taxBreakdown = Array.from(taxMap.values()).map((t) => ({
    ...t,
    amount: t.amount * taxRatio,
  }));
  const taxAmount = taxBreakdown.reduce((s, t) => s + t.amount, 0);
  const total = afterDiscount + taxAmount;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        refreshItemTaxes,
        clearCart,
        itemCount,
        subtotal,
        taxBreakdown,
        taxAmount,
        total,
        discountCode,
        setDiscountCode,
        discountApplied,
        applyDiscount,
        discountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
