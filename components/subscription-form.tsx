"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  FileText,
  RefreshCw,
  XCircle,
  ArrowUpCircle,
  Lock,
  Loader2,
  Save,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface User {
  id: string;
  email: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  recurringPlanInfos?: Array<{
    id: string;
    recurringPlanId: string;
    price: number;
    startDate: string;
    endDate?: string | null;
    recurringPlan: {
      id: string;
      billingPeriod: string;
      autoClose: boolean;
      closeable: boolean;
      renewable: boolean;
      pausable: boolean;
    };
  }>;
}

interface RecurringPlan {
  id: string;
  billingPeriod: string;
  autoClose: boolean;
  closeable: boolean;
  renewable: boolean;
  pausable: boolean;
  product?: { id: string; name: string };
}

interface Tax {
  id: string;
  name: string;
  rate: number;
}

interface OrderLine {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface SubscriptionData {
  id?: string;
  subscriptionNo?: string;
  userId?: string;
  user?: { id: string; email: string };
  recurringPlanId?: string | null;
  recurringPlan?: RecurringPlan | null;
  paymentTerms?: string | null;
  status?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  lines?: Array<{
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  invoices?: Array<{
    id: string;
    invoiceNo: string;
    status: string;
    totalAmount: number;
    issueDate: string;
  }>;
  payments?: Array<{
    id: string;
    method: string;
    amount: number;
    paymentDate: string;
  }>;
  createdAt?: string;
}

interface SubscriptionFormProps {
  subscription?: SubscriptionData | null;
  onSave: (data: any) => Promise<void>;
  onStatusChange: (status: string) => Promise<void>;
  onAction: (action: string) => Promise<any>;
  onBack: () => void;
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */
function statusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "QUOTATION":
      return "outline";
    case "CONFIRMED":
      return "default";
    case "ACTIVE":
      return "default";
    case "CLOSED":
      return "destructive";
    default:
      return "secondary";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "QUOTATION":
      return "Quotation Sent";
    case "CONFIRMED":
      return "Confirmed";
    case "ACTIVE":
      return "Active";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SubscriptionForm({
  subscription,
  onSave,
  onStatusChange,
  onAction,
  onBack,
  loading = false,
}: SubscriptionFormProps) {
  const isNew = !subscription?.id;
  const status = subscription?.status || "DRAFT";

  // Core fields
  const [customerId, setCustomerId] = useState(
    subscription?.userId || subscription?.user?.id || ""
  );
  const [recurringPlanId, setRecurringPlanId] = useState(
    subscription?.recurringPlanId || ""
  );
  const [paymentTerms, setPaymentTerms] = useState(
    subscription?.paymentTerms || "IMMEDIATE"
  );
  const [expirationDate, setExpirationDate] = useState("");

  // Other info
  const [orderDate] = useState(
    subscription?.createdAt
      ? new Date(subscription.createdAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  // Order lines
  const [lines, setLines] = useState<OrderLine[]>(() => {
    if (subscription?.lines && subscription.lines.length > 0) {
      return subscription.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product?.name || "",
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        discount: 0,
        taxRate: Number(l.taxRate),
        amount: Number(l.amount),
      }));
    }
    return [];
  });

  // Dropdown data
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recurringPlans, setRecurringPlans] = useState<RecurringPlan[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);

  // Quotation templates
  const [templates, setTemplates] = useState<Array<{
    id: string;
    name: string;
    recurringPlanId?: string | null;
    lines: Array<{
      product: { id: string; name: string; salesPrice: number };
      quantity: number;
    }>;
  }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  // Plan option filters (for filtering which products show in the dropdown)
  const [filterAutoClose, setFilterAutoClose] = useState(false);
  const [filterCloseable, setFilterCloseable] = useState(false);
  const [filterPausable, setFilterPausable] = useState(false);
  const [filterRenewable, setFilterRenewable] = useState(false);
  const [filterPlanId, setFilterPlanId] = useState(""); // specific recurring plan

  // Compute filtered products: only show products with plans matching active filters
  const hasAnyFilter =
    filterAutoClose || filterCloseable || filterPausable || filterRenewable || filterPlanId;

