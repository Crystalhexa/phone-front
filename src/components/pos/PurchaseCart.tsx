"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  ChevronRight,
  Maximize2,
  Check,
} from 'lucide-react';
import CustomFormField, { FormFieldType } from '../form/CustomFormField';
import { toast } from 'sonner';

// Zod schemas
export const orderFormSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  order_date: z.coerce.date().optional(),
  expected_date: z.coerce.date().optional(),
  status: z.enum(['PENDING', 'RECEIVED']),
  invoive_number: z.string().optional(),
  notes: z.string().optional(),
});

const itemFormSchema = z.object({
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  cost_price: z.coerce.number().min(0, 'Cost price must be positive'),
  wholesale_price: z.coerce.number().min(0, 'Wholesale price must be positive').optional(),
  retail_price: z.coerce.number().min(0, 'Retail price must be positive'),
  is_unique: z.boolean().optional(),
});

// Types
interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  sales_rep_name: string;
  sales_rep_phone?: string;
  payment_terms?: string;
  credit_limit?: number;
  is_active: boolean;
}

interface CartItem {
  id: string;
  product: {
    id: string;
    name: string;
    model?: string;
    sku?: string;
    brand?: {
      name: string;
      code: string;
    };
  };
  is_unique?: boolean;
  quantity: number;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  line_total: number;
  batch_number?: string;
  expiry_date?: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date?: Date;
  expected_date?: Date;
  invoive_number?: string;
  status: 'PENDING' | 'RECEIVED';
  notes?: string;
  subtotal: number;
  total_amount: number;
  items?: CartItem[];
  is_saved: boolean;
}

export type OrderFormData = z.infer<typeof orderFormSchema>;
type ItemFormData = z.infer<typeof itemFormSchema>;

interface PurchaseCartProps {
  onAddToCart: (product: any) => void;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  availableProducts?: any[];
  orderFormData: OrderFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
}

