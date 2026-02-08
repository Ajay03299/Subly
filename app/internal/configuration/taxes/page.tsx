"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Pencil, Save, Trash2, X } from "lucide-react";

interface Tax {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "",
  rate: "",
  isDefault: false,
};

export default function TaxesPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({ ...emptyForm });

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/taxes", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch taxes");
      const data = await res.json();
      setTaxes(data.taxes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      fetchTaxes();
    }
  }, [authLoading, user?.role]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Tax name is required");
      return;
    }

    if (!form.rate) {
      setError("Tax rate is required");
      return;
    }

    try {
      setError(null);
      const res = await fetch("/api/admin/taxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          rate: Number(form.rate),
          isDefault: form.isDefault,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create tax");
      }

      const data = await res.json();
      setTaxes((prev) => {
        let updated = [...prev];
        if (form.isDefault) {
          updated = updated.map((t) => ({ ...t, isDefault: false }));
        }
        return [data.tax, ...updated];
      });
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tax");
    }
  };

  const startEdit = (tax: Tax) => {
    setEditingId(tax.id);
    setEditing({
      name: tax.name,
      rate: String(tax.rate),
      isDefault: tax.isDefault,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing({ ...emptyForm });
  };

  const handleUpdate = async (id: string) => {
    if (!editing.name.trim()) {
      setError("Tax name is required");
      return;
    }

    if (!editing.rate) {
      setError("Tax rate is required");
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/taxes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: editing.name.trim(),
          rate: Number(editing.rate),
          isDefault: editing.isDefault,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update tax");
      }

      const data = await res.json();
      setTaxes((prev) => {
        let updated = prev.map((t) => (t.id === id ? data.tax : t));
        if (editing.isDefault) {
          updated = updated.map((t) => (t.id !== id && t.isDefault ? { ...t, isDefault: false } : t));
        }
        return updated;
      });
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tax");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/taxes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete tax");
      }

      setTaxes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tax");
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
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Tax Rates</CardTitle>
            <CardDescription>Manage tax rates applied to invoices and subscriptions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Tax Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. GST 18%"
                />
              </div>
              <div className="space-y-1">
                <Label>Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  placeholder="18.00"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Default</span>
                </label>
              </div>
              <Button onClick={handleCreate}>Add Tax</Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : taxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No taxes created yet.</p>
            ) : (
              <div className="space-y-2">
                {taxes.map((tax) => (
                  <div key={tax.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    {editingId === tax.id ? (
                      <div className="flex-1 flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editing.rate}
                            onChange={(e) => setEditing({ ...editing, rate: e.target.value })}
                          />
                        </div>
                        <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-muted">
                          <input
                            type="checkbox"
                            checked={editing.isDefault}
                            onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-xs">Default</span>
                        </label>
                        <Button size="sm" onClick={() => handleUpdate(tax.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium">{tax.name}</div>
                          <div className="text-sm text-muted-foreground">{Number(tax.rate).toFixed(2)}% {tax.isDefault && "• Default"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(tax)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tax.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
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
