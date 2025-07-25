// components/products/ProductsHeader.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus } from 'lucide-react';

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
        <Button
          variant={cartPanelOpen ? "default" : "outline"}
          className="relative"
          onClick={() => setCartPanelOpen(!cartPanelOpen)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {cartPanelOpen ? 'Hide Cart' : 'Show Cart'}
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
            </Badge>
        </Button>
      </div>
    </div>
  );
};