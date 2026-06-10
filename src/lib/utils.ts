import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined, currency = "THB") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function generateReferenceNumber(year: number, sequence: number) {
  return `OBT-${year}-${String(sequence).padStart(4, "0")}`;
}
