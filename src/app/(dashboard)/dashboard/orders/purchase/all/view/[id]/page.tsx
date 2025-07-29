"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Printer, 
  Package, 
  Calendar, 
  User, 
  Building, 
  Phone, 
  Mail,
  FileText,
  Barcode,
  Eye,
  Download,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface Barcode {
  id: string;
  code: string;
  type: string;
  status: string;
  purchased_at: string;
  purchase_cost: number;
  condition: string;
  warranty_expiry: string | null;
  location_branch: string | null;
  notes: string | null;
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity_ordered: number;
  quantity_received: number;
  cost_price: number;
  wholesale_price: number | null;
  retail_price: number;
  line_total: number;
  batch_number: string | null;
  expiry_date: string | null;
  barcodes: Barcode[];
}

interface PurchaseOrderDetails {
  id: string;
  order_number: string;
  invoice_number: string | null;
  supplier_name: string;
  supplier_code: string;
  supplier_contact: string | null;
  supplier_phone: string | null;
  supplier_email: string | null;
  purchased_by_name: string | null;
  branch_name: string | null;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
}

const PurchaseOrderDetailsPage = () => {
  const params = useParams();
  const id = params.id as string;
  
  const [orderDetails, setOrderDetails] = useState<PurchaseOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch purchase order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/purchase-orders/${id}`);
        const result = await response.json();
        
        if (result.success) {
          setOrderDetails(result.data);
        } else {
          setError(result.message || 'Failed to fetch order details');
        }
      } catch (err) {
        setError('An error occurred while fetching order details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Print barcodes for a specific item
  const printItemBarcodes = (item: PurchaseOrderItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcodes - ${item.product_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .barcode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .barcode-item { border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; }
            .barcode-code { font-family: monospace; font-size: 14px; font-weight: bold; margin: 5px 0; }
            .details { font-size: 10px; color: #666; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Item Barcodes</h2>
            <p><strong>Product:</strong> ${item.product_name} (${item.product_code})</p>
            <p><strong>Order:</strong> ${orderDetails?.order_number} | <strong>Batch:</strong> ${item.batch_number || 'N/A'}</p>
          </div>
          
          <div class="barcode-grid">
            ${item.barcodes.map(barcode => `
              <div class="barcode-item">
                <div class="barcode-code">${barcode.code}</div>
                <div class="details">
                  <div>Status: ${barcode.status}</div>
                  <div>Condition: ${barcode.condition}</div>
                  <div>Cost: ${formatCurrency(barcode.purchase_cost)}</div>
                  ${barcode.location_branch ? `<div>Location: ${barcode.location_branch}</div>` : ''}
                  ${barcode.warranty_expiry ? `<div>Warranty: ${formatDate(barcode.warranty_expiry)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Print all barcodes
  const printAllBarcodes = () => {
    if (!orderDetails) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const allBarcodes = orderDetails.items.flatMap(item => 
      item.barcodes.map(barcode => ({ ...barcode, product: item }))
    );

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Barcodes - ${orderDetails.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .barcode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .barcode-item { border: 1px solid #ccc; padding: 8px; text-align: center; page-break-inside: avoid; }
            .barcode-code { font-family: monospace; font-size: 12px; font-weight: bold; margin: 3px 0; }
            .product-name { font-size: 10px; font-weight: bold; color: #333; margin-bottom: 3px; }
            .details { font-size: 9px; color: #666; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Purchase Order Barcodes</h2>
            <p><strong>Order Number:</strong> ${orderDetails.order_number}</p>
            <p><strong>Supplier:</strong> ${orderDetails.supplier_name}</p>
            <p><strong>Total Barcodes:</strong> ${allBarcodes.length}</p>
          </div>
          
          <div class="barcode-grid">
            ${allBarcodes.map(({ product, ...barcode }) => `
              <div class="barcode-item">
                <div class="product-name">${product.product_name}</div>
                <div class="barcode-code">${barcode.code}</div>
                <div class="details">
                  <div>${barcode.status} | ${barcode.condition}</div>
                  <div>${formatCurrency(barcode.purchase_cost)}</div>
                </div>
              </div>
            `).join('')}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading purchase order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Purchase order not found</p>
      </div>
    );
  }

  const totalBarcodes = orderDetails.items.reduce((sum, item) => sum + item.barcodes.length, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Purchase Order Details</h1>
          <p className="text-muted-foreground">Order #{orderDetails.order_number}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printAllBarcodes} disabled={totalBarcodes === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print All Barcodes ({totalBarcodes})
          </Button>
        </div>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Order Number</p>
                <p className="text-sm text-muted-foreground">{orderDetails.order_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge className={getStatusColor(orderDetails.status)}>
                  {orderDetails.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Invoice Number</p>
                <p className="text-sm text-muted-foreground">{orderDetails.invoice_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Order Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(orderDetails.order_date)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Expected Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(orderDetails.expected_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Received Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(orderDetails.received_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Supplier & Branch Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Supplier</p>
              <p className="text-sm text-muted-foreground">
                {orderDetails.supplier_name} ({orderDetails.supplier_code})
              </p>
            </div>
            
            {orderDetails.supplier_contact && (
              <div>
                <p className="text-sm font-medium">Contact Person</p>
                <p className="text-sm text-muted-foreground">{orderDetails.supplier_contact}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {orderDetails.supplier_phone && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="text-sm text-muted-foreground">{orderDetails.supplier_phone}</p>
                </div>
              )}
              
              {orderDetails.supplier_email && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="text-sm text-muted-foreground">{orderDetails.supplier_email}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Purchased By</p>
                <p className="text-sm text-muted-foreground">{orderDetails.purchased_by_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Branch</p>
                <p className="text-sm text-muted-foreground">{orderDetails.branch_name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(orderDetails.subtotal)}</p>
              <p className="text-sm text-muted-foreground">Subtotal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(orderDetails.tax_amount)}</p>
              <p className="text-sm text-muted-foreground">Tax</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(orderDetails.total_amount)}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({orderDetails.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Qty Ordered</TableHead>
                <TableHead>Qty Received</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Retail Price</TableHead>
                <TableHead>Barcodes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderDetails.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">{item.product_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{item.batch_number || 'N/A'}</p>
                      {item.expiry_date && (
                        <p className="text-sm text-muted-foreground">
                          Exp: {formatDate(item.expiry_date)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity_ordered}</TableCell>
                  <TableCell>{item.quantity_received}</TableCell>
                  <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                  <TableCell>{formatCurrency(item.retail_price)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.barcodes.length} codes
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              Barcodes for {item.product_name}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Barcode</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Condition</TableHead>
                                  <TableHead>Cost</TableHead>
                                  <TableHead>Location</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.barcodes.map((barcode) => (
                                  <TableRow key={barcode.id}>
                                    <TableCell className="font-mono">
                                      {barcode.code}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {barcode.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{barcode.condition}</TableCell>
                                    <TableCell>{formatCurrency(barcode.purchase_cost)}</TableCell>
                                    <TableCell>{barcode.location_branch || 'N/A'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => printItemBarcodes(item)}
                        disabled={item.barcodes.length === 0}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Print ({item.barcodes.length})
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      {orderDetails.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orderDetails.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PurchaseOrderDetailsPage;