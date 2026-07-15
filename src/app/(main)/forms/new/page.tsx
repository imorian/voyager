import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/utils";

export default async function NewFormPage() {
  const user = await requireUser();

  if (!user.managerId && user.role === "EMPLOYEE") {
    // Block — manager not set
  }

  const year = new Date().getFullYear();
  let form: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.tripForm.count({
      where: { referenceNumber: { startsWith: `OBT-${year}-` } },
    });
    const referenceNumber = generateReferenceNumber(year, count + 1 + attempt);
    try {
      form = await prisma.tripForm.create({
        data: { referenceNumber, employeeId: user.id, status: "DRAFT" },
      });
      break;
    } catch (e: any) {
      if (e.code !== "P2002") throw e; // only retry on unique constraint violation
    }
  }
  if (!form) throw new Error("Failed to generate unique reference number");

  redirect(`/forms/${form.id}/pre-trip`);
}
