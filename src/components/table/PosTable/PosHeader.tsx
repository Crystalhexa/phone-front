// components/products/ProductsHeader.tsx
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import SalesCart from '@/components/pos/SalesCart';
import { CartItem } from '@/types/pos';
import { OrderFormData } from '@/components/pos/PurchaseCart';

interface PosHeaderProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
  onAddToCart: (formData: any) => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  cartItems,
  setCartItems,
  orderFormData,
  setOrderFormData,
  onAddToCart
}) => {
  const { user } = useAuth();

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
        <SalesCart
          onAddToCart={onAddToCart}
          cartItems={cartItems}
          setCartItems={setCartItems}
          orderFormData={orderFormData}
          setOrderFormData={setOrderFormData}
        />
      </div>
    </div>
  );
};