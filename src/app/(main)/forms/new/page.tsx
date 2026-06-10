import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReferenceNumber } from "@/lib/utils";

export default async function NewFormPage() {
  const user = await requireUser();

  if (!user.managerId && user.role === "EMPLOYEE") {
    // Block — manager not set
  }

  // Count forms this year to generate reference number
  const year = new Date().getFullYear();
  const count = await prisma.tripForm.count({
    where: { referenceNumber: { startsWith: `OBT-${year}-` } },
  });
  const referenceNumber = generateReferenceNumber(year, count + 1);

  const form = await prisma.tripForm.create({
    data: {
      referenceNumber,
      employeeId: user.id,
      status: "DRAFT",
    },
  });

  redirect(`/forms/${form.id}/pre-trip`);
}
