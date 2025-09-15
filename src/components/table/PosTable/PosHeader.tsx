"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NavUser } from "@/components/nav-user";
import {
  ShoppingCart,
  ChevronRight,
  User,
  CreditCard,
  Package,
} from "lucide-react";
import { SidebarFooter } from "@/components/ui/sidebar";

export const PosHeader: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if button is active
  const isActive = (path: string) => pathname === path;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘/Ctrl + 1 → Product Catalog
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        router.push("/dashboard/branch/pos");
      }

      // ⌘/Ctrl + 2 → Cashier
      if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        router.push("/dashboard/branch/cash");
      }

      // ⌘/Ctrl + 3 → Payments
      if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        router.push("/dashboard/branch/payments");
      }

      // ⌘/Ctrl + 4 → Cart
      if ((e.metaKey || e.ctrlKey) && e.key === "4") {
        e.preventDefault();
        router.push("/dashboard/branch/pos/sales");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className="flex justify-between items-start">
      {/* Left Section */}
      <div>
        <p className="text-lg text-muted-foreground">
          Welcome to{" "}
          <span className="font-semibold">
            Kandy Radio Engineering - Point of Sales
          </span>
        </p>
        <p className="text-base text-muted-foreground">
          Branch:{" "}
          <span className="font-medium">{user?.branch_name ?? "—"}</span>
        </p>
      </div>

      {/* Middle Section: Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={isActive("/dashboard/branch/pos") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/pos")}
        >
          <Package className="w-4 h-4 mr-2" />
          Product Catalog <span className="ml-2 text-xs">(⌘+1)</span>
        </Button>

        <Button
          variant={isActive("/dashboard/branch/cash") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/cash")}
        >
          <User className="w-4 h-4 mr-2" />
          Cashier <span className="ml-2 text-xs">(⌘+2)</span>
        </Button>

        <Button
          variant={isActive("/dashboard/branch/payments") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/payments")}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payment <span className="ml-2 text-xs">(⌘+3)</span>
        </Button>

        <Button
          variant={isActive("/dashboard/branch/pos/sales") ? "default" : "outline"}
          className="relative"
          onClick={() => router.push("/dashboard/branch/pos/sales")}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Cart
          <ChevronRight className="w-4 h-4 ml-2" />
          <span className="ml-2 text-xs">(⌘+4)</span>
        </Button>
      </div>

      {/* Right Section */}
        <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </div>
  );
};
