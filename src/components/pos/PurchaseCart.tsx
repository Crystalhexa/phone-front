import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Calendar,
  User,
  FileText,
  DollarSign,
  X
} from 'lucide-react';

// Types based on your schema
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

interface PurchaseOrderData {
  supplier_id: string;
  branch_id: string;
  expected_date?: string;
  status: 'PENDING' | 'RECEIVED';
  notes?: string;
  items: CartItem[];
}

interface PurchaseCartProps {
  onAddToCart: (product: any) => void;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export const PurchaseCart: React.FC<PurchaseCartProps> = ({
  onAddToCart,
  cartItems,
  setCartItems
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [orderData, setOrderData] = useState<Partial<PurchaseOrderData>>({
    branch_id: 'cmd7qdjga000fhjeu18ubhpnf', // Default branch
    status: 'PENDING',
    expected_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

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

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
  const taxAmount = subtotal * 0.1; // 10% tax
  const totalAmount = subtotal + taxAmount;

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            quantity: newQuantity,
            line_total: newQuantity * item.cost_price
          }
        : item
    ));
  };

  const updateItemPrice = (itemId: string, field: 'cost_price' | 'wholesale_price' | 'retail_price', value: number) => {
    setCartItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            [field]: value,
            line_total: field === 'cost_price' ? item.quantity * value : item.line_total
          }
        : item
    ));
  };

  const updateItemBatch = (itemId: string, field: 'batch_number' | 'expiry_date', value: string) => {
    setCartItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  const removeItem = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const handleSubmitOrder = async () => {
    if (!selectedSupplier || cartItems.length === 0) {
      alert('Please select a supplier and add items to cart');
      return;
    }

    setLoading(true);
    try {
      const purchaseOrderData = {
        supplier_id: selectedSupplier,
        branch_id: orderData.branch_id,
        expected_date: orderData.expected_date || undefined,
        status: orderData.status,
        notes: orderData.notes,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity_ordered: item.quantity,
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
        body: JSON.stringify(purchaseOrderData)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Purchase order created successfully! Order number: ${result.data.order_number}`);
        clearCart();
        setSelectedSupplier('');
        setOrderData({
          branch_id: 'cmd7qdjga000fhjeu18ubhpnf',
          status: 'PENDING',
          expected_date: '',
          notes: ''
        });
        setIsOpen(false);
      } else {
        alert('Error creating purchase order: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Error submitting order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Purchase Cart
          {cartItems.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
              {cartItems.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-2xl sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Purchase Order Cart
          </SheetTitle>
          <SheetDescription>
            Add products to create a purchase order for inventory restocking
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Supplier Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Select Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose supplier" />
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
                  <Label htmlFor="expected_date">Expected Delivery Date</Label>
                  <Input
                    id="expected_date"
                    type="date"
                    value={orderData.expected_date}
                    onChange={(e) => setOrderData(prev => ({ ...prev, expected_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Order Status</Label>
                  <Select 
                    value={orderData.status} 
                    onValueChange={(value) => setOrderData(prev => ({ ...prev, status: value as 'PENDING' | 'RECEIVED' }))}
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

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Order notes..."
                    value={orderData.notes}
                    onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart Items ({cartItems.length})
              </CardTitle>
              {cartItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  Clear Cart
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No items in cart</p>
                  <p className="text-sm">Add products from the table to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product.name}</h4>
                          {item.product.model && (
                            <p className="text-sm text-gray-500">Model: {item.product.model}</p>
                          )}
                          {item.product.sku && (
                            <p className="text-sm text-gray-500">SKU: {item.product.sku}</p>
                          )}
                          {item.product.brand && (
                            <p className="text-sm text-gray-500">Brand: {item.product.brand.name}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Cost Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.cost_price}
                            onChange={(e) => updateItemPrice(item.id, 'cost_price', parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Wholesale Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.wholesale_price || ''}
                            onChange={(e) => updateItemPrice(item.id, 'wholesale_price', parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Retail Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.retail_price}
                            onChange={(e) => updateItemPrice(item.id, 'retail_price', parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Batch Number</Label>
                          <Input
                            type="text"
                            value={item.batch_number || ''}
                            onChange={(e) => updateItemBatch(item.id, 'batch_number', e.target.value)}
                            placeholder="Optional batch number"
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Expiry Date</Label>
                          <Input
                            type="date"
                            value={item.expiry_date || ''}
                            onChange={(e) => updateItemBatch(item.id, 'expiry_date', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-gray-500">Line Total:</span>
                        <span className="font-medium">{formatCurrency(item.line_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          {cartItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (10%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button 
                    onClick={handleSubmitOrder} 
                    disabled={loading || !selectedSupplier || cartItems.length === 0}
                    className="flex-1"
                  >
                    {loading ? 'Processing...' : 'Place Purchase Order'}
                  </Button>
                  <Button variant="outline" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};