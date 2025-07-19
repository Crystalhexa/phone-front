"use client"
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';

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
  branch_id: string;
  order_date: string;
  expected_date?: string;
  status: 'PENDING' | 'RECEIVED';
  notes?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items?: CartItem[];
  is_saved: boolean;
}
type OrderFormData = {
  supplier_id: string;
  branch_id: string;
  order_date: string;
  expected_date: string;
  status: 'PENDING' | 'RECEIVED';
  notes: string;
};
 

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

  const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Dialog states
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [cartViewDialogOpen, setCartViewDialogOpen] = useState(false);

  // Form states


  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [itemFormData, setItemFormData] = useState({
    quantity: 1,
    cost_price: 0,
    wholesale_price: 0,
    retail_price: 0,
    batch_number: '',
    expiry_date: ''
  });

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
      const taxAmount = subtotal * 0.1;
      const totalAmount = subtotal + taxAmount;

      setCurrentOrder(prev => prev ? {
        ...prev,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: cartItems
      } : null);
    }
  }, [cartItems, currentOrder?.id]);

  // Calculate totals for display
  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = subtotal * 0.1;
  const totalAmount = subtotal + taxAmount;

  // Create order - only saves to useState
  const handleCreateOrder = () => {
    if (!orderFormData.supplier_id) {
      alert('Please select a supplier');
      return;
    }

    const supplier = suppliers.find(s => s.id === orderFormData.supplier_id);
    const tempOrderNumber = `PO-${Date.now()}`;

    const newOrder: PurchaseOrder = {
      id: `temp-${Date.now()}`,
      order_number: tempOrderNumber,
      supplier_id: orderFormData.supplier_id,
      supplier_name: supplier?.name || '',
      branch_id: orderFormData.branch_id,
      order_date: orderFormData.order_date,
      expected_date: orderFormData.expected_date,
      status: orderFormData.status,
      notes: orderFormData.notes,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      items: [],
      is_saved: false
    };

    setCurrentOrder(newOrder);
    setCreateOrderDialogOpen(false);

    alert(`Purchase order created! Order number: ${tempOrderNumber}`);
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
        branch_id: currentOrder.branch_id,
        order_date: currentOrder.order_date,
        expected_date: currentOrder.expected_date,
        status: currentOrder.status,
        notes: currentOrder.notes,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          wholesale_price: item.wholesale_price,
          retail_price: item.retail_price,
          line_total: item.line_total,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date
        }))
      };

      const response = await fetch('/api/purchase-orders', {
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

        alert(`Order saved successfully! Order number: ${result.data.order_number}`);
        setCartViewDialogOpen(false);

        // Clear cart and reset for new order
        setCartItems([]);
        setCurrentOrder(null);
      } else {
        alert('Error saving order: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error saving order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
  };

  const handleSaveEdit = (itemId: string) => {
    setEditingItemId(null);
  };

  const updateCartItem = (itemId: string, field: keyof CartItem, value: any) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'cost_price') {
          updated.line_total = updated.quantity * updated.cost_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeCartItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    if (window.confirm('Are you sure you want to clear the cart? This action cannot be undone.')) {
      setCartItems([]);
    }
  };

  const startNewOrder = () => {
    if (cartItems.length > 0) {
      const confirmClear = window.confirm('Starting a new order will clear the current cart. Are you sure?');
      if (!confirmClear) return;
    }

    setCartItems([]);
    setCurrentOrder(null);
    setCreateOrderDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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
            <DialogContent className="w-full max-w-fit p-6">
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new purchase order
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select
                      value={orderFormData.supplier_id}
                      onValueChange={(value) => setOrderFormData(prev => ({ ...prev, supplier_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{supplier.name}</span>
                              <span className="text-sm text-gray-500">{supplier.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="order_date">Order Date *</Label>
                    <Input
                      id="order_date"
                      type="date"
                      value={orderFormData.order_date}
                      onChange={(e) => setOrderFormData(prev => ({ ...prev, order_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expected_date">Expected Delivery Date</Label>
                    <Input
                      id="expected_date"
                      type="date"
                      value={orderFormData.expected_date}
                      onChange={(e) => setOrderFormData(prev => ({ ...prev, expected_date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={orderFormData.status}
                      onValueChange={(value) => setOrderFormData(prev => ({ ...prev, status: value as 'PENDING' | 'RECEIVED' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Order notes..."
                    value={orderFormData.notes}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Order'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          // Only show View Cart button after order is created
          <Dialog open={cartViewDialogOpen} onOpenChange={setCartViewDialogOpen} >
            <DialogTrigger asChild>
              <Button variant="outline" className="relative">
                <ShoppingCart className="w-4 h-4 mr-2" />
                View Cart
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {cartItems.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-6xl sm:max-w-3xl rounded-2xl p-0">
              <DialogHeader>
                <DialogTitle>Purchase Order Cart</DialogTitle>
                <DialogDescription>
                  Order #{currentOrder?.order_number} - {currentOrder?.supplier_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No items in cart</p>
                    <p className="text-sm mt-2">Add products from the product table to start building your order</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost Price</TableHead>
                          {currentOrder?.status === 'RECEIVED' && (
                            <>
                              <TableHead>Wholesale</TableHead>
                              <TableHead>Retail</TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead>Expiry</TableHead>
                            </>
                          )}
                          <TableHead>Line Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product.name}</div>
                                {item.product.model && (
                                  <div className="text-sm text-gray-500">Model: {item.product.model}</div>
                                )}
                                {item.product.sku && (
                                  <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                                )}
                                {item.product.brand && (
                                  <div className="text-sm text-gray-500">Brand: {item.product.brand.name}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {editingItemId === item.id ? (
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-20"
                                />
                              ) : (
                                item.quantity
                              )}
                            </TableCell>
                            <TableCell>
                              {editingItemId === item.id ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.cost_price}
                                  onChange={(e) => updateCartItem(item.id, 'cost_price', parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                />
                              ) : (
                                formatCurrency(item.cost_price)
                              )}
                            </TableCell>
                            {currentOrder?.status === 'RECEIVED' && (
                              <>
                                <TableCell>
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.wholesale_price || 0}
                                      onChange={(e) => updateCartItem(item.id, 'wholesale_price', parseFloat(e.target.value) || 0)}
                                      className="w-24"
                                    />
                                  ) : (
                                    formatCurrency(item.wholesale_price || 0)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={item.retail_price}
                                      onChange={(e) => updateCartItem(item.id, 'retail_price', parseFloat(e.target.value) || 0)}
                                      className="w-24"
                                    />
                                  ) : (
                                    formatCurrency(item.retail_price)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="text"
                                      value={item.batch_number || ''}
                                      onChange={(e) => updateCartItem(item.id, 'batch_number', e.target.value)}
                                      className="w-24"
                                    />
                                  ) : (
                                    item.batch_number || '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingItemId === item.id ? (
                                    <Input
                                      type="date"
                                      value={item.expiry_date || ''}
                                      onChange={(e) => updateCartItem(item.id, 'expiry_date', e.target.value)}
                                      className="w-36"
                                    />
                                  ) : (
                                    item.expiry_date || '-'
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="font-medium">{formatCurrency(item.line_total)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {editingItemId === item.id ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(item.id)}
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditItem(item.id)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeCartItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax (10%):</span>
                            <span>{formatCurrency(taxAmount)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-semibold border-t pt-2">
                            <span>Total:</span>
                            <span>{formatCurrency(totalAmount)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-6">
                          <Button variant="outline" onClick={clearCart}>
                            Clear Cart
                          </Button>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={startNewOrder}>
                              New Order
                            </Button>
                            <Button onClick={handleSaveOrder} disabled={loading}>
                              {loading ? 'Finalizing...' : 'Finalize Order'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default PurchaseCart;