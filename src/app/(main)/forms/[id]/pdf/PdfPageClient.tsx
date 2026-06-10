"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props { form: any; }

export function PdfPageClient({ form }: Props) {
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
            <p className="text-sm text-gray-500">
              {[form.outCity, form.outCountry].filter(Boolean).join(", ")}
            </p>
          </div>
          <Button asChild>
            <a href={`/api/forms/${form.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />Download PDF
            </a>
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          The PDF includes both Pre-Trip and Post-Trip pages, matching the original Excel form layout.
        </p>
      </div>
    </div>
  );
}
