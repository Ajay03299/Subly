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
  name: string;
  billingPeriod: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  price: number;
  minimumQuantity: number;
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
  description?: string;
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
  taxRate: number; // percentage, e.g. 15
}

export interface CartItem {
  product: Product;
  quantity: number;
  plan: RecurringPlanInfo | "Monthly" | "Yearly"; // support both new and old formats
  selectedVariant: ProductVariant | null;
}

interface CartCtx {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  discountCode: string;
  setDiscountCode: (c: string) => void;
  discountApplied: boolean;
  applyDiscount: () => void;
  discountAmount: number;
}

const DEFAULT_TAX_RATE = 0.15; // 15%
const DISCOUNT_CODES: Record<string, number> = {
  SAVE10: 0.1,
  WELCOME20: 0.2,
};

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);

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

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountApplied(false);
    setDiscountPct(0);
    setDiscountCode("");
  }, []);

  const applyDiscount = useCallback(() => {
    const pct = DISCOUNT_CODES[discountCode.toUpperCase()];
    if (pct) {
      setDiscountPct(pct);
      setDiscountApplied(true);
    }
  }, [discountCode]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const subtotal = items.reduce((s, i) => {
    const base =
      i.plan === "Monthly" ? i.product.monthlyPrice : i.product.yearlyPrice;
    const extra = i.selectedVariant?.extraPrice ?? 0;
    return s + (base + extra) * i.quantity;
  }, 0);

  const discountAmount = discountApplied ? subtotal * discountPct : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * DEFAULT_TAX_RATE;
  const total = afterDiscount + taxAmount;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        taxRate: DEFAULT_TAX_RATE,
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
