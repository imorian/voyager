"use client";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => <Button disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Preparing PDF...</Button> }
);

const TripFormPdf = dynamic(
  () => import("@/components/pdf/TripFormPdf").then((m) => m.TripFormPdf),
  { ssr: false }
);

interface Props { form: any; preLines: any[]; postLines: any[] }

export function PdfPageClient({ form, preLines, postLines }: Props) {
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Travel Expense";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">PDF Export</p>
        <h1 className="text-2xl font-bold font-mono">{form.referenceNumber}</h1>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{form.referenceNumber}</p>
            <p className="text-sm text-gray-500">{[form.outCity, form.outCountry].filter(Boolean).join(", ")}</p>
          </div>
          {TripFormPdf && (
            <PDFDownloadLink
              document={<TripFormPdf form={form} preLines={preLines} postLines={postLines} companyName={companyName} />}
              fileName={`${form.referenceNumber}.pdf`}
            >
              {({ loading }) =>
                loading ? (
                  <Button disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating...</Button>
                ) : (
                  <Button><Download className="h-4 w-4 mr-2" />Download PDF</Button>
                )
              }
            </PDFDownloadLink>
          )}
        </div>
        <p className="text-xs text-gray-500">
          The PDF includes both Pre-Trip and Post-Trip pages, matching the original Excel form layout.
        </p>
      </div>
    </div>
  );
}
