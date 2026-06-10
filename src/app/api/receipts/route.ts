import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/heic"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: authUser.email! } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const tripFormId = formData.get("tripFormId") as string;
  const section = formData.get("section") as string;
  const lineNumber = parseInt(formData.get("lineNumber") as string);

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ACCEPTED.includes(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  const form = await prisma.tripForm.findUnique({ where: { id: tripFormId } });
  if (!form || form.employeeId !== dbUser.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Find or create the expense line
  const expenseLine = await prisma.expenseLine.findUnique({
    where: { tripFormId_phase_section_lineNumber: { tripFormId, phase: "POST", section: section as any, lineNumber } },
  });

  const service = createServiceClient();
  const ext = file.name.split(".").pop();
  const storagePath = `receipts/${tripFormId}/${section}-${lineNumber}/${Date.now()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await service.storage.from("receipts").upload(storagePath, bytes, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const receipt = await prisma.receipt.create({
    data: {
      tripFormId,
      expenseLineId: expenseLine?.id,
      storagePath,
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      uploadedBy: dbUser.id,
    },
  });

  return NextResponse.json(receipt);
}