  const filteredProducts = hasAnyFilter
    ? products.filter((p) => {
        if (!p.recurringPlanInfos || p.recurringPlanInfos.length === 0) return false;
        // If a specific plan is selected, check that product has that plan
        if (filterPlanId) {
          const hasPlan = p.recurringPlanInfos.some(
            (info) => info.recurringPlan.id === filterPlanId
          );
          if (!hasPlan) return false;
        }
        // Check that at least one plan satisfies ALL selected option filters
        return p.recurringPlanInfos.some((info) => {
          const rp = info.recurringPlan;
          if (filterAutoClose && !rp.autoClose) return false;
          if (filterCloseable && !rp.closeable) return false;
          if (filterPausable && !rp.pausable) return false;
          if (filterRenewable && !rp.renewable) return false;
          return true;
        });
      })
    : products;

  // Inline line editor state
  const [newLineProductId, setNewLineProductId] = useState("");
  const [newLinePlanId, setNewLinePlanId] = useState("");
  const [newLineQty, setNewLineQty] = useState("1");
  const [newLineDiscount, setNewLineDiscount] = useState("0");
  const [newLineTaxRate, setNewLineTaxRate] = useState("0");

  // Recurring plans filtered by selected product
  const selectedProduct = filteredProducts.find(
    (p) => p.id === newLineProductId
  );
  const plansForProduct = selectedProduct?.recurringPlanInfos ?? [];

