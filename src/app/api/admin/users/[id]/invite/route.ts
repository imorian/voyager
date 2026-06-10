import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { userInviteEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data } = await service.auth.admin.inviteUserByEmail(target.email);

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  const { subject, html } = userInviteEmail(inviteUrl);
  await sendEmail(target.email, subject, html, "", target.id, "USER_INVITED");

  return NextResponse.json({ ok: true });
}
