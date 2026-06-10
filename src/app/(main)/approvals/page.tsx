import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default async function ApprovalsPage() {
  const user = await requireRole("MANAGER", "ADMIN");

  const where =
    user.role === "MANAGER"
      ? {
          status: { in: ["PRE_SUBMITTED", "POST_SUBMITTED"] as any[] },
          employee: { managerId: user.id },
        }
      : { status: { in: ["PRE_SUBMITTED", "POST_SUBMITTED"] as any[] } };

  const forms = await prisma.tripForm.findMany({
    where,
    orderBy: { updatedAt: "asc" },
    include: { employee: { select: { name: true, department: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approvals Queue</h1>
        <p className="text-sm text-gray-500">{forms.length} form(s) awaiting your action</p>
      </div>

      {forms.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-lg border">
          <p className="text-lg font-medium">All caught up</p>
          <p className="text-sm mt-1">No forms awaiting approval</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Phase</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Submitted</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {forms.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600">
                    <Link href={`/approvals/${f.id}`} className="hover:underline">{f.referenceNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>{f.employee.name}</div>
                    <div className="text-xs text-gray-500">{f.employee.department}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${f.status === "PRE_SUBMITTED" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                      {f.status === "PRE_SUBMITTED" ? "Pre-Trip" : "Post-Trip"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{[f.outCity, f.outCountry].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {f.status === "PRE_SUBMITTED" ? formatDate(f.preSubmittedAt) : formatDate(f.postSubmittedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" asChild>
                      <Link href={`/approvals/${f.id}`}><Eye className="h-4 w-4 mr-1" />Review</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
