"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Download, Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";

interface Props {
  forms: any[];
  user: any;
  stats: { openDrafts: number; awaitingApproval: number; approvedThisYear: number };
}

export function DashboardClient({ forms, user, stats }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteForm(id: string, ref: string) {
    if (!confirm(`Delete ${ref}? This cannot be undone.`)) return;
    setDeleting(id);
    const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      toast({ title: "Form deleted" });
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "Failed to delete" });
    }
  }

  const filtered = forms.filter((f) => {
    const matchSearch = !search ||
      f.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (f.outCity ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (f.purpose ?? "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "ALL" || (() => {
      if (statusFilter === "PENDING") return ["PRE_SUBMITTED", "POST_SUBMITTED"].includes(f.status);
      if (statusFilter === "APPROVED") return ["PRE_APPROVED", "POST_APPROVED"].includes(f.status);
      if (statusFilter === "REJECTED") return ["PRE_REJECTED", "POST_REJECTED"].includes(f.status);
      return true;
    })();

    const matchDate = (!dateFrom || !f.outDepDate || new Date(f.outDepDate) >= new Date(dateFrom)) &&
      (!dateTo || !f.outDepDate || new Date(f.outDepDate) <= new Date(dateTo));

    return matchSearch && matchStatus && matchDate;
  });

  function preStatus(f: any) {
    if (["DRAFT"].includes(f.status)) return "DRAFT";
    if (["PRE_SUBMITTED", "POST_DRAFT", "POST_SUBMITTED", "POST_APPROVED", "POST_REJECTED", "PRE_APPROVED"].includes(f.status)) {
      if (f.status === "PRE_SUBMITTED") return "PRE_SUBMITTED";
      return "PRE_APPROVED";
    }
    if (f.status === "PRE_REJECTED") return "PRE_REJECTED";
    return f.status;
  }

  function postStatus(f: any) {
    if (["DRAFT", "PRE_SUBMITTED", "PRE_APPROVED", "PRE_REJECTED"].includes(f.status)) return "POST_DRAFT";
    return f.status;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overseas Business Travel Expense History</p>
        </div>
        <Button asChild>
          <Link href="/forms/new"><Plus className="h-4 w-4 mr-2" />New Pre-Trip</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open drafts</p>
            <p className="text-3xl font-bold mt-1">{stats.openDrafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {user.role === "EMPLOYEE" ? "Your forms pending" : "Awaiting your approval"}
            </p>
            <p className="text-3xl font-bold mt-1">{stats.awaitingApproval}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Approved this year</p>
            <p className="text-3xl font-bold mt-1">{stats.approvedThisYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search reference, destination, purpose..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Reference</th>
                {user.role !== "EMPLOYEE" && <th className="text-left px-4 py-3 font-medium text-gray-700">Employee</th>}
                <th className="text-left px-4 py-3 font-medium text-gray-700">Destination</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Trip Dates</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Purpose</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Pre-Trip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Post-Trip</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Total (THB)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No forms found
                  </td>
                </tr>
              )}
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-blue-600">
                    <Link href={`/forms/${f.id}`} className="hover:underline">{f.referenceNumber}</Link>
                  </td>
                  {user.role !== "EMPLOYEE" && <td className="px-4 py-3">{f.employee?.name ?? "—"}</td>}
                  <td className="px-4 py-3">{[f.outCity, f.outCountry].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {f.outDepDate ? `${formatDate(f.outDepDate)} → ${formatDate(f.inArrDate)}` : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{f.purpose ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={preStatus(f)} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={postStatus(f)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.status === "POST_APPROVED" && f.postGrandTotalThb
                      ? formatCurrency(Number(f.postGrandTotalThb))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/forms/${f.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {f.status === "POST_APPROVED" && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/forms/${f.id}/pdf`}><Download className="h-4 w-4" /></Link>
                        </Button>
                      )}
                      {user.role === "ADMIN" && (
                        <Button variant="ghost" size="sm" onClick={() => deleteForm(f.id, f.referenceNumber)} disabled={deleting === f.id}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}
