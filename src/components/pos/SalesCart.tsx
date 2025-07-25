"use client"
import React, { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Form } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Package,
  Edit,
  Save,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Scan,
  AlertCircle,
  Info,
} from 'lucide-react';
import { POSScanner } from '@/components/pos/POSScanner';
import { toast } from 'sonner';
import { SearchableDropdown } from '../form/SearchableDropdown';
import { useCustomerData } from '../table/CustomerTable/CustomerData';
import CustomFormField, { FormFieldType } from '../CustomFormField';

// Zod schemas aligned with sales order API
export const orderFormSchema = z.object({
  customer_id: z.string().optional(),
  payment_method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'CREDIT', 'CHEQUE', 'INSTALLMENT']).default('CASH'),
  payment_status: z.enum(['PENDING', 'PAID', 'PARTIAL']).default('PAID'),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  delivery_date: z.string().optional(),
});

const batchItemFormSchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
  discount: z.number().min(0).optional().default(0),
  batch_id: z.string().min(1, 'Batch selection is required'),
});

// Types based on barcode scanner API responses
interface ScannedProduct {
  barcode_id?: string;
  barcode: string;
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL';
  product_id: string;
  name: string;
  model?: string;
  sku: string;
  brand?: {
    name: string;
    code: string;
  };
  category?: {
    category: string;
    subcategory: string;
  };
  pricing: {
    cost_price: number;
    wholesale_price?: number;
    retail_price: number;
    selling_price: number;
  };
  inventory: {
    available_quantity: number;
    is_low_stock: boolean;
  };
  item_details?: {
    item_id: string;
    status: string;
    condition: string;
    warranty_expiry?: string;
    location_branch: string;
    purchased_at: string;
    supplier_name?: string;
  };
  batch_info?: {
    batch_id: string;
    batch_number: string;
    expiry_date?: string;
    branch_quantity?: number;
    branch_available?: number;
  };
  batches?: Array<{
    batch_id: string;
    batch_number: string;
    quantity: number;
    cost_price: number;
    wholesale_price?: number;
    retail_price: number;
    expiry_date?: string;
    received_date?: string;
  }>;
  requires_quantity_input: boolean;
  max_quantity?: number;
  warranty_period?: number;
}

interface Customer {
  id: string;
  name: string;
  customer_number: string;
  phone?: string;
  email?: string;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP';
  discount_percentage?: number;
  is_active: boolean;
}

// Cart item types aligned with sales order API request
interface CartItem {
  id: string;
  type: 'BATCH' | 'INDIVIDUAL';
  product_id: string;
  product: {
    name: string;
    model?: string;
    sku: string;
    barcode: string;
    brand?: {
      name: string;
      code: string;
    };
  };
  unit_price: number;
  discount: number;
  quantity?: number; // For display purposes
  total_quantity: number; // Calculated total
  line_total: number;
  batches?: Array<{
    batch_id: string;
    batch_number: string;
    quantity: number;
    cost_price: number;
    retail_price: number;
    expiry_date?: string;
  }>;
  item_barcodes?: string[]; // For individual items
  item_details?: {
    item_id: string;
    barcode: string;
    condition: string;
    warranty_expiry?: string;
  }[];
}

interface SalesOrder {
  customer?: {
    customer_id: string;
    name?: string;
    customer_type?: string;
  };
  items: Array<{
    type: 'BATCH' | 'INDIVIDUAL';
    product_id: string;
    unit_price: number;
    discount?: number;
    batches?: Array<{
      batch_id: string;
      quantity: number;
    }>;
    item_barcodes?: string[];
  }>;
  payment_method: string;
  payment_status: string;
  discount: number;
  notes?: string;
}

export type OrderFormData = z.infer<typeof orderFormSchema> & {
  discount: number;
  payment_method: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'MOBILE_PAYMENT' | 'CREDIT' | 'CHEQUE' | 'INSTALLMENT';
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL';
};
type BatchItemFormData = z.infer<typeof batchItemFormSchema>;

