// components/products/ProductsHeader.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react';
import SalesPopover from '@/components/pos/SalesPopover';
import { useRouter } from 'next/navigation';

interface PosHeaderProps {
  cartPanelOpen: boolean;
  setCartPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  cartPanelOpen,
  setCartPanelOpen
}) => {
  const { user } = useAuth();
  const router = useRouter();


  return (
    <div className="flex justify-between items-start">
      <div className="mb-0 ">
        <p className="text-lg text-muted-foreground">
          Welcome to <span className="font-semibold">Kandy Radio Engineering - Point of Sales</span>
        </p>
        <p className="text-base text-muted-foreground">
          Branch: <span className="font-medium">{user?.branch_name ?? "—"}</span>
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Cart Toggle Button */}

        <Button
          variant="outline"
          className="relative"
          onClick={() => router.push('/dashboard/branch/pos/sales')}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Cart

          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>

      </div>
    </div>
  );
};