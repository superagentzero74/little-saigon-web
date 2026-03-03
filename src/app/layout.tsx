import type { Metadata } from "next";
import "@/styles/globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Little Saigon — Vietnamese Business & Community Guide | Westminster, Garden Grove, Fountain Valley, Santa Ana",
    template: "%s | Little Saigon",
  },
  description:
    "Discover the best Vietnamese restaurants, bakeries, cafes, salons, and businesses in Little Saigon, Southern California. Community-driven guide featuring 420+ listings, the Top 50 Món Việt guide, and curated Đỉnh Nhất picks.",
  keywords: [
    "Little Saigon", "Vietnamese restaurants", "Vietnamese businesses", "Westminster", "Garden Grove",
    "Fountain Valley", "Santa Ana", "Orange County", "pho", "banh mi", "Vietnamese food",
    "Vietnamese nail salon", "Vietnamese services",
  ],
  openGraph: {
    title: "Little Saigon — Vietnamese Business & Community Guide",
    description: "420+ Vietnamese restaurants, bakeries, services, and businesses in Westminster, Garden Grove, Fountain Valley & Santa Ana.",
    locale: "en_US",
    type: "website",
    siteName: "Little Saigon",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