interface SalesCartProps {
  cartPanelOpen: boolean;
  setCartPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const SalesCart: React.FC<SalesCartProps> = ({
  cartPanelOpen,
  setCartPanelOpen
}) => {
  const [loading, setLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [scannerExpanded, setScannerExpanded] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [batchSelectionDialog, setBatchSelectionDialog] = useState<{
    open: boolean;
    product?: ScannedProduct;
  }>({ open: false });
  const [pendingScannedProduct, setPendingScannedProduct] = useState<ScannedProduct | null>(null);

  // Form instances
  const orderForm = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_id: '',
      payment_method: 'CASH',
      payment_status: 'PAID',
      discount: 0,
      notes: '',
    },
  });

  const batchForm = useForm<BatchItemFormData>({
    resolver: zodResolver(batchItemFormSchema),
    defaultValues: {
      quantity: 1,
      unit_price: 0,
      discount: 0,
      batch_id: '',
    },
  });

  const {
    data: customerData,
    isLoading: customersLoading,
    handleSearch: handleCustomerSearch,
    searchTerm: customerSearchTerm,
  } = useCustomerData();

  // Prepare customer options
  const customers = customerData?.data?.customers || [];
  const customerOptions = customers.map(customer => ({
    id: customer.id,
    name: `${customer.name} (${customer.customer_number})`,
    value: customer.id,
  }));

  const paymentMethodOptions = [
    { id: 'CASH', name: 'Cash', value: 'CASH' },
    { id: 'CREDIT_CARD', name: 'Credit Card', value: 'CREDIT_CARD' },
    { id: 'DEBIT_CARD', name: 'Debit Card', value: 'DEBIT_CARD' },
    { id: 'BANK_TRANSFER', name: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { id: 'MOBILE_PAYMENT', name: 'Mobile Payment', value: 'MOBILE_PAYMENT' },
    { id: 'CREDIT', name: 'Credit', value: 'CREDIT' },
  ];

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
  const orderDiscount = orderForm.watch('discount') || 0;
  const totalAmount = subtotal - orderDiscount;

  // Handle scanner responses based on scan type
  const handleScannerAddToCart = (formData: any, scannedProduct: ScannedProduct) => {
    console.log('Scanned product:', scannedProduct);

    // Check if product already exists in cart
    const existingItem = cartItems.find(item => 
      item.product.barcode === scannedProduct.barcode ||
      (scannedProduct.scan_type === 'INDIVIDUAL_ITEM' && 
       item.item_barcodes?.includes(scannedProduct.barcode_id || ''))
    );

    if (existingItem) {
      toast.error("Product already in cart");
      return;
    }

    if (scannedProduct.scan_type === 'INDIVIDUAL_ITEM') {
      // Individual item - add directly to cart
      addIndividualItemToCart(scannedProduct);
    } else {
      // Product level - show batch selection dialog
      setPendingScannedProduct(scannedProduct);
      
      if (scannedProduct.batches && scannedProduct.batches.length > 0) {
        // Set default values for batch form
        batchForm.reset({
          quantity: 1,
          unit_price: scannedProduct.pricing.selling_price,
          discount: 0,
          batch_id: scannedProduct.batches[0].batch_id, // Select first batch by default
        });
        setBatchSelectionDialog({ open: true, product: scannedProduct });
      } else {
        toast.error("No available batches for this product");
      }
    }
  };

  const addIndividualItemToCart = (scannedProduct: ScannedProduct) => {
    if (!scannedProduct.item_details || !scannedProduct.barcode_id) {
      toast.error("Invalid individual item data");
      return;
    }

    const newItem: CartItem = {
      id: `individual-${scannedProduct.barcode_id}-${Date.now()}`,
      type: 'INDIVIDUAL',
      product_id: scannedProduct.product_id,
      product: {
        name: scannedProduct.name,
        model: scannedProduct.model,
        sku: scannedProduct.sku,
        barcode: scannedProduct.barcode,
        brand: scannedProduct.brand,
      },
      unit_price: scannedProduct.pricing.selling_price,
      discount: 0,
      quantity: 1,
      total_quantity: 1,
      line_total: scannedProduct.pricing.selling_price,
      item_barcodes: [scannedProduct.barcode_id],
      item_details: [{
        item_id: scannedProduct.item_details.item_id,
        barcode: scannedProduct.barcode,
        condition: scannedProduct.item_details.condition,
        warranty_expiry: scannedProduct.item_details.warranty_expiry,
      }],
    };

    setCartItems(prev => [...prev, newItem]);
    toast.success(`Added ${scannedProduct.name} to cart (Individual Item)`, {
      icon: "📱",
    });
  };

  const handleBatchSelection = (batchData: BatchItemFormData) => {
    if (!pendingScannedProduct) return;

    const selectedBatch = pendingScannedProduct.batches?.find(
      batch => batch.batch_id === batchData.batch_id
    );

    if (!selectedBatch) {
      toast.error("Selected batch not found");
      return;
    }

    if (batchData.quantity > selectedBatch.quantity) {
      toast.error(`Insufficient stock. Available: ${selectedBatch.quantity}`);
      return;
    }

    const lineTotal = (batchData.unit_price * batchData.quantity) - batchData.discount;

    const newItem: CartItem = {
      id: `batch-${pendingScannedProduct.product_id}-${Date.now()}`,
      type: 'BATCH',
      product_id: pendingScannedProduct.product_id,
      product: {
        name: pendingScannedProduct.name,
        model: pendingScannedProduct.model,
        sku: pendingScannedProduct.sku,
        barcode: pendingScannedProduct.barcode,
        brand: pendingScannedProduct.brand,
      },
      unit_price: batchData.unit_price,
      discount: batchData.discount,
      quantity: batchData.quantity,
      total_quantity: batchData.quantity,
      line_total: lineTotal,
      batches: [{
        batch_id: selectedBatch.batch_id,
        batch_number: selectedBatch.batch_number,
        quantity: batchData.quantity,
        cost_price: selectedBatch.cost_price,
        retail_price: selectedBatch.retail_price,
        expiry_date: selectedBatch.expiry_date,
      }],
    };

    setCartItems(prev => [...prev, newItem]);
    toast.success(`Added ${pendingScannedProduct.name} to cart (Batch: ${selectedBatch.batch_number})`, {
      icon: "📱",
    });

    // Close dialog and reset
    setBatchSelectionDialog({ open: false });
    setPendingScannedProduct(null);
    batchForm.reset();
  };

  // Place sales order
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before placing order');
      return;
    }

    const orderFormData = orderForm.getValues();
    setLoading(true);

    try {
      // Prepare order data according to sales order API structure
      const orderData: SalesOrder = {
        customer: orderFormData.customer_id ? {
          customer_id: orderFormData.customer_id
        } : undefined,
        items: cartItems.map(item => ({
          type: item.type,
          product_id: item.product_id,
          unit_price: item.unit_price,
          discount: item.discount,
          ...(item.type === 'BATCH' && item.batches ? {
            batches: item.batches.map(batch => ({
              batch_id: batch.batch_id,
              quantity: batch.quantity
            }))
          } : {}),
          ...(item.type === 'INDIVIDUAL' && item.item_barcodes ? {
            item_barcodes: item.item_barcodes
          } : {})
        })),
        payment_method: orderFormData.payment_method || 'CASH',
        payment_status: orderFormData.payment_status || 'PAID',
        discount: orderFormData.discount || 0,
        notes: orderFormData.notes,
      };

      console.log('Placing order:', orderData);

      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Order placed successfully! Order #${result.data.order_number}`);
        
        // Clear cart and reset form
        setCartItems([]);
        orderForm.reset();
        setCartPanelOpen(false);
      } else {
        toast.error('Error placing order: ' + (result.message || 'Unknown error'));
        console.error('Order placement failed:', result);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Error placing order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeCartItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear the cart?')) {
      setCartItems([]);
      toast.success('Cart cleared');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCartPanelOpen(false)}
            className="p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <ShoppingCart className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-semibold">Sales Cart</h2>
            <p className="text-sm text-muted-foreground">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScannerExpanded(!scannerExpanded)}
            title="Toggle Quick Scanner"
          >
            <Scan className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Quick Scanner */}
        {scannerExpanded && (
          <div className="p-3 border-b bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Scan className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Quick Scanner</span>
              <Badge variant="secondary" className="text-xs">Sales Mode</Badge>
            </div>
            <POSScanner
              onProductScanned={handleScannerAddToCart}
              isCartOpen={true}
              compact={true}
              className="bg-transparent border-0 p-0"
            />
          </div>
        )}

        {/* Order Details Section */}
        <div className="p-4 border-b bg-muted/10">
          <Form {...orderForm}>
            <form className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Controller
                  name="customer_id"
                  control={orderForm.control}
                  render={({ field }) => (
                    <SearchableDropdown
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      placeholder="Select customer (optional)"
                      searchPlaceholder="Search customers..."
                      options={customerOptions}
                      emptyMessage="No customer found"
                      onSearch={handleCustomerSearch}
                      searchTerm={customerSearchTerm}
                    />
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-hidden">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <Package className="w-16 h-16 mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">Cart is empty</p>
              <p className="text-sm mt-2 text-center">
                Scan barcodes above to add products to your cart
              </p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[200px]">Product</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[100px]">Unit Price</TableHead>
                    <TableHead className="w-[80px]">Discount</TableHead>
                    <TableHead className="w-[100px]">Total</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{item.product.name}</div>
                          {item.product.model && (
                            <div className="text-xs text-muted-foreground">
                              Model: {item.product.model}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.product.sku}
                          </div>
                          {item.product.brand && (
                            <div className="text-xs text-muted-foreground">
                              Brand: {item.product.brand.name}
                            </div>
                          )}
                          {item.type === 'BATCH' && item.batches && (
                            <div className="text-xs text-blue-600">
                              Batch: {item.batches.map(b => b.batch_number).join(', ')}
                            </div>
                          )}
                          {item.type === 'INDIVIDUAL' && (
                            <div className="text-xs text-green-600">
                              Individual Item
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'INDIVIDUAL' ? 'default' : 'secondary'}>
                          {item.type === 'INDIVIDUAL' ? 'ITEM' : 'BATCH'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.total_quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>{formatCurrency(item.discount)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.line_total)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeCartItem(item.id)}
                          className="w-8 h-8 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer with totals and actions */}
        {cartItems.length > 0 && (
          <div className="border-t bg-muted/10 p-4 space-y-4">
            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Discount:</span>
                <span className="font-medium">-{formatCurrency(orderDiscount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearCart} className="flex-1">
                  Clear Cart
                </Button>
                <Button 
                  size="sm" 
                  onClick={handlePlaceOrder} 
                  disabled={loading || cartItems.length === 0} 
                  className="bg-primary flex-1"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Selection Dialog */}
      <Dialog open={batchSelectionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setBatchSelectionDialog({ open: false });
          setPendingScannedProduct(null);
          batchForm.reset();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Batch & Quantity</DialogTitle>
            <DialogDescription>
              {pendingScannedProduct?.name} - Choose batch and enter quantity
            </DialogDescription>
          </DialogHeader>

          {pendingScannedProduct && (
            <Form {...batchForm}>
              <form onSubmit={batchForm.handleSubmit(handleBatchSelection)} className="space-y-4">
                <CustomFormField
                  fieldType={FormFieldType.SELECT}
                  control={batchForm.control}
                  name="batch_id"
                  label="Select Batch"
                  placeholder="Choose a batch"
                  options={pendingScannedProduct.batches?.map(batch => ({
                    id: batch.batch_id,
                    name: `${batch.batch_number} (Qty: ${batch.quantity}) - Exp: ${batch.expiry_date || 'N/A'}`,
                    value: batch.batch_id,
                  })) || []}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CustomFormField
                    fieldType={FormFieldType.NUMBER}
                    control={batchForm.control}
                    name="quantity"
                    label="Quantity"
                  />

                  <CustomFormField
                    fieldType={FormFieldType.NUMBER}
                    control={batchForm.control}
                    name="unit_price"
                    label="Unit Price"
                  />
                </div>

                <CustomFormField
                  fieldType={FormFieldType.NUMBER}
                  control={batchForm.control}
                  name="discount"
                  label="Item Discount"
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBatchSelectionDialog({ open: false })}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Add to Cart
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};