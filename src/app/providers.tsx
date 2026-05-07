"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { ShoppingProvider } from "@/contexts/ShoppingContext";
import WebAnalytics from "@/components/WebAnalytics";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocationProvider>
        <ShoppingProvider>
          <WebAnalytics />
          {children}
        </ShoppingProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
