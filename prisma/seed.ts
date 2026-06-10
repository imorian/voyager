import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // International area rates — use fixed IDs so upsert works without a unique area constraint
  const rates = [
    { id: "area-highest", area: "HIGHEST" as const, usdPerDay: 120 },
    { id: "area-high",    area: "HIGH"    as const, usdPerDay: 100 },
    { id: "area-normal",  area: "NORMAL"  as const, usdPerDay: 80  },
    { id: "area-unspec",  area: "UNSPECIFIED" as const, usdPerDay: 70 },
  ];

  for (const r of rates) {
    await prisma.perDiemRate.upsert({
      where: { id: r.id },
      create: { id: r.id, area: r.area, usdPerDay: r.usdPerDay, effectiveFrom: new Date("2024-01-01") },
      update: { usdPerDay: r.usdPerDay },
    });
  }
  console.log("✓ Per diem rates seeded");

  // Seed admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: "System Admin",
        empId: "ADM-001",
        role: "ADMIN",
        position: "System Administrator",
        department: "IT",
      },
      update: { role: "ADMIN" },
    });
    console.log(`✓ Admin user seeded: ${adminEmail}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
