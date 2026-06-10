"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { Plus, Edit, Mail } from "lucide-react";

interface Props { users: any[]; managers: { id: string; name: string }[] }

const EMPTY_USER = { email: "", name: "", empId: "", position: "", grade: "", department: "", division: "", role: "EMPLOYEE", managerId: "" };

export function AdminUsersClient({ users, managers }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY_USER);
  const [loading, setLoading] = useState(false);

  function openCreate() { setEditing(null); setForm(EMPTY_USER); setShowDialog(true); }
  function openEdit(u: any) {
    setEditing(u);
    setForm({ email: u.email, name: u.name, empId: u.empId, position: u.position ?? "", grade: u.grade ?? "", department: u.department ?? "", division: u.division ?? "", role: u.role, managerId: u.managerId ?? "", isActive: u.isActive });
    setShowDialog(true);
  }

  async function save() {
    setLoading(true);
    const url = editing ? `/api/admin/users/${editing.id}` : "/api/admin/users";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) {
      toast({ title: editing ? "User updated" : "User created" });
      setShowDialog(false);
      router.refresh();
    } else {
      const e = await res.json();
      toast({ variant: "destructive", title: e.error ?? "Failed" });
    }
  }

  async function resendInvite(userId: string) {
    const res = await fetch(`/api/admin/users/${userId}/invite`, { method: "POST" });
    if (res.ok) toast({ title: "Invite sent" });
    else toast({ variant: "destructive", title: "Failed to send invite" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Name", "Email", "Emp ID", "Department", "Role", "Manager", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.empId}</td>
                <td className="px-4 py-3 text-gray-600">{u.department || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-800" : u.role === "MANAGER" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"}`}>
                    {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.manager?.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => resendInvite(u.id)}><Mail className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["Email", "email", "email"], ["Name", "name", "text"], ["Emp ID", "empId", "text"], ["Position", "position", "text"], ["Grade", "grade", "text"], ["Department", "department", "text"], ["Division", "division", "text"]].map(([label, field, type]) => (
              <div key={field} className="space-y-1">
                <Label>{label}</Label>
                <Input type={type} value={form[field] ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p: any) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Manager</Label>
              <Select value={form.managerId || "none"} onValueChange={(v) => setForm((p: any) => ({ ...p, managerId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.isActive ? "active" : "disabled"} onValueChange={(v) => setForm((p: any) => ({ ...p, isActive: v === "active" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