export const PurchaseCart: React.FC<PurchaseCartProps> = ({
  onAddToCart,
  cartItems,
  setCartItems,
  availableProducts = [],
  orderFormData,
  setOrderFormData
}) => {
  console.log(cartItems)
  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOrderDetails, setEditingOrderDetails] = useState(false);
  
  // Store original values for cancel functionality
  const [originalItemData, setOriginalItemData] = useState<ItemFormData | null>(null);

  // Slide-over panel states
  const [cartPanelOpen, setCartPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dialog states
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);

  // Form instances
  const orderForm = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      supplier_id: '',
      order_date: new Date(),
      expected_date: new Date(),
      status: 'PENDING',
      invoive_number: '',
      notes: '',
    },
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      quantity: 1,
      cost_price: 0,
      wholesale_price: 0,
      retail_price: 0,
      is_unique: false
    },
  });

  // Update form values when editing an item
  useEffect(() => {
    if (editingItemId) {
      const editingItem = cartItems.find(item => item.id === editingItemId);
      if (editingItem) {
        const itemData = {
          quantity: editingItem.quantity,
          cost_price: editingItem.cost_price,
          wholesale_price: editingItem.wholesale_price || 0,
          retail_price: editingItem.retail_price,
          batch_number: editingItem.batch_number || '',
          expiry_date: editingItem.expiry_date || '',
          is_unique: editingItem.is_unique || false,
        };
        
        // Store original data for cancel functionality
        setOriginalItemData(itemData);
        itemForm.reset(itemData);
      }
    } else {
      setOriginalItemData(null);
    }
  }, [editingItemId, cartItems, itemForm]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        const data = await response.json();
        if (data.success) {
          setSuppliers(data.data.suppliers || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    fetchSuppliers();
  }, []);

  // Calculate totals and update current order when cart changes
  useEffect(() => {
    if (currentOrder) {
      const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
      const totalAmount = subtotal;

      setCurrentOrder(prev => prev ? {
        ...prev,
        subtotal,
        total_amount: totalAmount,
        items: cartItems
      } : null);
    }
  }, [cartItems, currentOrder?.id]);

  // Calculate totals for display
  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
  const totalAmount = subtotal;

  // Prepare supplier options for select
  const supplierOptions = suppliers.map(supplier => ({
    id: supplier.id,
    name: `${supplier.name} (${supplier.code})`,
    value: supplier.id,
  }));

  const statusOptions = [
    { id: 'PENDING', name: 'Pending', value: 'PENDING' },
    { id: 'RECEIVED', name: 'Received', value: 'RECEIVED' },
  ];

  // Create order - only saves to useState
  const handleCreateOrder = (data: OrderFormData) => {
    const supplier = suppliers.find(s => s.id === data.supplier_id);
    const tempOrderNumber = `PO-${Date.now()}`;

    const newOrder: PurchaseOrder = {
      id: `temp-${Date.now()}`,
      order_number: tempOrderNumber,
      supplier_id: data.supplier_id,
      supplier_name: supplier?.name || '',
      order_date: data.order_date,
      expected_date: data.expected_date,
      invoive_number: data.invoive_number || '',
      status: data.status,
      notes: data.notes || '',
      subtotal: 0,
      total_amount: 0,
      items: [],
      is_saved: false
    };

    setCurrentOrder(newOrder);
    setOrderFormData(data);
    setCreateOrderDialogOpen(false);
    orderForm.reset();
  };

  // Update order details
  const handleUpdateOrderDetails = (data: OrderFormData) => {
    if (!currentOrder) return;

    const supplier = suppliers.find(s => s.id === data.supplier_id);
    setCurrentOrder(prev => prev ? {
      ...prev,
      supplier_id: data.supplier_id,
      supplier_name: supplier?.name || '',
      order_date: data.order_date,
      expected_date: data.expected_date,
      invoive_number: data.invoive_number || '',
      status: data.status,
      notes: data.notes || '',
    } : null);

    setOrderFormData(data);
    setEditingOrderDetails(false);
    toast.success('Order details updated successfully!');
  };

  // Save complete order to database
  const handleSaveOrder = async () => {
    if (!currentOrder) {
      alert('No order to save');
      return;
    }

    if (cartItems.length === 0) {
      alert('Please add items to the cart before saving the order');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        supplier_id: currentOrder.supplier_id,
        order_date: currentOrder.order_date,
        expected_date: currentOrder.expected_date,
        status: currentOrder.status,
        notes: currentOrder.notes,
        invoive_number: currentOrder.invoive_number,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          wholesale_price: item.wholesale_price,
          retail_price: item.retail_price,
          is_unique: item.is_unique
        }))
      };

      const response = await fetch('/api/purchase-orders/Recived', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        setCurrentOrder(prev => prev ? {
          ...prev,
          id: result.data.id,
          order_number: result.data.order_number,
          is_saved: true
        } : null);

        toast.success(`Order saved successfully! Order number: ${result.data.order_number}`);
        setCartPanelOpen(false);

        // Clear cart and reset for new order
        setCartItems([]);
        setCurrentOrder(null);
      } else {
        toast.error('Error saving order: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Error saving order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start editing an item
  const handleStartEditing = (itemId: string) => {
    setEditingItemId(itemId);
  };

  // Handle inline item editing with validation
  const handleSaveCartItem = async () => {
    if (!editingItemId) return;

    try {
      const isValid = await itemForm.trigger();
      if (!isValid) {
        toast.error('Please fix validation errors before saving');
        return;
      }

      const formData = itemForm.getValues();
      
      setCartItems(prev => prev.map(item => {
        if (item.id === editingItemId) {
          const lineTotal = formData.quantity * formData.cost_price;
          return {
            ...item,
            quantity: formData.quantity,
            cost_price: formData.cost_price,
            wholesale_price: formData.wholesale_price,
            retail_price: formData.retail_price,
            is_unique: formData.is_unique,
            line_total: lineTotal,
          };
        }
        return item;
      }));

      setEditingItemId(null);
      toast.success('Item updated successfully!');
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Error saving item. Please try again.');
    }
  };

  // Cancel editing and restore original values
  const handleCancelEditing = () => {
    if (originalItemData) {
      itemForm.reset(originalItemData);
    }
    setEditingItemId(null);
    toast.info('Edit cancelled');
  };

  const removeCartItem = (itemId: string) => {
    // Don't allow removal if item is being edited
    if (editingItemId === itemId) {
      toast.warning('Please save or cancel your changes before removing this item');
      return;
    }
    
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    if (editingItemId) {
      toast.warning('Please save or cancel your changes before clearing the cart');
      return;
    }
    
    if (window.confirm('Are you sure you want to clear the cart? This action cannot be undone.')) {
      setCartItems([]);
      toast.success('Cart cleared');
    }
  };

  const startNewOrder = (type: boolean) => {
    if (editingItemId) {
      toast.warning('Please save or cancel your changes before starting a new order');
      return;
    }
    
    if (cartItems.length > 0) {
      const confirmClear = window.confirm('Starting a new order will clear the current cart. Are you sure?');
      if (!confirmClear) return;
    }
    
    setOrderFormData({
      supplier_id: '',
      order_date: new Date(),
      expected_date: undefined,
      status: 'PENDING',
      notes: ''
    })
    setCartItems([]);
    setCurrentOrder(null);
    setEditingOrderDetails(false);
    if (!type) return;

    setCreateOrderDialogOpen(true);
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


  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Cart Panel Component
  const CartPanel = () => (
    <>
      {/* Backdrop */}
      {cartPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setCartPanelOpen(false)}
        />
      )}

      {/* Slide-over Panel */}
      <div className={`
        fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-50 transition-all duration-300 ease-in-out
        ${cartPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        ${isFullscreen ? 'w-full' : 'w-[90vw] lg:w-[70vw] xl:w-[60vw]'}
      `}>
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-semibold">Purchase Order Cart</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingOrderDetails(!editingOrderDetails)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartPanelOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
          {/* Order Details Section */}
          <div className="p-4 border-b bg-muted/10">
            {editingOrderDetails ? (
              <Form {...orderForm}>
                <form
                  onSubmit={orderForm.handleSubmit(handleUpdateOrderDetails)}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={orderForm.control}
                      name="supplier_id"
                      label="Supplier"
                      placeholder="Select supplier"
                      options={supplierOptions}
                      required
                    />
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={orderForm.control}
                      name="status"
                      label="Status"
                      placeholder="Select status"
                      options={statusOptions}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <CustomFormField
                      fieldType={FormFieldType.DATE_PICKER}
                      control={orderForm.control}
                      name="order_date"
                      label="Order Date"
                    />
                    <CustomFormField
                      fieldType={FormFieldType.DATE_PICKER}
                      control={orderForm.control}
                      name="expected_date"
                      label="Expected Delivery Date"
                      placeholder="Select expected delivery date"
                    />
                  </div>

                  <CustomFormField
                    fieldType={FormFieldType.TEXTAREA}
                    control={orderForm.control}
                    name="notes"
                    label="Notes"
                    placeholder="Order notes..."
                    rows={2}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOrderDetails(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm">
                      Update Details
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Supplier</Label>
                  <p className="mt-1 font-medium">{currentOrder?.supplier_name}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <p className="mt-1">
                    <Badge variant={currentOrder?.status === 'RECEIVED' ? 'default' : 'secondary'} className="text-xs">
                      {currentOrder?.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Order Date</Label>
                  <p className="mt-1">{formatDate(currentOrder?.order_date)}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Expected Date</Label>
                  <p className="mt-1">{formatDate(currentOrder?.expected_date)}</p>
                </div>
                {currentOrder?.notes && (
                  <div className="col-span-2 lg:col-span-4">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    <p className="mt-1 text-sm">{currentOrder.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Package className="w-16 h-16 mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium">No items in cart</p>
                <p className="text-sm mt-2">Add products from the product table to start building your order</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <Form {...itemForm}>
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[300px]">Product</TableHead>
                        <TableHead className="w-[120px]">Is Unique</TableHead>
                        <TableHead className="w-[100px]">Qty</TableHead>
                        <TableHead className="w-[120px]">Cost</TableHead>
                        {currentOrder?.status === 'RECEIVED' && (
                          <>
                            <TableHead className="w-[120px]">Wholesale</TableHead>
                            <TableHead className="w-[120px]">Retail</TableHead>
                          </>
                        )}
                        <TableHead className="w-[120px]">Total</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item) => {
                        const isEditingThis = editingItemId === item.id;

                        return (
                          <TableRow key={item.id} className={isEditingThis ? 'bg-muted/50' : ''}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{item.product.name}</div>
                                {item.product.model && (
                                  <div className="text-xs text-muted-foreground">Model: {item.product.model}</div>
                                )}
                                {item.product.sku && (
                                  <div className="text-xs text-muted-foreground">SKU: {item.product.sku}</div>
                                )}
                                {item.product.brand && (
                                  <div className="text-xs text-muted-foreground">Brand: {item.product.brand.name}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isEditingThis ? (
                                <CustomFormField
                                  fieldType={FormFieldType.CHECKBOX}
                                  control={itemForm.control}
                                  name="is_unique"
                                  label=""
                                />
                              ) : (
                                <Badge variant={item.is_unique ? 'default' : 'secondary'} className="text-xs">
                                  {item.is_unique ? 'Yes' : 'No'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditingThis ? (
                                <CustomFormField
                                  fieldType={FormFieldType.NUMBER}
                                  control={itemForm.control}
                                  name="quantity"
                                  min={1}
                                  inputClassName="w-full text-sm"
                                />
                              ) : (
                                <span>{item.quantity}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditingThis ? (
                                <CustomFormField
                                  fieldType={FormFieldType.NUMBER}
                                  control={itemForm.control}
                                  name="cost_price"
                                  step={0.01}
                                  min={0}
                                  inputClassName="w-full text-sm"
                                />
                              ) : (
                                <span>{formatCurrency(item.cost_price)}</span>
                              )}
                            </TableCell>
                            {currentOrder?.status === 'RECEIVED' && (
                              <>
                                <TableCell>
                                  {isEditingThis ? (
                                    <CustomFormField
                                      fieldType={FormFieldType.NUMBER}
                                      control={itemForm.control}
                                      name="wholesale_price"
                                      step={0.01}
                                      min={0}
                                      inputClassName="w-full text-sm"
                                    />
                                  ) : (
                                    <span>{formatCurrency(item.wholesale_price || 0)}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditingThis ? (
                                    <CustomFormField
                                      fieldType={FormFieldType.NUMBER}
                                      control={itemForm.control}
                                      name="retail_price"
                                      step={0.01}
                                      min={0}
                                      inputClassName="w-full text-sm"
                                    />
                                  ) : (
                                    <span>{formatCurrency(item.retail_price)}</span>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="font-medium text-sm">{formatCurrency(item.line_total)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {isEditingThis ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={handleSaveCartItem}
                                      className="w-8 h-8 p-0"
                                      title="Save changes"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEditing}
                                      className="w-8 h-8 p-0"
                                      title="Cancel changes"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleStartEditing(item.id)}
                                      className="w-8 h-8 p-0"
                                      title="Edit item"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => removeCartItem(item.id)}
                                      className="w-8 h-8 p-0"
                                      title="Remove item"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Form>
              </div>
            )}
          </div>

          {/* Footer with totals and actions */}
          {cartItems.length > 0 && (
            <div className="border-t bg-muted/10 p-4 space-y-4">
              {/* Editing Status Bar */}
              {editingItemId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Editing item - make your changes and click save
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" onClick={handleSaveCartItem}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearCart}
                    disabled={editingItemId !== null}
                  >
                    Clear Cart
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startNewOrder(false)}
                    disabled={editingItemId !== null}
                  >
                    Cancel Order
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startNewOrder(true)}
                    disabled={editingItemId !== null}
                  >
                    New Order
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveOrder} 
                    disabled={loading || editingItemId !== null} 
                    className="bg-primary"
                  >
                    {loading ? 'Finalizing...' : 'Finalize Order'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Main Action Buttons */}
      <div className="flex gap-3">
        {!currentOrder ? (
          <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-2xl p-6">
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new purchase order
                </DialogDescription>
              </DialogHeader>

              <Form {...orderForm}>
                <form onSubmit={orderForm.handleSubmit(handleCreateOrder)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={orderForm.control}
                      name="supplier_id"
                      label="Supplier"
                      placeholder="Select supplier"
                      options={supplierOptions}
                      required
                    />
                    <CustomFormField
                      fieldType={FormFieldType.SELECT}
                      control={orderForm.control}
                      name="status"
                      label="Status"
                      placeholder="Select status"
                      options={statusOptions}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomFormField
                      fieldType={FormFieldType.DATE_PICKER}
                      control={orderForm.control}
                      name="order_date"
                      label="Order Date"
                    />
                    <CustomFormField
                      fieldType={FormFieldType.DATE_PICKER}
                      control={orderForm.control}
                      name="expected_date"
                      label="Expected Delivery Date"
                      placeholder="Select expected delivery date"
                    />
                  </div>

                  <CustomFormField
                    fieldType={FormFieldType.TEXTAREA}
                    control={orderForm.control}
                    name="notes"
                    label="Notes"
                    placeholder="Order notes..."
                    rows={3}
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOrderDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Order'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : (
          // Cart trigger button
          <Button
            variant="outline"
            className="relative"
            onClick={() => setCartPanelOpen(true)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Cart
            {cartItems.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {cartItems.length}
              </Badge>
            )}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Cart Panel */}
      <CartPanel />
    </div>
  );
};

export default PurchaseCart;