import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Percent, DollarSign } from 'lucide-react'

interface DiscountCalculatorProps {
  originalAmount: number
  currentDiscount: number
  onDiscountChange: (discount: number) => void
  maxDiscount?: number
}

export function DiscountCalculator({ 
  originalAmount, 
  currentDiscount, 
  onDiscountChange,
  maxDiscount = originalAmount
}: DiscountCalculatorProps) {
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [discountValue, setDiscountValue] = useState(currentDiscount)

  const calculateDiscount = (value: number, type: 'amount' | 'percentage') => {
    if (type === 'percentage') {
      return (originalAmount * value) / 100
    }
    return value
  }

  const handleDiscountChange = (value: number) => {
    setDiscountValue(value)
    const discountAmount = calculateDiscount(value, discountType)
    const finalDiscount = Math.min(Math.max(0, discountAmount), maxDiscount)
    onDiscountChange(finalDiscount)
  }

  const currentPercentage = originalAmount > 0 ? (currentDiscount / originalAmount) * 100 : 0
  const finalAmount = originalAmount - currentDiscount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Discount Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Original Amount:</span>
            <div className="font-bold">Rs. {originalAmount.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Final Amount:</span>
            <div className="font-bold text-green-600">Rs. {finalAmount.toFixed(2)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Discount Type</Label>
          <Select value={discountType} onValueChange={(value: any) => setDiscountType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Fixed Amount
                </div>
              </SelectItem>
              <SelectItem value="percentage">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Percentage
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Discount {discountType === 'percentage' ? 'Percentage' : 'Amount'}
          </Label>
          <div className="flex items-center gap-2">
            {discountType === 'amount' && <span className="text-sm">Rs.</span>}
            <Input
              type="number"
              min="0"
              max={discountType === 'percentage' ? 100 : maxDiscount}
              step={discountType === 'percentage' ? 0.1 : 0.01}
              value={discountValue}
              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {discountType === 'percentage' && <span className="text-sm">%</span>}
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Discount Amount:</span>
            <span className="font-medium">Rs. {currentDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount Percentage:</span>
            <span className="font-medium">{currentPercentage.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>You Save:</span>
            <span className="text-green-600">Rs. {currentDiscount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDiscountChange(0)}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDiscountType('percentage')
              handleDiscountChange(5)
            }}
          >
            5%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDiscountType('percentage')
              handleDiscountChange(10)
            }}
          >
            10%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDiscountType('percentage')
              handleDiscountChange(15)
            }}
          >
            15%
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}