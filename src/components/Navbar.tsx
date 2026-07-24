"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plane, LayoutDashboard, CheckSquare, Settings, LogOut, User, BadgeDollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User as PrismaUser } from "@prisma/client";

interface NavbarProps { user: PrismaUser }

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(user.role === "MANAGER" || user.role === "ADMIN"
      ? [{ href: "/approvals", label: "Approvals", icon: CheckSquare }]
      : []),
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/users", label: "Admin", icon: Settings },
          { href: "/admin/hardship", label: "Hardship", icon: BadgeDollarSign },
        ]
      : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-blue-600">
              <Plane className="h-5 w-5" />
              <span className="hidden sm:block">
                {process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Travel Expense"}
              </span>
            </Link>
            <div className="flex gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile" className={cn("flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100", pathname === "/profile" && "bg-blue-50 text-blue-700")}>
              <User className="h-4 w-4" />
              <span className="hidden sm:block">{user.name}</span>
            </Link>
            <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
