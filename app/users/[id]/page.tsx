"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import type { AppUser, Contact } from "@/lib/types/users";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [related, setRelated] = useState<Contact | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    a1: "",
    a2: "",
    a3: "",
  });

  async function load() {
    // Get user from API list (db-free)
    const res = await fetch("/api/users");
    const data = await res.json().catch(() => ({}));
    const u = (data.users || []).find((x: AppUser) => x.id === id) || null;
    setUser(u);

    setForm((f) => ({
      ...f,
      email: u?.email || "",
    }));

    // Best-effort: find related contact by email match
    if (u?.email) {
      const rc = await fetch(`/api/contacts?q=${encodeURIComponent(u.email)}`);
      const cd = await rc.json().catch(() => ({}));
      const c = (cd.contacts || [])[0] || null;
      setRelated(c);
    } else {
      setRelated(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AppShell activeHrefStartsWith="/users">
      <div className="p-6">
        {/* Toolbar row like mock */}
        <div className="flex items-center gap-3 mb-6">
          <button className="border rounded-lg px-6 py-2 text-sm">New</button>
          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={() => alert("Delete: hook later")}
            title="Delete"
          >
            🗑️
          </button>
          <button
            className="border rounded-lg px-3 py-2 text-sm"
            onClick={() => alert("Save: hook later")}
            title="Save"
          >
            💾
          </button>

          <div className="flex-1" />

          <button
            className="border rounded-lg px-6 py-2 text-sm"
            onClick={() => alert("Change password: hook later")}
          >
            Change password
          </button>
        </div>

        {/* Two-column layout like mock */}
        <div className="grid grid-cols-12 gap-10">
          {/* Left: Form */}
          <div className="col-span-7">
            <div className="space-y-10">
              <BigField
                label="Name"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              <BigField
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />
              <BigField
                label="Phone number"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />

              <div>
                <div className="text-xl font-semibold mb-4">Address</div>
                <div className="space-y-6">
                  <Line value={form.a1} onChange={(v) => setForm((f) => ({ ...f, a1: v }))} />
                  <Line value={form.a2} onChange={(v) => setForm((f) => ({ ...f, a2: v }))} />
                  <Line value={form.a3} onChange={(v) => setForm((f) => ({ ...f, a3: v }))} />
                </div>
              </div>

              <div className="text-xs opacity-70">
                UserID: <span className="font-mono">{user?.id || "loading..."}</span>
              </div>

              <button className="underline text-sm" onClick={() => router.push("/users")}>
                ← Back
              </button>
            </div>
          </div>

          {/* Right: Related contact */}
          <div className="col-span-5">
            <div className="text-sm mb-3 opacity-70">Related contact</div>
            <div className="border rounded-xl p-4 min-h-[140px]">
              {related ? (
                <div className="space-y-2">
                  <div className="font-semibold">{related.name}</div>
                  <div className="text-sm">{related.email}</div>
                  <div className="text-sm opacity-70">{related.phone || "-"}</div>
                  <button
                    className="underline text-sm mt-2"
                    onClick={() => router.push(`/contacts/${related.id}`)}
                  >
                    Open contact →
                  </button>
                </div>
              ) : (
                <div className="text-sm opacity-70">
                  No related contact yet. (We’ll auto-create once DB is ready.)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function BigField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-4xl font-semibold mb-4">{label}</div>
      <input
        className="w-full border-b outline-none text-lg py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Line({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className="w-3/4 border-b outline-none text-lg py-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

