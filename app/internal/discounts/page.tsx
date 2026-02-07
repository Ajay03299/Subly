"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Pencil, Save, Trash2, X } from "lucide-react";

interface Discount {
  id: string;
  name: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  minimumPurchase: number;
  minimumQuantity: number;
  startDate: string;
  endDate: string | null;
  limitUsage: number | null;
  createdAt: string;
}

const emptyForm = {
  name: "",
  code: "",
  type: "PERCENTAGE" as "FIXED" | "PERCENTAGE",
  value: "",
  minimumPurchase: "",
  minimumQuantity: "",
  startDate: "",
  endDate: "",
  limitUsage: "",
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function DiscountsPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({ ...emptyForm });

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/discounts", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch discounts");
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchDiscounts();
    }
  }, [authLoading, user?.role]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!form.value) {
      setError("Value is required");
      return;
    }

    if (!form.startDate) {
      setError("Start date is required");
      return;
    }

    try {
      setError(null);
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          type: form.type,
          value: Number(form.value),
          minimumPurchase: Number(form.minimumPurchase || 0),
          minimumQuantity: Number(form.minimumQuantity || 0),
          startDate: form.startDate,
          endDate: form.endDate || null,
          limitUsage: form.limitUsage ? Number(form.limitUsage) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create discount");
      }

      const data = await res.json();
      setDiscounts((prev) => [data.discount, ...prev]);
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create discount");
    }
  };

  const startEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setEditing({
      name: discount.name,
      code: discount.code,
      type: discount.type,
      value: String(discount.value),
      minimumPurchase: String(discount.minimumPurchase ?? ""),
      minimumQuantity: String(discount.minimumQuantity ?? ""),
      startDate: toDateInput(discount.startDate),
      endDate: toDateInput(discount.endDate),
      limitUsage: discount.limitUsage != null ? String(discount.limitUsage) : "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing({ ...emptyForm });
  };

  const handleUpdate = async (id: string) => {
    if (!editing.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!editing.value) {
      setError("Value is required");
      return;
    }

    if (!editing.startDate) {
      setError("Start date is required");
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: editing.name.trim(),
          code: editing.code.trim(),
          type: editing.type,
          value: Number(editing.value),
          minimumPurchase: Number(editing.minimumPurchase || 0),
          minimumQuantity: Number(editing.minimumQuantity || 0),
          startDate: editing.startDate,
          endDate: editing.endDate || null,
          limitUsage: editing.limitUsage ? Number(editing.limitUsage) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update discount");
      }

      const data = await res.json();
      setDiscounts((prev) => prev.map((d) => (d.id === id ? data.discount : d)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update discount");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete discount");
      }

      setDiscounts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete discount");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Discounts</CardTitle>
            <CardDescription>Create and manage discount codes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid gap-4 rounded-lg border border-border bg-card p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Holiday Sale"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Code (optional)</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="HOLIDAY2026"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value) =>
                      setForm({ ...form, type: value as "FIXED" | "PERCENTAGE" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="FIXED">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Value</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Minimum Purchase</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minimumPurchase}
                    onChange={(e) => setForm({ ...form, minimumPurchase: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Minimum Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.minimumQuantity}
                    onChange={(e) => setForm({ ...form, minimumQuantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Usage Limit (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.limitUsage}
                    onChange={(e) => setForm({ ...form, limitUsage: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreate}>Create Discount</Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No discounts created yet.</p>
            ) : (
              <div className="space-y-3">
                {discounts.map((discount) => (
                  <div key={discount.id} className="rounded-lg border border-border bg-card p-4">
                    {editingId === discount.id ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          />
                          <Input
                            value={editing.code}
                            onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Select
                            value={editing.type}
                            onValueChange={(value) =>
                              setEditing({ ...editing, type: value as "FIXED" | "PERCENTAGE" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                              <SelectItem value="FIXED">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editing.minimumPurchase}
                            onChange={(e) => setEditing({ ...editing, minimumPurchase: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Input
                            type="number"
                            min="0"
                            value={editing.minimumQuantity}
                            onChange={(e) => setEditing({ ...editing, minimumQuantity: e.target.value })}
                          />
                          <Input
                            type="date"
                            value={editing.startDate}
                            onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                          />
                          <Input
                            type="date"
                            value={editing.endDate}
                            onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            type="number"
                            min="0"
                            value={editing.limitUsage}
                            onChange={(e) => setEditing({ ...editing, limitUsage: e.target.value })}
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleUpdate(discount.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{discount.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Code: {discount.code} • {discount.type === "PERCENTAGE" ? `${Number(discount.value)}%` : `₹${Number(discount.value)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Min Purchase: ₹{Number(discount.minimumPurchase)} • Min Qty: {discount.minimumQuantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(discount)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(discount.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
