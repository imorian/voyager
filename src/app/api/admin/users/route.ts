import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { userInviteEmail } from "@/lib/email/templates";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return dbUser;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Create Supabase auth user and send invite
  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.admin.inviteUserByEmail(body.email);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      empId: body.empId,
      position: body.position || null,
      grade: body.grade || null,
      department: body.department || null,
      division: body.division || null,
      role: body.role,
      managerId: body.managerId || null,
    },
  });

  // Supabase already sends the invite email; optionally send a branded one too
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  const { subject, html } = userInviteEmail(inviteUrl);
  await sendEmail(body.email, subject, html, "", user.id, "USER_INVITED");

  return NextResponse.json(user, { status: 201 });
}
