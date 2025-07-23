import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { CartItem } from '@/types/pos';
import { OrderFormData } from '@/components/pos/PurchaseCart';

interface CartSummaryBarProps {
  cartItems: CartItem[];
  orderFormData: OrderFormData;
}

export const CartSummaryBar: React.FC<CartSummaryBarProps> = ({
  cartItems,
  orderFormData
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const cartSummary = {
    itemCount: cartItems.length,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: cartItems.reduce((sum, item) => sum + item.line_total, 0)
  };

  if (cartItems.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <div className="flex gap-6 text-sm">
              <span className="font-medium">
                {cartSummary.itemCount} item{cartSummary.itemCount !== 1 ? 's' : ''} in cart
              </span>
              <span className="text-muted-foreground">
                Total Qty: {cartSummary.totalQuantity}
              </span>
              <span className="text-muted-foreground">
                Total Value: {formatPrice(cartSummary.totalValue)}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Order Status: {orderFormData.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
