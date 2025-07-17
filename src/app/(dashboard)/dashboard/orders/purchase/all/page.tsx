"use client"
import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Package, Building, User, ChevronDown, X, Edit, Trash2, Eye, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Types
interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  notes?: string;
  expected_delivery_date?: string;
  created_at: string;
  supplier_name: string;
  supplier_code: string;
  total_items: number;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

// Mock data for demo
const mockSuppliers: Supplier[] = [
  { id: '1', name: 'ABC Electronics', code: 'ABC001', is_active: true },
  { id: '2', name: 'XYZ Components', code: 'XYZ002', is_active: true },
  { id: '3', name: 'Tech Solutions Ltd', code: 'TSL003', is_active: true },
];

const mockProducts: Product[] = [
  { id: '1', name: 'Laptop Dell Inspiron', code: 'DELL001', is_active: true },
  { id: '2', name: 'Mouse Wireless', code: 'MSE001', is_active: true },
  { id: '3', name: 'Keyboard Mechanical', code: 'KBD001', is_active: true },
  { id: '4', name: 'Monitor 24 inch', code: 'MON001', is_active: true },
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    order_number: 'PO000001',
    total_amount: 15000.00,
    status: 'PENDING',
    supplier_name: 'ABC Electronics',
    supplier_code: 'ABC001',
    total_items: 3,
    created_at: '2024-01-15T10:30:00Z',
    expected_delivery_date: '2024-01-25T00:00:00Z'
  },
  {
    id: '2',
    order_number: 'PO000002',
    total_amount: 8500.00,
    status: 'APPROVED',
    supplier_name: 'XYZ Components',
    supplier_code: 'XYZ002',
    total_items: 2,
    created_at: '2024-01-14T14:20:00Z'
  },
  {
    id: '3',
    order_number: 'PO000003',
    total_amount: 22000.00,
    status: 'RECEIVED',
    supplier_name: 'Tech Solutions Ltd',
    supplier_code: 'TSL003',
    total_items: 5,
    created_at: '2024-01-12T09:15:00Z'
  }
];

const PurchaseOrdersPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    supplier_id: '',
    notes: '',
    expected_delivery_date: ''
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([{
    product_id: '',
    quantity: 1,
    cost_price: 0,
    wholesale_price: 0,
    retail_price: 0,
    notes: ''
  }]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'APPROVED': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'RECEIVED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'CANCELLED': { color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      cost_price: 0,
      wholesale_price: 0,
      retail_price: 0,
      notes: ''
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!formData.supplier_id) {
        throw new Error('Please select a supplier');
      }

      if (items.some(item => !item.product_id || item.quantity <= 0 || item.cost_price <= 0 || item.retail_price <= 0)) {
        throw new Error('Please fill in all required item fields');
      }

      // In a real app, you would make an API call here
      const newOrder: PurchaseOrder = {
        id: String(Date.now()),
        order_number: `PO${String(purchaseOrders.length + 1).padStart(6, '0')}`,
        total_amount: getTotalAmount(),
        status: 'PENDING',
        supplier_name: suppliers.find(s => s.id === formData.supplier_id)?.name || '',
        supplier_code: suppliers.find(s => s.id === formData.supplier_id)?.code || '',
        total_items: items.length,
        created_at: new Date().toISOString(),
        notes: formData.notes,
        expected_delivery_date: formData.expected_delivery_date
      };

      setPurchaseOrders([newOrder, ...purchaseOrders]);
      setSuccess('Purchase order created successfully!');
      
      // Reset form
      setFormData({ supplier_id: '', notes: '', expected_delivery_date: '' });
      setItems([{
        product_id: '',
        quantity: 1,
        cost_price: 0,
        wholesale_price: 0,
        retail_price: 0,
        notes: ''
      }]);
      
      setIsCreateDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = purchaseOrders.filter(order =>
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-gray-600">Manage purchase orders and track deliveries</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>
                Fill in the details below to create a new purchase order.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select 
                    value={formData.supplier_id} 
                    onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-lg font-semibold">Items</Label>
                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-6 gap-4">
                          <div className="col-span-2">
                            <Label>Product *</Label>
                            <Select 
                              value={item.product_id} 
                              onValueChange={(value) => updateItem(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Cost Price *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost_price}
                              onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Wholesale Price</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.wholesale_price || ''}
                              onChange={(e) => updateItem(index, 'wholesale_price', parseFloat(e.target.value) || undefined)}
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Retail Price *</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.retail_price}
                              onChange={(e) => updateItem(index, 'retail_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          
                          <div>
                            <Label>Notes</Label>
                            <Input
                              value={item.notes || ''}
                              onChange={(e) => updateItem(index, 'notes', e.target.value)}
                              placeholder="Optional notes for this item"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${getTotalAmount().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional notes for this purchase order"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Purchase Order'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} purchase order(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.supplier_name}</div>
                      <div className="text-sm text-gray-500">{order.supplier_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{order.total_items} items</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${order.total_amount.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {order.expected_delivery_date ? 
                      new Date(order.expected_delivery_date).toLocaleDateString() : 
                      'Not specified'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrdersPage;