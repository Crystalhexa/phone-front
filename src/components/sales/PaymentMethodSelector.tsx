import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CreditCard, Banknote, Smartphone, Building2, FileText, Calendar, Clock } from 'lucide-react'

interface PaymentMethodSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  { value: 'MOBILE_PAYMENT', label: 'Mobile Payment', icon: Smartphone },
  { value: 'CREDIT', label: 'Credit', icon: Clock },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'INSTALLMENT', label: 'Installment', icon: Calendar },
]

export function PaymentMethodSelector({ 
  value, 
  onChange, 
  label = "Payment Method" 
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((method) => {
            const IconComponent = method.icon
            return (
              <SelectItem key={method.value} value={method.value}>
                <div className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  {method.label}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}