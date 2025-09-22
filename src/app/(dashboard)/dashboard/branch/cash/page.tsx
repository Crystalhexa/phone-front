"use client"
import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  Calendar,
  Package,
  DollarSign,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { ReceiptPrinter, type ReceiptData } from '@/lib/utils/print'
import { useAuth } from '@/hooks/useAuth'
import { PaymentDialog } from '@/components/PaymentDialog'

interface PendingSalesOrderItem {
  id: string
  product_id: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  is_wholesale_price: boolean
  warranty_expiry: string | null
  line_count: number
  quantity_breakdown: string
}

interface PendingSalesOrder {
  id: string
  order_number: string
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  customer_type: string
  customer_number: string
  branch_id: string
  branch_name: string
  sold_by: string
  sold_by_name: string
  order_date: string
  status: string
  payment_status: string
  running_balance: number
  subtotal: number
  total_amount: number
  balance_due: number
  discount: number
  notes: string
  created_at: string
  updated_at: string
  items: PendingSalesOrderItem[]
}

interface PaymentData {
  orderId: string
  paymentMethod: 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE' | 'BANK_TRANSFER'
  amount: number
  received_amount: number
  change_amount: number
  reference?: string
  notes?: string
}

interface PaymentResponse {
  success: boolean
  message?: string
  data?: {
    payment_id: string
    payment_number: string
    order: PendingSalesOrder
  }
}

