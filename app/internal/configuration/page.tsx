"use client";

import { useAuth } from "@/lib/auth-context";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Loader2, Tag, RefreshCw, FileText, Grid3x3, Percent } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function ConfigurationPage() {
  const { user } = useAuth();
  const { loading: authLoading } = useProtectedRoute({
    requireAuth: true,
    allowedRoles: ["ADMIN"],
    redirectTo: "/internal",
  });

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

  const configurationOptions = [
    {
      title: "Product Tags",
      description: "Manage product tags for categorizing shop items",
      icon: Tag,
      href: "/internal/configuration/tags",
    },
    {
      title: "Recurring Plans",
      description: "Configure billing cycles, pricing, and subscription options",
      icon: RefreshCw,
      href: "/internal/configuration/recurring-plans",
    },
    {
      title: "Quotation Templates",
      description: "Create and manage quotation templates for subscriptions",
      icon: FileText,
      href: "/internal/configuration/quotation-templates",
    },
    {
      title: "Product Attributes",
      description: "Define product variants and custom attributes",
      icon: Grid3x3,
      href: "/internal/configuration/attributes",
    },
    {
      title: "Discounts",
      description: "Create and manage discount codes and promotional offers",
      icon: Percent,
      href: "/internal/configuration/discounts",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
          <p className="mt-2 text-muted-foreground">
            Manage all your system settings and product configurations
          </p>
        </div>

        {/* Configuration Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {configurationOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link key={option.href} href={option.href}>
                <Card className="group h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardContent className="flex flex-col gap-4 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{option.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
