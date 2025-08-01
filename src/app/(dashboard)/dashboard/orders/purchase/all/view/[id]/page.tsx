// app/purchase-orders/[id]/page.tsx (Updated with Zebra Integration)
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Building,
  Phone,
  Mail,
  FileText,
  Eye,
  Loader2,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import ZebraPrinterManager from '@/components/barcode/ZebraPrinterManager';

// Types (same as before)
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
  const [selectedBarcodes, setSelectedBarcodes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

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

  // Convert barcodes to format expected by ZebraPrinterManager
  const convertBarcodesToPrintFormat = (barcodes: Barcode[], item?: PurchaseOrderItem) => {
    return barcodes.map(barcode => ({
      code: barcode.code,
      productName: item?.product_name || 'Unknown Product',
      price: item?.retail_price ?? 0,
      currency: 'LKR',
      status: barcode.status,
      batchNumber: item?.batch_number || undefined,
      expiryDate: item?.expiry_date || undefined
    }));
  };

  // Get all barcodes for printing
  const getAllBarcodes = () => {
    if (!orderDetails) return [];
    
    const allBarcodes: any[] = [];
    orderDetails.items.forEach((item) => {
      const convertedBarcodes = convertBarcodesToPrintFormat(item.barcodes, item);
      allBarcodes.push(...convertedBarcodes);
    });
    return allBarcodes;
  };

  // Get barcodes for specific item
  const getItemBarcodes = (item: PurchaseOrderItem) => {
    return convertBarcodesToPrintFormat(item.barcodes, item);
  };

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
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Order Overview</TabsTrigger>
          <TabsTrigger value="items">Items & Barcodes</TabsTrigger>
          <TabsTrigger value="printer">
            <Printer className="h-4 w-4 mr-2" />
            Zebra Printer ({totalBarcodes})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
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
                              <div className="mt-4">
                                <ZebraPrinterManager
                                  barcodes={getItemBarcodes(item)}
                                  onPrintSuccess={() => {
                                    console.log(`Successfully printed barcodes for ${item.product_name}`);
                                  }}
                                  onPrintError={(error) => {
                                    console.error('Print error:', error);
                                  }}
                                />
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBarcodes(getItemBarcodes(item));
                              setActiveTab('printer');
                            }}
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
        </TabsContent>

        {/* Zebra Printer Tab */}
        <TabsContent value="printer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Zebra Printer Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => setSelectedBarcodes(getAllBarcodes())}
                    disabled={totalBarcodes === 0}
                    variant="outline"
                  >
                    Select All Barcodes ({totalBarcodes})
                  </Button>
                  
                  <Button
                    onClick={() => setSelectedBarcodes([])}
                    disabled={selectedBarcodes.length === 0}
                    variant="outline"
                  >
                    Clear Selection
                  </Button>

                  {orderDetails.items.map((item) => (
                    <Button
                      key={item.id}
                      onClick={() => setSelectedBarcodes(getItemBarcodes(item))}
                      disabled={item.barcodes.length === 0}
                      variant="outline"
                      size="sm"
                    >
                      {item.product_name} ({item.barcodes.length})
                    </Button>
                  ))}
                </div>

                {/* Current Selection Info */}
                {selectedBarcodes.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 mb-2">
                      Current Selection
                    </div>
                    <div className="text-sm text-blue-700">
                      {selectedBarcodes.length} barcode(s) selected for printing
                    </div>
                    <div className="mt-2 space-y-1">
                      {selectedBarcodes.slice(0, 5).map((barcode, index) => (
                        <div key={index} className="text-xs text-blue-600">
                          • {barcode.productName} - {barcode.code} - LKR {barcode.price.toFixed(2)}
                        </div>
                      ))}
                      {selectedBarcodes.length > 5 && (
                        <div className="text-xs text-blue-600">
                          ... and {selectedBarcodes.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Zebra Printer Component */}
                <ZebraPrinterManager
                  barcodes={selectedBarcodes}
                  onPrintSuccess={() => {
                    console.log('Batch print successful');
                    // Optionally show a success notification
                  }}
                  onPrintError={(error) => {
                    console.error('Batch print error:', error);
                    // Optionally show an error notification
                  }}
                />

                {/* Print Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalBarcodes}</div>
                      <div className="text-xs text-muted-foreground">Total Barcodes</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedBarcodes.length}</div>
                      <div className="text-xs text-muted-foreground">Selected</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{orderDetails.items.length}</div>
                      <div className="text-xs text-muted-foreground">Products</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {Math.ceil(selectedBarcodes.length * 2)}s
                      </div>
                      <div className="text-xs text-muted-foreground">Est. Print Time</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Printing Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Settings className="h-4 w-4" />
                      Printing Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium">Before Printing:</div>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          <li>Ensure printer has sufficient labels</li>
                          <li>Check ribbon/thermal transfer ribbon</li>
                          <li>Verify printer is connected to network</li>
                          <li>Test print a single label first</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium">Label Specifications:</div>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          <li>2" × 1" - Standard retail labels</li>
                          <li>4" × 2" - Larger product labels</li>
                          <li>4" × 6" - Shipping/inventory labels</li>
                          <li>Supports thermal transfer and direct thermal</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchaseOrderDetailsPage;