import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const receipt = await prisma.receipt.findUnique({ where: { id: params.id }, include: { tripForm: true } });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.tripForm.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();
  await service.storage.from("receipts").remove([receipt.storagePath]);
  await prisma.receipt.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipt = await prisma.receipt.findUnique({ where: { id: params.id }, include: { tripForm: true } });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data } = await service.storage.from("receipts").createSignedUrl(receipt.storagePath, 3600);
  return NextResponse.json({ signedUrl: data?.signedUrl });
}