  // Customer search
  const [customerSearch, setCustomerSearch] = useState(
    subscription?.user?.email || ""
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Fetching state
  const [fetchingData, setFetchingData] = useState(true);

  const getToken = () => localStorage.getItem("accessToken") ?? "";

  /* ── Fetch dropdown data ────────────────────────────── */
  const fetchDropdownData = useCallback(async () => {
    try {
      setFetchingData(true);
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, productsRes, plansRes, taxesRes, templatesRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/products", { headers }),
        fetch("/api/admin/recurring-plans", { headers }),
        fetch("/api/admin/taxes", { headers }),
        fetch("/api/admin/quotation-templates", { headers }),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        setRecurringPlans(data.plans || []);
      }
      if (taxesRes.ok) {
        const data = await taxesRes.json();
        setTaxes(data.taxes || []);
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch dropdown data:", err);
    } finally {
      setFetchingData(false);
    }
  }, []);

  /* ── Load from template ─────────────────────────────── */
  const loadTemplate = useCallback((templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Set recurring plan if template has one
    if (template.recurringPlanId) {
      setRecurringPlanId(template.recurringPlanId);

      // Find the recurring plan details and populate filter states
      const selectedPlan = recurringPlans.find(
        (p) => p.id === template.recurringPlanId
      );
      if (selectedPlan) {
        setFilterAutoClose(selectedPlan.autoClose);
        setFilterCloseable(selectedPlan.closeable);
        setFilterRenewable(selectedPlan.renewable);
        setFilterPausable(selectedPlan.pausable);
        setFilterPlanId(template.recurringPlanId);
      }
    }

    // Load template lines into subscription lines
    const newLines: OrderLine[] = template.lines.map((line) => {
      const product = products.find((p) => p.id === line.product.id);
      if (!product) return null;

      // Find price from recurring plan info if available
      let unitPrice = Number(product.salesPrice);
      if (template.recurringPlanId && product.recurringPlanInfos) {
        const planInfo = product.recurringPlanInfos.find(
          (info) => info.recurringPlanId === template.recurringPlanId
        );
        if (planInfo) {
          unitPrice = Number(planInfo.price);
        }
      }

      // Get default tax rate
      const defaultTax = taxes.find((t) => t.rate > 0);
      const taxRate = defaultTax ? Number(defaultTax.rate) : 0;

      const subtotal = unitPrice * line.quantity;
      const taxAmount = (subtotal * taxRate) / 100;
      const amount = subtotal + taxAmount;

      return {
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice,
        discount: 0,
        taxRate,
        amount,
      };
    }).filter((l): l is OrderLine => l !== null);

    setLines(newLines);
    setSelectedTemplateId("");
    setTemplateMessage(`Template "${template.name}" applied successfully`);
  }, [templates, products, taxes, recurringPlans, setFilterAutoClose, setFilterCloseable, setFilterRenewable, setFilterPausable, setFilterPlanId]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  // Auto-dismiss template success message
  useEffect(() => {
    if (templateMessage) {
      const timer = setTimeout(() => setTemplateMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [templateMessage]);

  // Set default tax rate when taxes load
  useEffect(() => {
    if (taxes.length > 0 && newLineTaxRate === "0") {
      const defaultTax = taxes.find((t) => t.rate > 0);
      if (defaultTax) {
        setNewLineTaxRate(String(defaultTax.rate));
      }
    }
  }, [taxes, newLineTaxRate]);

  /* ── Customer search filtering ──────────────────────── */
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  /* ── Computed totals ────────────────────────────────── */
  const untaxedAmount = lines.reduce((sum, l) => {
    const discounted = l.unitPrice * (1 - l.discount / 100);
    return sum + l.quantity * discounted;
  }, 0);

  const totalTax = lines.reduce((sum, l) => {
    const discounted = l.unitPrice * (1 - l.discount / 100);
    return sum + l.quantity * discounted * (l.taxRate / 100);
  }, 0);

  const grandTotal = untaxedAmount + totalTax;

  /* ── Add order line ──────────────────────────────────── */
  const addLine = () => {
    if (!newLineProductId) return;

    const product = products.find((p) => p.id === newLineProductId);
    if (!product) return;

    // Use plan's price for pricing
    const selectedPlanInfo = plansForProduct.find((p) => p.recurringPlanId === newLinePlanId);
    const qty = parseInt(newLineQty) || 1;
    const price = selectedPlanInfo ? Number(selectedPlanInfo.price) : Number(product.salesPrice);
    const discount = parseFloat(newLineDiscount) || 0;
    const taxRate = parseFloat(newLineTaxRate) || 0;
    const discounted = price * (1 - discount / 100);
    const amount = qty * discounted * (1 + taxRate / 100);

    const planSuffix = selectedPlanInfo
      ? ` (Plan — ${selectedPlanInfo.recurringPlan.billingPeriod.toLowerCase()})`
      : "";

    // Also set the subscription-level recurringPlanId if a plan was chosen
    if (selectedPlanInfo) {
      setRecurringPlanId(selectedPlanInfo.recurringPlanId);
    }

    setLines([
      ...lines,
      {
        productId: product.id,
        productName: product.name + planSuffix,
        quantity: qty,
        unitPrice: price,
        discount,
        taxRate,
        amount,
      },
    ]);

    setNewLineProductId("");
    setNewLinePlanId("");
    setNewLineQty("1");
    setNewLineDiscount("0");
  };

  /* ── Remove line ─────────────────────────────────────── */
  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  /* ── Handle save ─────────────────────────────────────── */
  const handleSave = async () => {
    const payload = {
      userId: customerId,
      recurringPlanId: recurringPlanId || null,
      paymentTerms,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
        discount: l.discount,
      })),
    };
    await onSave(payload);
  };

  /* ── Read-only check ────────────────────────────────── */
  const isReadOnly = status === "ACTIVE" || status === "CLOSED";

  if (fetchingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header with status flow ───────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isNew
                ? "New Subscription"
                : subscription?.subscriptionNo || "Subscription"}
            </h2>
            {!isNew && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={statusColor(status) as any}>
                  {statusLabel(status)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* ── Status flow indicator ──────────────────── */}
        {!isNew && (
          <div className="flex items-center gap-1">
            {["DRAFT", "QUOTATION", "ACTIVE", "CLOSED"].map(
              (s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`flex h-8 items-center rounded-full px-3 text-xs font-medium ${
                      s === status
                        ? "bg-primary text-primary-foreground"
                        : ["DRAFT", "QUOTATION", "ACTIVE", "CLOSED"].indexOf(s) <
                          ["DRAFT", "QUOTATION", "ACTIVE", "CLOSED"].indexOf(status)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {statusLabel(s)}
                  </div>
                  {i < 3 && (
                    <div className="mx-1 h-px w-4 bg-border" />
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Save button for new/draft */}
        {(isNew || status === "DRAFT") && (
          <Button
            onClick={handleSave}
            disabled={loading || !customerId}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? "Create" : "Save"}
          </Button>
        )}

        {/* Load from Template */}
        {(isNew || status === "DRAFT") && templates.length > 0 && (
          <div className="relative">
            <Select
              value={selectedTemplateId}
              onValueChange={(value) => {
                if (value) {
                  loadTemplate(value);
                }
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Load Template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateMessage && (
              <div className="absolute left-0 top-full mt-1 rounded-md bg-green-100 px-3 py-2 text-sm text-green-800 shadow-md whitespace-nowrap">
                ✓ {templateMessage}
              </div>
            )}
          </div>
        )}

        {/* Draft actions: Send Quotation & Activate */}
        {!isNew && status === "DRAFT" && (
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onStatusChange("QUOTATION")}
              disabled={loading}
            >
              <Send className="h-4 w-4" />
              Send Quotation
            </Button>
            <Button
              className="gap-2"
              onClick={() => onStatusChange("ACTIVE")}
              disabled={loading}
            >
              <CheckCircle2 className="h-4 w-4" />
              Activate
            </Button>
          </>
        )}

        {/* Quotation actions: Activate */}
        {status === "QUOTATION" && (
          <>
            <Button
              className="gap-2"
              onClick={() => onStatusChange("ACTIVE")}
              disabled={loading}
            >
              <CheckCircle2 className="h-4 w-4" />
              Activate
            </Button>
          </>
        )}

        {/* Active actions */}
        {status === "ACTIVE" && (
          <>
            <Button
              className="gap-2"
              onClick={() => onAction("create_invoice")}
              disabled={loading}
            >
              <FileText className="h-4 w-4" />
              Create Invoice
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onAction("renew")}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4" />
              Renew
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => onAction("upsell")}
              disabled={loading}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Upsell
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => onStatusChange("CLOSED")}
              disabled={loading}
            >
              <Lock className="h-4 w-4" />
              Close
            </Button>
          </>
        )}
      </div>

      {/* ── Main form fields ──────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            {/* Subscription Number */}
            <div className="space-y-2">
              <Label>Subscription Number</Label>
              <Input
                value={subscription?.subscriptionNo || "Auto-generated"}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated on creation
              </p>
            </div>

            {/* Customer */}
            <div className="space-y-2">
              <Label>
                Customer <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Search customer by email..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowCustomerDropdown(false), 200)
                  }
                  disabled={isReadOnly}
                />
                {showCustomerDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCustomerId(u.id);
                          setCustomerSearch(u.email);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <span className="font-medium">{u.email}</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {u.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Terms */}
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                value={paymentTerms}
                onValueChange={setPaymentTerms}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate Payment</SelectItem>
                  <SelectItem value="NET_15">Net 15 Days</SelectItem>
                  <SelectItem value="NET_30">Net 30 Days</SelectItem>
                  <SelectItem value="NET_45">Net 45 Days</SelectItem>
                  <SelectItem value="NET_60">Net 60 Days</SelectItem>
                  <SelectItem value="DUE_ON_RECEIPT">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiration */}
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">
                Quotation expiry date
              </p>
            </div>

            {/* Order Date */}
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} disabled className="bg-muted/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recurring Plans & Plan Options Filter ────────── */}
      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Recurring Plans &amp; Plan Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Specific Recurring Plan selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Recurring Plan</Label>
              <Select
                value={filterPlanId || "all"}
                onValueChange={(v) => {
                  setFilterPlanId(v === "all" ? "" : v);
                  // Reset product selection when plan filter changes
                  setNewLineProductId("");
                  setNewLinePlanId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {recurringPlans.map((rp) => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.billingPeriod.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan Options checkboxes */}
            <div className="space-y-1.5">
              <Label className="text-sm">Plan Options</Label>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {([
                  ["autoClose", "Auto-close", filterAutoClose, setFilterAutoClose],
                  ["closeable", "Closable", filterCloseable, setFilterCloseable],
                  ["pausable", "Pausable", filterPausable, setFilterPausable],
                  ["renewable", "Renewable", filterRenewable, setFilterRenewable],
                ] as const).map(([key, label, value, setter]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => {
                        (setter as (v: boolean) => void)(e.target.checked);
                        // Reset product selection when filters change
                        setNewLineProductId("");
                        setNewLinePlanId("");
                      }}
                      className="h-4 w-4 rounded border-border"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {hasAnyFilter && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredProducts.length} of {products.length} products matching filters
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tabs: Order Lines / Other Info ─────────────── */}
      <Tabs defaultValue="orderlines" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orderlines">Order Lines</TabsTrigger>
          <TabsTrigger value="otherinfo">Other Info</TabsTrigger>
        </TabsList>

        {/* ── Order Lines Tab ──────────────────────────── */}
        <TabsContent value="orderlines" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {/* Add line form */}
              {!isReadOnly && (
                <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
                  <div className="min-w-[200px] flex-1 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={newLineProductId || "placeholder"}
                      onValueChange={(v) => {
                        setNewLineProductId(v === "placeholder" ? "" : v);
                        setNewLinePlanId(""); // reset plan when product changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>
                          Select product...
                        </SelectItem>
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — ₹{Number(p.salesPrice).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recurring Plan — filtered by selected product */}
                  <div className="min-w-[180px] flex-1 space-y-1">
                    <Label className="text-xs">Recurring Plan</Label>
                    <Select
                      value={newLinePlanId || "none"}
                      onValueChange={(v) =>
                        setNewLinePlanId(v === "none" ? "" : v)
                      }
                      disabled={!newLineProductId || plansForProduct.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !newLineProductId
                              ? "Select a product first"
                              : plansForProduct.length === 0
                                ? "No plans available"
                                : "Select plan..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No plan (use sales price)
                        </SelectItem>
                        {plansForProduct.map((info) => (
                          <SelectItem key={info.id} value={info.recurringPlanId}>
                            {info.recurringPlan.billingPeriod.toLowerCase()} — ₹{Number(info.price).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newLineQty}
                      onChange={(e) => setNewLineQty(e.target.value)}
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newLineDiscount}
                      onChange={(e) => setNewLineDiscount(e.target.value)}
                    />
                  </div>

                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Tax %</Label>
                    <Select
                      value={newLineTaxRate}
                      onValueChange={setNewLineTaxRate}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Tax</SelectItem>
                        {taxes.map((t) => (
                          <SelectItem key={t.id} value={String(t.rate)}>
                            {t.name} ({Number(t.rate)}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-1"
                    onClick={addLine}
                    disabled={!newLineProductId}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              )}

              {/* Lines table */}
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No order lines yet. Add a product above.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">
                            Discount %
                          </TableHead>
                          <TableHead className="text-right">Tax %</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          {!isReadOnly && (
                            <TableHead className="w-12" />
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, idx) => {
                          const discounted =
                            line.unitPrice * (1 - line.discount / 100);
                          const lineAmount =
                            line.quantity *
                            discounted *
                            (1 + line.taxRate / 100);

                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {line.productName}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.quantity}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                ₹{line.unitPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.discount > 0 ? (
                                  <span className="text-chart-2">
                                    {line.discount}%
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.taxRate > 0 ? `${line.taxRate}%` : "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                ₹{lineAmount.toFixed(2)}
                              </TableCell>
                              {!isReadOnly && (
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => removeLine(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-full max-w-xs space-y-2 rounded-lg border bg-muted/20 p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Untaxed Amount
                        </span>
                        <span className="font-medium tabular-nums">
                          ₹{untaxedAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium tabular-nums">
                          ₹{totalTax.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between text-base font-bold">
                          <span>Total</span>
                          <span className="tabular-nums">
                            ₹{grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Other Info Tab ───────────────────────────── */}
        <TabsContent value="otherinfo" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                {/* Salesperson */}
                <div className="space-y-2">
                  <Label>Salesperson</Label>
                  <Input
                    value="Current User (auto-assigned)"
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Assigned to the user who created this quotation
                  </p>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    disabled
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Populated when quotation is confirmed
                  </p>
                </div>

                {/* Payment Method info */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Input
                    value={
                      subscription?.payments && subscription.payments.length > 0
                        ? "Paid"
                        : "Pending"
                    }
                    disabled
                    className="bg-muted/50"
                  />
                </div>

                {/* Next Invoice */}
                <div className="space-y-2">
                  <Label>Next Invoice</Label>
                  <Input
                    value={
                      subscription?.recurringPlan
                        ? "Based on recurring plan schedule"
                        : "—"
                    }
                    disabled
                    className="bg-muted/50"
                  />
                </div>

                {/* Payment Terms display */}
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input
                    value={
                      paymentTerms === "IMMEDIATE"
                        ? "Immediate Payment"
                        : paymentTerms === "NET_15"
                          ? "Net 15 Days"
                          : paymentTerms === "NET_30"
                            ? "Net 30 Days"
                            : paymentTerms === "NET_45"
                              ? "Net 45 Days"
                              : paymentTerms === "NET_60"
                                ? "Net 60 Days"
                                : paymentTerms === "DUE_ON_RECEIPT"
                                  ? "Due on Receipt"
                                  : paymentTerms || "—"
                    }
                    disabled
                    className="bg-muted/50"
                  />
                </div>
              </div>

              {/* Invoices list */}
              {subscription?.invoices && subscription.invoices.length > 0 && (
                <div className="mt-8">
                  <h4 className="mb-3 text-sm font-semibold">
                    Related Invoices
                  </h4>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Invoice No</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscription.invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.invoiceNo}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  inv.status === "PAID"
                                    ? "default"
                                    : inv.status === "CONFIRMED"
                                      ? "secondary"
                                      : inv.status === "CANCELLED"
                                        ? "destructive"
                                        : "outline"
                                }
                              >
                                {inv.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(inv.issueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              ₹{Number(inv.totalAmount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
