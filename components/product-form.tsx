"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface Variant {
  id?: string;
  attribute: string;
  value: string;
  extraPrice: number;
}

interface ProductFormProps {
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function ProductForm({ onSubmit, loading = false }: ProductFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("SERVICE");
  const [salesPrice, setSalesPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const [hasRecurring, setHasRecurring] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("MONTHLY");
  const [minimumQuantity, setMinimumQuantity] = useState("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoClose, setAutoClose] = useState(false);
  const [closeable, setCloseable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [pausable, setPausable] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantAttribute, setVariantAttribute] = useState("");
  const [variantValue, setVariantValue] = useState("");
  const [variantExtraPrice, setVariantExtraPrice] = useState("");

  const [error, setError] = useState<string | null>(null);

  const addVariant = () => {
    if (!variantAttribute || !variantValue) {
      setError("Please fill in attribute and value");
      return;
    }

    const newVariant: Variant = {
      attribute: variantAttribute,
      value: variantValue,
      extraPrice: variantExtraPrice ? parseFloat(variantExtraPrice) : 0,
    };

    setVariants([...variants, newVariant]);
    setVariantAttribute("");
    setVariantValue("");
    setVariantExtraPrice("");
    setError(null);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate basic product fields
    if (!name || !salesPrice || !costPrice) {
      setError("Please fill in all required product fields");
      return;
    }

    // Validate recurring plan if enabled
    if (
      hasRecurring &&
      (!planName || !planPrice || !billingPeriod || !startDate)
    ) {
      setError("Please fill in all required recurring plan fields");
      return;
    }

    try {
      const formData = {
        product: {
          name,
          type,
          salesPrice: parseFloat(salesPrice),
          costPrice: parseFloat(costPrice),
        },
        variants,
        recurring: hasRecurring
          ? {
              name: planName,
              price: parseFloat(planPrice),
              billingPeriod,
              minimumQuantity: parseInt(minimumQuantity),
              startDate,
              endDate: endDate || null,
              autoClose,
              closeable,
              renewable,
              pausable,
            }
          : null,
      };

      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Odoo Enterprise"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Product Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">Service</SelectItem>
                  <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                  <SelectItem value="STORABLE">Storable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesPrice">Sales Price *</Label>
              <Input
                id="salesPrice"
                type="number"
                step="0.01"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price *</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Variants Card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Variants (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="variantAttribute">Attribute (e.g., Tier)</Label>
            <Input
              id="variantAttribute"
              value={variantAttribute}
              onChange={(e) => setVariantAttribute(e.target.value)}
              placeholder="e.g., Tier, Region, Color"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="variantValue">Value (e.g., Enterprise)</Label>
              <Input
                id="variantValue"
                value={variantValue}
                onChange={(e) => setVariantValue(e.target.value)}
                placeholder="e.g., Enterprise, Standard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantExtraPrice">Extra Price</Label>
              <Input
                id="variantExtraPrice"
                type="number"
                step="0.01"
                value={variantExtraPrice}
                onChange={(e) => setVariantExtraPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={addVariant}
          >
            <Plus className="h-4 w-4" />
            Add Variant
          </Button>

          {variants.length > 0 && (
            <div className="space-y-2">
              <Label>Added Variants</Label>
              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <Badge variant="outline" className="mr-2">
                        {variant.attribute}
                      </Badge>
                      <span className="text-sm font-medium">
                        {variant.value}
                      </span>
                      {variant.extraPrice > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          +₹{variant.extraPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recurring Plan (Optional)</CardTitle>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasRecurring}
                onChange={(e) => setHasRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Enable Recurring Plan</span>
            </label>
          </div>
        </CardHeader>

        {hasRecurring && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., Monthly Subscription"
                required={hasRecurring}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="planPrice">Plan Price *</Label>
                <Input
                  id="planPrice"
                  type="number"
                  step="0.01"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="0.00"
                  required={hasRecurring}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingPeriod">Billing Period *</Label>
                <Select
                  value={billingPeriod}
                  onValueChange={setBillingPeriod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required={hasRecurring}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimumQuantity">Minimum Quantity</Label>
              <Input
                id="minimumQuantity"
                type="number"
                min="1"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-3">
              <Label>Plan Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClose}
                    onChange={(e) => setAutoClose(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Auto Close</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeable}
                    onChange={(e) => setCloseable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Closeable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewable}
                    onChange={(e) => setRenewable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Renewable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pausable}
                    onChange={(e) => setPausable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Pausable</span>
                </label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating Product..." : "Create Product"}
      </Button>
    </form>
  );
}
