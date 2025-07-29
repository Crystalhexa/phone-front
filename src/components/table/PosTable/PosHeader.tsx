// components/products/ProductsHeader.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus } from 'lucide-react';
import SalesPopover from '@/components/pos/SalesPopover';

interface PosHeaderProps {
  cartPanelOpen: boolean;
  setCartPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  cartPanelOpen,
  setCartPanelOpen
}) => {
  const { user } = useAuth();


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
        <SalesPopover user={user||null}/>
      </div>
    </div>
  );
};