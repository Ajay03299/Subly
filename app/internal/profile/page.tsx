"use client";

import { useState } from "react";
import {
  User,
  Mail,
  MapPin,
  Phone,
  Shield,
  CalendarDays,
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

const MOCK_USER = {
  name: "Ashik D",
  email: "ashik@company.com",
  phone: "+91 98765 43210",
  address: "456 Business Hub, Mumbai, India",
  role: "Internal User" as const,
  memberSince: "December 2024",
};

export default function InternalProfilePage() {
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
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Your account information
          </p>
        </div>

        {!editing ? (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setEditing(true)}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar card */}
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/30 text-2xl font-bold text-primary">
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

        {/* Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Personal and contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field icon={User} label="Full Name" editing={editing}>
              {editing ? (
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.name}</p>
              )}
            </Field>

            <Field icon={Mail} label="Email" editing={editing}>
              {editing ? (
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.email}</p>
              )}
            </Field>

            <Field icon={Phone} label="Phone" editing={editing}>
              {editing ? (
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              ) : (
                <p className="text-sm">{user.phone}</p>
              )}
            </Field>

            <Field icon={MapPin} label="Address" editing={editing}>
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
            </Field>

            <Field icon={CalendarDays} label="Member Since" editing={false}>
              <p className="text-sm">{user.memberSince}</p>
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
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
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── helper ──────────────────────────────────────────────── */

function Field({
  icon: Icon,
  label,
  editing,
  children,
}: {
  icon: React.ElementType;
  label: string;
  editing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </label>
      {children}
    </div>
  );
}
