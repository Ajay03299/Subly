"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import type { AppUser, Contact } from "@/lib/types/users";

type FormState = {
  name: string;
  email: string;
  phone: string;
  a1: string;
  a2: string;
  a3: string;
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (params?.id ? String(params.id) : ""), [params]);

  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [related, setRelated] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    a1: "",
    a2: "",
    a3: "",
  });

  async function load() {
    setLoading(true);

    // 1) Get user from API list (db-free)
    const res = await fetch("/api/users", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const u: AppUser | null =
      (data.users || []).find((x: AppUser) => x.id === id) || null;

    setUser(u);

    // Prefill a few fields (feel free to adjust)
    setForm((f) => ({
      ...f,
      name: (u as any)?.name || f.name,
      email: u?.email || "",
    }));

    // 2) Best-effort: find related contact by email match
    if (u?.email) {
      const rc = await fetch(`/api/contacts?q=${encodeURIComponent(u.email)}`, {
        cache: "no-store",
      });
      const cd = await rc.json().catch(() => ({}));
      const c: Contact | null = (cd.contacts || [])[0] || null;
      setRelated(c);
    } else {
      setRelated(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AppShell activeHrefStartsWith="/users">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/users")}
            className="px-3 py-2 rounded-md border text-sm hover:opacity-90"
          >
            ← Back
          </button>

          <div>
            <h1 className="text-2xl font-semibold">User Details</h1>
            <p className="text-sm opacity-70">ID: {id || "—"}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border p-4">Loading...</div>
        ) : !user ? (
          <div className="rounded-lg border p-4">
            <div className="font-medium">User not found</div>
            <div className="text-sm opacity-70 mt-1">
              Go back to Users list and open a valid user.
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Summary */}
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-2">Summary</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="opacity-70">Email</div>
                  <div className="font-medium">{user.email}</div>
                </div>
                <div>
                  <div className="opacity-70">Role</div>
                  <div className="font-medium">{user.role}</div>
                </div>
                <div>
                  <div className="opacity-70">Verified</div>
                  <div className="font-medium">{user.verifiedAt ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="opacity-70">Created</div>
                  <div className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Related contact */}
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-2">Related Contact</h2>
              {!related ? (
                <div className="text-sm opacity-70">
                  No matching contact found for this user email.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="opacity-70">Name</div>
                    <div className="font-medium">{related.name}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Email</div>
                    <div className="font-medium">{related.email}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Phone</div>
                    <div className="font-medium">{related.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Company</div>
                    <div className="font-medium">{related.company || "—"}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes / form (demo) */}
            <div className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-4">Notes (demo)</h2>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                />
                <div className="sm:col-span-2" />

                <Field
                  label="Note A1"
                  value={form.a1}
                  onChange={(v) => setForm((f) => ({ ...f, a1: v }))}
                />
                <Field
                  label="Note A2"
                  value={form.a2}
                  onChange={(v) => setForm((f) => ({ ...f, a2: v }))}
                />
                <Field
                  label="Note A3"
                  value={form.a3}
                  onChange={(v) => setForm((f) => ({ ...f, a3: v }))}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => alert("Demo: saved locally only")}
                  className="px-4 py-2 rounded-md border text-sm hover:opacity-90"
                >
                  Save (demo)
                </button>
                <button
                  onClick={load}
                  className="px-4 py-2 rounded-md border text-sm hover:opacity-90"
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="opacity-70">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-md border bg-transparent"
      />
    </label>
  );
}
