"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  ChevronRight,
  User,
  CreditCard,
  Package,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export const PosHeader: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // helper for active button
  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex justify-between items-start">
      <div className="mb-0">
        <p className="text-lg text-muted-foreground">
          Welcome to{" "}
          <span className="font-semibold">
            Kandy Radio Engineering - Point of Sales
          </span>
        </p>
        <p className="text-base text-muted-foreground">
          Branch: <span className="font-medium">{user?.branch_name ?? "—"}</span>
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Product Catalog Button */}
        <Button
          variant={isActive("/dashboard/branch/pos") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/pos")}
        >
          <Package className="w-4 h-4 mr-2" />
          Product Catalog
        </Button>

        {/* Cashier Button */}
        <Button
          variant={isActive("/dashboard/branch/cash") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/cash")}
        >
          <User className="w-4 h-4 mr-2" />
          Cashier
        </Button>

        {/* Payment Button */}
        <Button
          variant={isActive("/dashboard/branch/payments") ? "default" : "outline"}
          onClick={() => router.push("/dashboard/branch/payments")}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payment
        </Button>

        {/* Cart Button */}
        <Button
          variant={isActive("/dashboard/branch/pos/sales") ? "default" : "outline"}
          className="relative"
          onClick={() => router.push("/dashboard/branch/pos/sales")}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Cart
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
