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

interface Tax {
  id: string;
  name: string;
  rate: number;
}

interface RecurringPlan {
  id: string;
  billingPeriod: string;
  autoClose: boolean;
  closeable: boolean;
  renewable: boolean;
  pausable: boolean;
}

interface RecurringPlanInfo {
  recurringPlanId: string;
  price: number;
  startDate: string;
  endDate?: string;
  plan?: RecurringPlan; // Populated when fetching existing data
}

interface Attribute {
  id: string;
  name: string;
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
  const [description, setDescription] = useState("");
  const [tagId, setTagId] = useState("");
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [taxId, setTaxId] = useState("");
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  // Recurring Plans
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [recurringPlanInfos, setRecurringPlanInfos] = useState<RecurringPlanInfo[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planStartDate, setPlanStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [planEndDate, setPlanEndDate] = useState("");

  // Attributes & Variants
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  
  // Variant form state
  const [selectedAttributeId, setSelectedAttributeId] = useState("");
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
    const fetchTaxes = async () => {
      try {
        const res = await fetch("/api/admin/taxes", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTaxes(data.taxes || []);
      } catch {
        // silent
      }
    };
    const fetchRecurringPlans = async () => {
      try {
        const res = await fetch("/api/admin/recurring-plans", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setRecurringPlans(data.plans || []);
      } catch {
        // silent
      }
    };
    const fetchAttributes = async () => {
      try {
        const res = await fetch("/api/admin/attributes", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setAttributes(data.attributes || []);
      } catch {
        // silent
      }
    };

    fetchTags();
    fetchTaxes();
    fetchRecurringPlans();
    fetchAttributes();
  }, []);

  // When attribute selection changes, update price
  useEffect(() => {
    if (!selectedAttributeId) {
      setVariantExtraPrice("");
      return;
    }
    const attr = attributes.find(a => a.id === selectedAttributeId);
    if (attr) {
      setVariantExtraPrice(attr.extraPrice.toString());
    }
  }, [selectedAttributeId, attributes]);

  const addVariant = () => {
    if (!selectedAttributeId) {
      setError("Please select an attribute variant");
      return;
    }

    const attr = attributes.find(a => a.id === selectedAttributeId);
    if (!attr) return;

    // Check if duplicate
    if (variants.some(v => v.attribute === attr.name && v.value === attr.value)) {
        setError("This variant already exists");
        return;
    }

    const newVariant: Variant = {
      attribute: attr.name,
      value: attr.value,
      extraPrice: variantExtraPrice ? parseFloat(variantExtraPrice) : 0,
    };

    setVariants([...variants, newVariant]);
    setSelectedAttributeId("");
    setVariantExtraPrice("");
    setError(null);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addRecurringPlanInfo = () => {
    if (!selectedPlanId || !planPrice || !planStartDate) {
      setError("Please select a plan, enter a price, and set a start date");
      return;
    }

    // Check if this plan is already added
    if (recurringPlanInfos.some(info => info.recurringPlanId === selectedPlanId)) {
      setError("This plan has already been added");
      return;
    }

    const plan = recurringPlans.find(p => p.id === selectedPlanId);
    if (!plan) {
      setError("Plan not found");
      return;
    }

    const newInfo: RecurringPlanInfo = {
      recurringPlanId: selectedPlanId,
      price: parseFloat(planPrice),
      startDate: planStartDate,
      endDate: planEndDate || undefined,
      plan,
    };

    setRecurringPlanInfos([...recurringPlanInfos, newInfo]);
    setSelectedPlanId("");
    setPlanPrice("");
    setPlanStartDate(new Date().toISOString().split("T")[0]);
    setPlanEndDate("");
    setError(null);
  };

  const removeRecurringPlanInfo = (index: number) => {
    setRecurringPlanInfos(recurringPlanInfos.filter((_, i) => i !== index));
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
    if (!name || !salesPrice || !costPrice || !taxId) {
      setError("Please fill in all required product fields and select a tax bracket");
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
          taxId: taxId || null,
          images,
        },
        variants,
        recurringPlanInfos,
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
            <Label htmlFor="taxId">Tax Bracket *</Label>
            <Select value={taxId} onValueChange={setTaxId}>
              <SelectTrigger id="taxId">
                <SelectValue placeholder="Select a tax bracket" />
              </SelectTrigger>
              <SelectContent position="popper">
                {taxes.length === 0 ? (
                  <SelectItem value="no-taxes" disabled>
                    No taxes available - Create one first
                  </SelectItem>
                ) : (
                  taxes.map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} ({Number(tax.rate)}%)
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
            <Label htmlFor="variantAttribute">Select Attribute Variant</Label>
            <Select value={selectedAttributeId} onValueChange={setSelectedAttributeId}>
              <SelectTrigger id="variantAttribute">
                <SelectValue placeholder="Select attribute (e.g. Color: Red)" />
              </SelectTrigger>
              <SelectContent>
                {attributes.length === 0 ? (
                    <SelectItem value="no-attrs" disabled>No attributes configured</SelectItem>
                ) : (
                    attributes.map(attr => (
                        <SelectItem key={attr.id} value={attr.id}>
                            {attr.name}: {attr.value} (+₹{Number(attr.extraPrice).toFixed(2)})
                        </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variantExtraPrice">Extra Price (Override)</Label>
            <Input
              id="variantExtraPrice"
              type="number"
              step="0.01"
              value={variantExtraPrice}
              onChange={(e) => setVariantExtraPrice(e.target.value)}
              placeholder="0.00"
            />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="selectedPlanId">Recurring Plan *</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger id="selectedPlanId">
                    <SelectValue placeholder="Select a recurring plan" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {recurringPlans.length === 0 ? (
                      <SelectItem value="no-plans" disabled>
                        No recurring plans available
                      </SelectItem>
                    ) : (
                      recurringPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.billingPeriod}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planPrice">Price for this Plan *</Label>
                <Input
                  id="planPrice"
                  type="number"
                  step="0.01"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="planStartDate">Start Date *</Label>
                <Input
                  id="planStartDate"
                  type="date"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planEndDate">
                  End Date <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="planEndDate"
                  type="date"
                  value={planEndDate}
                  onChange={(e) => setPlanEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={addRecurringPlanInfo}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Recurring Plan
            </Button>
          </div>

          {/* List of added recurring plan infos */}
          {recurringPlanInfos.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-base font-semibold">
                Associated Plans ({recurringPlanInfos.length})
              </Label>
              <div className="space-y-2">
                {recurringPlanInfos.map((info, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div className="flex flex-col">
                      <Badge variant="outline" className="mb-1 w-fit">
                        {info.plan?.billingPeriod}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Price: ₹{info.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        From: {new Date(info.startDate).toLocaleDateString()}
                      </span>
                      {info.endDate && (
                        <span className="text-xs text-muted-foreground">
                          Until: {new Date(info.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecurringPlanInfo(index)}
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
