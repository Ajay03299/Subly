"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import type { AppUser, Role } from "@/lib/types/users";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("INTERNAL");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Forbidden / failed");
      setLoading(false);
      return;
    }
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const payload = { email: email.trim(), role };
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "Failed");
      return;
    }
    setEmail("");
    await load();
  }

  return (
    <AppShell activeHrefStartsWith="/users">
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm opacity-80 mt-2">
          Admin creates internal users. RBAC is enforced in the API.
        </p>

        <div className="mt-6 border rounded-xl p-4">
          <div className="font-semibold">Create User</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <input
              className="border rounded-lg p-2 flex-1 min-w-[240px]"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="border rounded-lg p-2"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="INTERNAL">INTERNAL</option>
              <option value="USER">USER</option>
            </select>
            <button
              className="border rounded-lg px-3 py-2 font-semibold"
              onClick={create}
            >
              Create
            </button>
            <button className="border rounded-lg px-3 py-2" onClick={load}>
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 p-3 text-xs font-semibold border-b">
            <div className="col-span-5">Email</div>
            <div className="col-span-3">Role</div>
            <div className="col-span-4">Created</div>
          </div>

          {loading ? (
            <div className="p-4 text-sm">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-sm opacity-70">No users loaded.</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-12 gap-2 p-3 text-sm border-b"
              >
                <div className="col-span-5">
                  <Link className="underline" href={`/users/${u.id}`}>
                    {u.email}
                  </Link>
                </div>
                <div className="col-span-3">{u.role}</div>
                <div className="col-span-4">
                  {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}

