import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Form } from '@/components/ui/form';
import CustomFormField, { FormFieldType } from '@/components/form/CustomFormField';
import {  ShoppingCart, TrendingUp } from 'lucide-react';
import { ProductResponse } from '@/types/inventory';

const purchaseItemSchema = z.object({
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  cost_price: z.coerce.number().min(0, 'Purchase cost must be positive'),
  wholesale_price: z.coerce.number().min(0, 'Wholesale price must be positive').optional(),
  retail_price: z.coerce.number().min(0, 'Retail price must be positive').optional(),
  is_unique: z.boolean().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductResponse;
  orderStatus: 'PENDING' | 'RECEIVED';
  onConfirm: (itemData: {
    quantity: number;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    is_unique?: boolean;
  }) => void;
}

export const AddToCartModal = ({ open, onClose, product, orderStatus, onConfirm }: Props) => {

  const [loading, setLoading] = useState(false);

  type PurchaseItemFormData = z.infer<typeof purchaseItemSchema>;

  const form = useForm<PurchaseItemFormData>({
    resolver: zodResolver(purchaseItemSchema),
    defaultValues: {
      quantity: 1,
      cost_price: product.latest_batch_pricing.cost_price,
      wholesale_price: product.latest_batch_pricing.wholesale_price,
      retail_price:product.latest_batch_pricing.retail_price,
    },
  });

  const handleSubmit = async (data: PurchaseItemFormData) => {
    setLoading(true);
    try {
      onConfirm({
        quantity: data.quantity,
        cost_price: data.cost_price,
        wholesale_price: data.wholesale_price,
        retail_price: data.retail_price,
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  };

const formatCurrency = (amount: unknown) => {
  const num = typeof amount === 'number'
    ? amount
    : typeof amount === 'string'
    ? Number(amount)
    : NaN;

  if (isNaN(num)) return 'Rs. 0.00';

  return `Rs. ${num.toFixed(2)}`;
};

  // Calculate purchase total
  const watchQuantity = form.watch('quantity');
  const watchCostPrice = form.watch('cost_price');
  const purchaseTotal = (watchQuantity || 0) * (watchCostPrice || 0);

  // Calculate potential profit margins
  const watchRetailPrice = form.watch('retail_price');
  const watchWholesalePrice = form.watch('wholesale_price');
  const retailMargin = watchRetailPrice && watchCostPrice ? 
    ((watchRetailPrice - watchCostPrice) / watchCostPrice * 100) : 0;
  const wholesaleMargin = watchWholesalePrice && watchCostPrice ? 
    ((watchWholesalePrice - watchCostPrice) / watchCostPrice * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Purchase {product.name}
          </DialogTitle>
        </DialogHeader>


        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Quantity and Purchase Cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomFormField
                fieldType={FormFieldType.NUMBER}
                control={form.control}
                name="quantity"
                label="Purchase Quantity"
                placeholder="Enter quantity to purchase"
                min={1}
                required
                description="How many units to order from supplier"
              />

              <CustomFormField
                fieldType={FormFieldType.NUMBER}
                control={form.control}
                name="cost_price"
                label="Purchase Cost (per unit)"
                placeholder="0.00"
                step={0.01}
                min={0}
                required
                description="Cost price from supplier"
              />
            </div>

            {/* Selling Prices - Optional for planning */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Planned Selling Prices (Optional)
                </h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  fieldType={FormFieldType.NUMBER}
                  control={form.control}
                  name="wholesale_price"
                  label="Wholesale Selling Price"
                  placeholder="0.00"
                  step={0.01}
                  min={0}
                  description="Price for bulk/wholesale customers"
                />

                <CustomFormField
                  fieldType={FormFieldType.NUMBER}
                  control={form.control}
                  name="retail_price"
                  label="Retail Selling Price"
                  placeholder="0.00"
                  step={0.01}
                  min={0}
                  description="Price for retail customers"
                />
              </div>
              <CustomFormField
                fieldType={FormFieldType.CHECKBOX}
                control={form.control}
                name="is_unique"
                label="Is Unique Item"  
                description="Check if this item is unique (e.g., one-of-a-kind)"
              />
              {/* Profit Margin Indicators */}
              {(wholesaleMargin > 0 || retailMargin > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {wholesaleMargin > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <span className="text-muted-foreground">Wholesale Margin: </span>
                      <span className={`font-medium ${wholesaleMargin > 20 ? 'text-green-600' : wholesaleMargin > 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {wholesaleMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {retailMargin > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded p-2">
                      <span className="text-muted-foreground">Retail Margin: </span>
                      <span className={`font-medium ${retailMargin > 30 ? 'text-green-600' : retailMargin > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {retailMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Purchase Total */}
            {purchaseTotal > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Purchase Cost:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(purchaseTotal)}
                  </span>
                </div>
                {watchQuantity && watchCostPrice && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {watchQuantity} units × {formatCurrency(watchCostPrice)} = {formatCurrency(purchaseTotal)}
                  </div>
                )}
              </div>
            )}

            {/* Order Status Info */}
            <div className="bg-muted/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Purchase Order Status:</span>
                <Badge variant={orderStatus === 'RECEIVED' ? 'default' : 'secondary'}>
                  {orderStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {orderStatus === 'RECEIVED' 
                  ? 'This order has been received - inventory will be updated' 
                  : 'This is a pending purchase order - no inventory changes yet'
                }
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? 'Adding...' : 'Add to Purchase Order'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};