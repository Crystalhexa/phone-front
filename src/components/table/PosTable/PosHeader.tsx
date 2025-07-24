// components/products/ProductsHeader.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus } from 'lucide-react';
import { CartItem } from '@/types/pos';
import { OrderFormData } from '@/components/pos/PurchaseCart';

interface PosHeaderProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  onAddToCart: (formData: any) => void;
  cartPanelOpen: boolean;
  setCartPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  cartItems,
  setCartItems,
  orderFormData,
  setOrderFormData,
  onAddToCart,
  cartPanelOpen,
  setCartPanelOpen
}) => {
  const { user } = useAuth();

  const hasActiveOrder = orderFormData.supplier_id !== '';

  return (
    <div className="flex justify-between items-start">
      <div className="mb-0 space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-50">
          Point of Sale
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to <span className="font-semibold">Kandy Radio Engineering</span>
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
          disabled={!hasActiveOrder}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {cartPanelOpen ? 'Hide Cart' : 'Show Cart'}
          {cartItems.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
              {cartItems.length}
            </Badge>
          )}
        </Button>

        {/* Create Order Button - if no active order */}
        {!hasActiveOrder && (
          <Button onClick={() => setCartPanelOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Sales Order
          </Button>
        )}
      </div>
    </div>
  );
};