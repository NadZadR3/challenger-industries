"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Repeat,
  BarChart3,
  Settings,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none tracking-tight">Challenger</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Industries</p>
        </div>
      </div>

      <Separator />

      {/* Main Nav */}
      <div className="flex-1 py-4">
        <NavLinks onClick={onNavigate} />
      </div>

      <Separator />

      {/* Settings at bottom */}
      <div className="p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            settingsActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border bg-card no-print">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger + sheet */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border bg-card px-4 md:hidden no-print">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="ml-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="text-sm font-semibold">Challenger Industries</span>
        </div>
      </div>
    </>
  );
}
