import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Edit, CheckCircle } from "lucide-react";

export default async function FormOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const form = await prisma.tripForm.findUnique({
    where: { id },
    include: {
      employee: true,
      preApprover: { select: { name: true } },
      postApprover: { select: { name: true } },
      approvalLogs: { include: { actor: { select: { name: true } } }, orderBy: { actionedAt: "desc" } },
    },
  });

  if (!form) notFound();

  // Access control
  if (user.role === "EMPLOYEE" && form.employeeId !== user.id) notFound();

  const canEditPreTrip = ["DRAFT", "PRE_REJECTED"].includes(form.status) && form.employeeId === user.id;
  const canEditPostTrip = ["POST_DRAFT", "POST_REJECTED"].includes(form.status) && form.employeeId === user.id;
  const canViewPdf = form.status === "POST_APPROVED";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Form Overview</p>
          <h1 className="text-2xl font-bold font-mono">{form.referenceNumber}</h1>
        </div>
        <div className="flex gap-2">
          {canEditPreTrip && (
            <Button asChild variant="outline">
              <Link href={`/forms/${form.id}/pre-trip`}><Edit className="h-4 w-4 mr-2" />Edit Pre-Trip</Link>
            </Button>
          )}
          {canEditPostTrip && (
            <Button asChild>
              <Link href={`/forms/${form.id}/post-trip`}><Edit className="h-4 w-4 mr-2" />Edit Post-Trip</Link>
            </Button>
          )}
          {canViewPdf && (
            <Button asChild variant="outline">
              <Link href={`/forms/${form.id}/pdf`}><FileText className="h-4 w-4 mr-2" />Download PDF</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatusCard label="Form Status" status={form.status} />
        <InfoCard label="Employee" value={form.empNameSnap ?? form.employee.name} />
        <InfoCard label="Destination" value={[form.outCity, form.outCountry].filter(Boolean).join(", ") || "—"} />
        <InfoCard label="Trip Dates" value={form.outDepDate ? `${formatDate(form.outDepDate)} → ${formatDate(form.inArrDate)}` : "—"} />
      </div>

      {/* Trip details summary */}
      <Card>
        <CardHeader><CardTitle>Trip Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Purpose" value={form.purpose} />
          <Field label="Cost Center" value={form.costCenter} />
          <Field label="Cost Charged To" value={form.costChargedTo} />
          <Field label="Total Trip Days" value={form.totalTripDays?.toString()} />
          <div className="col-span-2"><Field label="Objective" value={form.objective} /></div>
        </CardContent>
      </Card>

      {/* Approval block */}
      <Card>
        <CardHeader><CardTitle>Approvals</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-medium text-gray-500 uppercase text-xs tracking-wide mb-2">Pre-Trip</p>
              {form.preApprovedAt ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{form.preApprover?.name}</p>
                    <p className="text-gray-500">{formatDate(form.preApprovedAt)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Pending</p>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-500 uppercase text-xs tracking-wide mb-2">Post-Trip</p>
              {form.postApprovedAt ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{form.postApprover?.name}</p>
                    <p className="text-gray-500">{formatDate(form.postApprovedAt)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Not yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity log */}
      <Card>
        <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
        <CardContent>
          {form.approvalLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {form.approvalLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <span className="font-medium">{log.actor.name}</span>{" "}
                    <span className="text-gray-600">{log.action.toLowerCase()}</span>{" "}
                    <span className="text-gray-500">{log.phase.toLowerCase()}-trip</span>
                    {log.notes && <p className="text-gray-500 mt-0.5 italic">"{log.notes}"</p>}
                    <p className="text-gray-400 text-xs">{formatDate(log.actionedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grand total */}
      {form.status === "POST_APPROVED" && form.postGrandTotalThb && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 flex items-center justify-between">
            <span className="font-medium text-green-800">Grand Total (THB)</span>
            <span className="text-2xl font-bold text-green-800">{formatCurrency(Number(form.postGrandTotalThb))}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusCard({ label, status }: { label: string; status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  const text = STATUS_LABELS[status] ?? status;
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{text}</span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium truncate">{value || "—"}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-gray-900">{value || "—"}</p>
    </div>
  );
}
