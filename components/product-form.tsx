"use client";

import { useEffect, useState } from "react";
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

interface ProductImage {
  url: string;
  alt?: string;
}

interface ProductTag {
  id: string;
  name: string;
}

interface RecurringPlan {
  id?: string;
  name: string;
  price: number;
  billingPeriod: string;
  minimumQuantity: number;
  startDate: string;
  endDate?: string;
  autoClose: boolean;
  closeable: boolean;
  renewable: boolean;
  pausable: boolean;
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
  const [description, setDescription] = useState("");
  const [tagId, setTagId] = useState("");
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  // Recurring Plans management
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
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

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  useEffect(() => {
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
  }, []);

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

  const addRecurringPlan = () => {
    if (!planName || !planPrice || !billingPeriod || !startDate) {
      setError("Please fill in all required recurring plan fields");
      return;
    }

    const newPlan: RecurringPlan = {
      name: planName,
      price: parseFloat(planPrice),
      billingPeriod,
      minimumQuantity: parseInt(minimumQuantity) || 1,
      startDate,
      endDate: endDate || undefined,
      autoClose,
      closeable,
      renewable,
      pausable,
    };

    setRecurringPlans([...recurringPlans, newPlan]);
    setPlanName("");
    setPlanPrice("");
    setBillingPeriod("MONTHLY");
    setMinimumQuantity("1");
    setStartDate("");
    setEndDate("");
    setAutoClose(false);
    setCloseable(true);
    setRenewable(true);
    setPausable(false);
    setError(null);
  };

  const removeRecurringPlan = (index: number) => {
    setRecurringPlans(recurringPlans.filter((_, i) => i !== index));
  };

  const addImage = () => {
    if (!imageUrl) {
      setError("Please provide an image URL");
      return;
    }

    const newImage: ProductImage = {
      url: imageUrl,
      alt: imageAlt || undefined,
    };

    setImages([...images, newImage]);
    setImageUrl("");
    setImageAlt("");
    setError(null);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate basic product fields
    if (!name || !salesPrice || !costPrice) {
      setError("Please fill in all required product fields");
      return;
    }

    try {
      const formData = {
        product: {
          name,
          type,
          salesPrice: parseFloat(salesPrice),
          costPrice: parseFloat(costPrice),
          description: description || null,
          tagId: tagId || null,
          images,
        },
        variants,
        recurringPlans,
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

          <div className="space-y-2">
            <Label htmlFor="tagId">Product Tag (Optional)</Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger id="tagId">
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent position="popper">
                {tags.length === 0 ? (
                  <SelectItem value="no-tags" disabled>
                    No tags available
                  </SelectItem>
                ) : (
                  tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Product Description (Optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Images Card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Images (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="e.g., https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageAlt">Alt Text (Optional)</Label>
            <Input
              id="imageAlt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="e.g., Product main image"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={addImage}
          >
            <Plus className="h-4 w-4" />
            Add Image
          </Button>

          {images.length > 0 && (
            <div className="space-y-2">
              <Label>Added Images</Label>
              <div className="space-y-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex-1 truncate">
                      <p className="truncate text-sm font-medium">{image.url}</p>
                      {image.alt && (
                        <p className="text-xs text-muted-foreground">
                          Alt: {image.alt}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(index)}
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

      {/* Recurring Plans Card */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Plans (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 rounded-lg border border-dashed p-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., Monthly Subscription"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="planPrice">Plan Price</Label>
                <Input
                  id="planPrice"
                  type="number"
                  step="0.01"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingPeriod">Billing Period</Label>
                <Select value={billingPeriod} onValueChange={setBillingPeriod}>
                  <SelectTrigger id="billingPeriod">
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
              />
            </div>

            <div className="space-y-2">
              <Label>Plan Options</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClose}
                    onChange={(e) => setAutoClose(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Auto Close</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeable}
                    onChange={(e) => setCloseable(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Closeable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewable}
                    onChange={(e) => setRenewable(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Renewable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pausable}
                    onChange={(e) => setPausable(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm">Pausable</span>
                </label>
              </div>
            </div>

            <Button
              type="button"
              onClick={addRecurringPlan}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Recurring Plan
            </Button>
          </div>

          {/* List of added recurring plans */}
          {recurringPlans.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Added Plans ({recurringPlans.length})
              </Label>
              <div className="space-y-2">
                {recurringPlans.map((plan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div>
                      <Badge variant="outline" className="mr-2">
                        {plan.billingPeriod}
                      </Badge>
                      <span className="text-sm font-medium">{plan.name}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ₹{plan.price.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecurringPlan(index)}
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
