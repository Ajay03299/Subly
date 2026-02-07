"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Phone,
  Shield,
  CalendarDays,
  CreditCard,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Mock user — replace with real session / API later                 */
/* ------------------------------------------------------------------ */

const MOCK_USER = {
  name: "Arjun Sai",
  email: "arjun@example.com",
  phone: "+91 98765 43210",
  address: "123 Tech Park, Bangalore, India",
  role: "Portal User" as const,
  memberSince: "January 2025",
  activeSubscriptions: 2,
  totalSpent: "₹24,800",
};

/* ------------------------------------------------------------------ */
/*  Profile page                                                      */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState(MOCK_USER);
  const [form, setForm] = useState(MOCK_USER);

  const handleSave = () => {
    setUser(form);
    setEditing(false);
  };

  const handleCancel = () => {
    setForm(user);
    setEditing(false);
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account details and preferences
          </p>
        </div>

        {!editing ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setEditing(true)}
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ── Left: Avatar card ──────────────────────────── */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/30 text-3xl font-bold text-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {user.role}
            </Badge>
          </CardContent>
        </Card>

        {/* ── Right: Details ─────────────────────────────── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Your personal info and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Full Name
              </label>
              {editing ? (
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              {editing ? (
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              {editing ? (
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.phone}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Address
              </label>
              {editing ? (
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              ) : (
                <p className="text-sm">{user.address}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Bottom cards: quick stats ──────────────────── */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-semibold">{user.memberSince}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
              <Shield className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Active Subscriptions
              </p>
              <p className="font-semibold">{user.activeSubscriptions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
              <CreditCard className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="font-semibold">{user.totalSpent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Change password section ──────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Current Password
              </label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                New Password
              </label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Confirm Password
              </label>
              <Input type="password" placeholder="••••••••" />
            </div>
          </div>
          <Button variant="outline" className="mt-4">
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