const CashierPaymentComponent = () => {
  const [orders, setOrders] = useState<PendingSalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PendingSalesOrder | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData>({
    orderId: '',
    paymentMethod: 'CASH',
    amount: 0,
    received_amount: 0,
    change_amount: 0,
    reference: '',
    notes: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const { user } = useAuth();

  // Auto-hide alerts after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Calculate change amount when received amount or payment amount changes
  useEffect(() => {
    const change = paymentData.received_amount - paymentData.amount
    setPaymentData(prev => ({
      ...prev,
      change_amount: change > 0 ? change : 0
    }))
  }, [paymentData.received_amount, paymentData.amount])

  // Update payment data when selected order or payment method changes
  useEffect(() => {
    if (selectedOrder) {
      setPaymentData(prev => ({
        ...prev,
        orderId: selectedOrder.id,
        amount: selectedOrder.balance_due, // Use balance_due instead of total_amount
        received_amount: prev.paymentMethod === 'CASH' ? selectedOrder.balance_due : 0
      }))
    }
  }, [selectedOrder])

  // Reset received amount when payment method changes
  useEffect(() => {
    if (selectedOrder) {
      setPaymentData(prev => ({
        ...prev,
        received_amount: paymentData.paymentMethod === 'CASH' ? prev.amount : 0,
        reference: paymentData.paymentMethod === 'CASH' ? '' : prev.reference
      }))
    }
  }, [paymentData.paymentMethod, selectedOrder])

  // Fetch pending orders
  const fetchOrders = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        sortBy: 'order_date',
        sortOrder: 'DESC'
      })

      const response = await fetch(`/api/sales-orders/branch-wise?${params}`)
      const result = await response.json()

      if (result.success) {
        setOrders(result.data.orders)
        setTotalPages(Math.ceil(result.data.total_count / 10))
      } else {
        setAlert({ type: 'error', message: result.message })
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to fetch pending orders' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders(currentPage, searchTerm)
  }, [currentPage])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1)
        fetchOrders(1, searchTerm)
      } else {
        fetchOrders(currentPage, '')
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, currentPage])


  // Generate receipt data from order and payment
  const generateReceiptData = (
    order: PendingSalesOrder,
    payment: { payment_number: string }
  ): ReceiptData => {

    const paymentMethodMap = {
      'CASH': 'Cash',
      'CREDIT_CARD': 'credit card payment',
      'DEBIT_CARD': 'debit card payment',
      'MOBILE': 'Mobile Payment',
      'BANK_TRANSFER': 'Bank Transfer'
    }

    return {
      orderNumber: order.order_number,
      paymentNumber: payment.payment_number,
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      customerName: order.customer_name,
      customerNumber: order.customer_number,
      items: order.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.line_total
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total_amount,
      paymentMethod: paymentMethodMap[paymentData.paymentMethod],
      sales_ref: order.sold_by,
      sales_ref_name: order.sold_by_name,
      paymentDetails: {
        amountPaid: paymentData.amount,
        receivedAmount: paymentData.paymentMethod === 'CASH' ? paymentData.received_amount : paymentData.amount,
        changeGiven: paymentData.paymentMethod === 'CASH' ? paymentData.change_amount : 0,
        reference: paymentData.reference || undefined
      }
    }
  }
  const isPaymentValid = () => {
    if (paymentData.amount <= 0) return false
    if (paymentData.paymentMethod === 'CASH' && paymentData.received_amount < paymentData.amount) return false
    if (paymentData.paymentMethod !== 'CASH' && !paymentData.reference?.trim()) return false
    return true
  }

  // Handle payment processing
  const handlePayment = async () => {
    if (!selectedOrder || !isPaymentValid()) return
    try {
      setProcessing(true)
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...paymentData,
          order_id: selectedOrder.customer_id ? null : selectedOrder.id,
          customer_id: selectedOrder.customer_id,
          branch_id: selectedOrder.branch_id,
        })
      })

      const result: PaymentResponse = await response.json()

      if (result.success && result.data) {
        setAlert({ type: 'success', message: 'Payment processed successfully!' })

        // Generate and print receipt
        if (user) {
          try {
            const receiptData = generateReceiptData(selectedOrder, result.data)
            ReceiptPrinter.printReceipt(receiptData, user)

          } catch (printError) {
            console.error('Failed to print receipt:', printError)
            setAlert({ type: 'success', message: 'Payment processed successfully! (Receipt printing failed)' })
          }
        }

        setShowPaymentDialog(false)
        setSelectedOrder(null)
        // Refresh orders list
        fetchOrders(currentPage, searchTerm)
        // Reset payment form
        resetPaymentForm()
      } else {
        setAlert({ type: 'error', message: result.message || 'Payment processing failed' })
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to process payment' })
    } finally {
      setProcessing(false)
    }
  }

  const resetPaymentForm = () => {
    setPaymentData({
      orderId: '',
      paymentMethod: 'CASH',
      amount: 0,
      received_amount: 0,
      change_amount: 0,
      reference: '',
      notes: ''
    })
  }

  const openPaymentDialog = (order: PendingSalesOrder) => {
    setSelectedOrder(order)
    setShowPaymentDialog(true)
  }

  const haddOrderToCustomerAccount = (order: PendingSalesOrder) => {
    try {
      const response = fetch('/api/sales-orders/add_to_account', {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify({
          order_id: order.id,
          customer_id: order.customer_id
        })
      }
      ).then(res => res.json());


    } catch (error) {

    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Example: "/" key OR Ctrl+K to focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      {/* Header */}

      {/* Alert */}
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-destructive' : 'border-green-500'}>
          {alert.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}  // 👈 attach ref
              placeholder="Search by order number, customer name, phone, or employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading pending orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending orders found</p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold">
                      Order #{order.order_number}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(order.order_date)}
                      </div>
                      {order.customer_name && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {order.customer_name}
                        </div>
                      )}
                      {order.sold_by_name && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Sold by: {order.sold_by_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{order.status}</Badge>
                    <Badge variant="destructive">{order.payment_status}</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Customer Info */}
                {order.customer_name && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Customer</Label>
                      <p className="font-medium">{order.customer_name}</p>
                    </div>
                    {order.customer_phone && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="font-medium">{order.customer_phone}</p>
                      </div>
                    )}
                    {order.customer_type && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <Badge variant="outline">{order.customer_type}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Items</Label>
                    <p className="font-semibold">{order.items.length} items</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subtotal</Label>
                    <p className="font-semibold">{formatCurrency(order.subtotal)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Amount</Label>
                    <p className="font-semibold text-lg">{formatCurrency(order.total_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Balance Due</Label>
                    <p className="font-bold text-lg text-destructive">{formatCurrency(order.balance_due)}</p>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Order Items</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                        <div>
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.line_total)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Order Details - #{order.order_number}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4">
                          {/* Customer Details */}
                          {order.customer_name && (
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base">Customer Information</CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Name</Label>
                                  <p>{order.customer_name}</p>
                                </div>
                                {order.customer_phone && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Phone</Label>
                                    <p>{order.customer_phone}</p>
                                  </div>
                                )}
                                {order.customer_email && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Email</Label>
                                    <p>{order.customer_email}</p>
                                  </div>
                                )}
                                {order.customer_type && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Type</Label>
                                    <Badge variant="outline">{order.customer_type}</Badge>
                                  </div>
                                )}
                                {order.sold_by_name && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Sold By</Label>
                                    <p>{order.sold_by_name}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Order Items */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Order Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                                    <div className="flex-1">
                                      <p className="font-medium">{item.product_name}</p>
                                      <p className="text-sm text-muted-foreground">Code: {item.product_code}</p>
                                      <div className="flex items-center gap-4 mt-1 text-sm">
                                        <span>Qty: {item.quantity}</span>
                                        <span>Unit: {formatCurrency(item.unit_price)}</span>
                                        {item.discount > 0 && (
                                          <span className="text-green-600">Discount: {formatCurrency(item.discount)}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                                      {item.is_wholesale_price && (
                                        <Badge variant="secondary" className="text-xs">Wholesale</Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Order Summary */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                {order.discount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(order.discount)}</span>
                                  </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-semibold text-lg">
                                  <span>Total Amount</span>
                                  <span>{formatCurrency(order.total_amount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg text-destructive">
                                  <span>Balance Due</span>
                                  <span>{formatCurrency(order.balance_due)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                  {order.customer_id ? (
                    <Button
                      onClick={() => haddOrderToCustomerAccount(order)}
                      className="flex-1"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Add order to customer account and print recipt
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openPaymentDialog(order)}
                      className="flex-1"
                      disabled={order.balance_due <= 0}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Process Payment
                    </Button>)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        order={selectedOrder}
        paymentData={paymentData}
        setPaymentData={setPaymentData}
        onSubmit={handlePayment}
        onCancel={() => {
          setSelectedOrder(null)
          resetPaymentForm()
          setShowPaymentDialog(false)
        }}
        processing={processing}
        isPaymentValid={isPaymentValid}
        formatCurrency={formatCurrency}
      />

    </div>
  )
}

export default CashierPaymentComponent