"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Products", href: "/products" },
  { label: "Reporting", href: "/reporting" },
  { label: "Users/contacts", href: "/users" },
  { label: "Configuration", href: "/configuration" },
  { label: "My Profile", href: "/profile" },
];

export function AppShell({
  children,
  activeHrefStartsWith,
}: {
  children: React.ReactNode;
  activeHrefStartsWith?: string;
}) {
  const pathname = usePathname();
  const active = activeHrefStartsWith || pathname;

  return (
    <div className="p-6">
      <div className="border rounded-2xl overflow-hidden">
        <div className="flex gap-3 p-4 border-b flex-wrap">
          {tabs.map((t) => {
            const isActive =
              t.href === "/users"
                ? active.startsWith("/users") || active.startsWith("/contacts")
                : active.startsWith(t.href);

            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "px-4 py-2 border rounded-lg text-sm",
                  isActive ? "bg-black text-white" : "bg-white",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="p-0">{children}</div>
      </div>
    </div>
  );
}


