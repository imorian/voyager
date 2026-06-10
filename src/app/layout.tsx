import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });
const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Travel Expense";

export const metadata: Metadata = {
  title: `${companyName} — Overseas Business Travel`,
  description: "Overseas Business Travel Expense System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
