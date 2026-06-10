"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";
import { useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", position: "", grade: "", department: "", division: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setForm({ name: d.name ?? "", position: d.position ?? "", grade: d.grade ?? "", department: d.department ?? "", division: d.division ?? "" });
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { toast({ title: "Profile updated" }); router.refresh(); }
    else toast({ variant: "destructive", title: "Failed to update profile" });
  }

  if (loading) return <div className="animate-pulse h-64 bg-gray-100 rounded-lg" />;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <Card>
        <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[["Full Name", "name", "text"], ["Position", "position", "text"], ["Grade (L)", "grade", "text"], ["Department", "department", "text"], ["Division", "division", "text"]].map(([label, field, type]) => (
            <div key={field} className="space-y-1">
              <Label>{label}</Label>
              <Input type={type} value={form[field as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} />
            </div>
          ))}
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Profile"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
