"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ShoppingProvider } from "@/contexts/ShoppingContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocationProvider>
        <ShoppingProvider>{children}</ShoppingProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
