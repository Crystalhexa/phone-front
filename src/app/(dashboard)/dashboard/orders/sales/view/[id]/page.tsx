"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  Printer,
  RefreshCcw,
  User,
  Building,
  Phone,
  Mail,
  FileText,
  Loader2,
  CreditCard,
  Package,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { SalesOrder } from '@/components/table/SalesOrderTable/useSalesOrderData';

const SalesOrderDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [orderDetails, setOrderDetails] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sales order details
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sales-orders/branch-wise/${id}`);
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
    return `Rs. ${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading sales order details...</p>
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
        <p>Sales order not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sales Order Details</h1>
            <p className="text-muted-foreground">Order #{orderDetails.order_number}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Process Return
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Order Overview</TabsTrigger>
          <TabsTrigger value="items">Items ({orderDetails.items?.length || 0})</TabsTrigger>
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
                    <p className="text-sm font-medium">Order Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(orderDetails.order_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Status</p>
                    <Badge className={getPaymentStatusColor(orderDetails.payment_status)}>
                      {orderDetails.payment_status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Payment Method</p>
                    <p className="text-sm text-muted-foreground">{orderDetails.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Branch</p>
                    <p className="text-sm text-muted-foreground">{orderDetails.branch_name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer & Sales Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">
                    {orderDetails.customer_name || 'Walk-in Customer'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {orderDetails.customer_phone && (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </p>
                      <p className="text-sm text-muted-foreground">{orderDetails.customer_phone}</p>
                    </div>
                  )}

                  {orderDetails.customer_email && (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </p>
                      <p className="text-sm text-muted-foreground">{orderDetails.customer_email}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium">Sales Person</p>
                  <p className="text-sm text-muted-foreground">
                    {orderDetails.employee_name || 'N/A'}
                    {orderDetails.employee_number && ` (${orderDetails.employee_number})`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(orderDetails.subtotal)}</p>
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(orderDetails.discount)}</p>
                  <p className="text-sm text-muted-foreground">Discount</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(orderDetails.total_amount)}</p>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
                {orderDetails.profit_amount !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(orderDetails.profit_amount)}</p>
                    <p className="text-sm text-muted-foreground">Profit</p>
                  </div>
                )}
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
              <CardTitle>Order Items ({orderDetails.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Warranty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.product_sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.brand_name || 'N/A'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-red-600">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.line_total)}</TableCell>
                      <TableCell className="text-green-600">
                        {item.line_profit !== undefined ? formatCurrency(item.line_profit) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {item.warranty_expiry ? formatDate(item.warranty_expiry) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesOrderDetailsPage;