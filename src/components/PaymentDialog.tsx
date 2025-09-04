import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Banknote, CreditCard, Smartphone, Receipt, DollarSign, AlertCircle, CheckCircle, Loader2 } from "lucide-react"

type Order = {
  order_number: string
  customer_id: string
  customer_name?: string
  balance_due: number
  running_balance: number
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

type PaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  paymentData: PaymentData
  setPaymentData: React.Dispatch<React.SetStateAction<PaymentData>>
  onSubmit: () => void
  onCancel?: () => void
  processing?: boolean
  isPaymentValid: () => boolean
  formatCurrency: (value: number) => string
}

export function PaymentDialog({
  open,
  onOpenChange,
  order,
  paymentData,
  setPaymentData,
  onSubmit,
  onCancel,
  processing = false,
  isPaymentValid,
  formatCurrency,
}: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Order Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Order Number:</span>
                    <span>{order.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Customer:</span>
                    <span>{order.customer_name || "Walk-in Customer"}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Amount Due:</span>
                    {order.customer_id ? <span className="text-destructive">{formatCurrency(order.running_balance)}</span> :
                      <span className="text-destructive">{formatCurrency(order.balance_due)}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value: PaymentData["paymentMethod"]) =>
                    setPaymentData(prev => ({ ...prev, paymentMethod: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center">
                        <Banknote className="w-4 h-4 mr-2" /> Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="CREDIT_CARD">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" /> Credit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="DEBIT_CARD">
                      <div className="flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" /> Debit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="MOBILE">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 mr-2" /> Mobile Payment
                      </div>
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      <div className="flex items-center">
                        <Receipt className="w-4 h-4 mr-2" /> Bank Transfer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount Paid</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  max={order.balance_due}
                  value={paymentData.amount || ""}
                  onChange={(e) =>
                    setPaymentData(prev => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              {paymentData.paymentMethod === "CASH" && (
                <div>
                  <Label htmlFor="received_amount">Amount Received</Label>
                  <Input
                    id="received_amount"
                    type="number"
                    min={paymentData.amount}
                    value={paymentData.received_amount || ""}
                    onChange={(e) =>
                      setPaymentData(prev => ({
                        ...prev,
                        received_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )}

              {paymentData.paymentMethod !== "CASH" && (
                <div>
                  <Label htmlFor="reference">Reference Number *</Label>
                  <Input
                    id="reference"
                    value={paymentData.reference || ""}
                    onChange={(e) =>
                      setPaymentData(prev => ({ ...prev, reference: e.target.value }))
                    }
                    placeholder="Transaction reference"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes || ""}
                  onChange={(e) =>
                    setPaymentData(prev => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Payment notes..."
                  rows={2}
                />
              </div>
            </div>

            {/* Change Calculation */}
            {paymentData.paymentMethod === "CASH" &&
              paymentData.change_amount &&
              paymentData.change_amount > 0 && (
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    Change to give: {formatCurrency(paymentData.change_amount)}
                  </AlertDescription>
                </Alert>
              )}

            {/* Validation Messages */}
            {paymentData.paymentMethod === "CASH" &&
              paymentData.received_amount! < paymentData.amount &&
              paymentData.received_amount! > 0 && (
                <Alert className="border-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Received amount must be at least {formatCurrency(paymentData.amount)}
                  </AlertDescription>
                </Alert>
              )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={onCancel || (() => onOpenChange(false))}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={onSubmit}
                disabled={processing || !isPaymentValid()}
                className="flex-1"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {processing ? "Processing..." : "Process Payment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
