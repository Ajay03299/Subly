"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ReactNode } from "react";

export function AuthWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
