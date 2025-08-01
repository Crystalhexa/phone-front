import React, { useState, useEffect } from 'react'
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
  showPerItemCalculation?: boolean
  itemQuantity?: number
}

export function DiscountCalculator({ 
  originalAmount, 
  currentDiscount, 
  onDiscountChange,
  maxDiscount = originalAmount,
  showPerItemCalculation = false,
  itemQuantity = 1
}: DiscountCalculatorProps) {
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)

  // Update discount value when current discount changes
  useEffect(() => {
    if (discountType === 'amount') {
      setDiscountValue(currentDiscount)
    } else {
      const percentage = originalAmount > 0 ? (currentDiscount / originalAmount) * 100 : 0
      setDiscountValue(percentage)
    }
  }, [currentDiscount, originalAmount, discountType])

  const calculateDiscount = (value: number, type: 'amount' | 'percentage') => {
    if (type === 'percentage') {
      return (originalAmount * value) / 100
    }
    return value
  }

  const handleDiscountChange = (value: number) => {
    if (isNaN(value) || value < 0) {
      value = 0
    }

    // Validate limits
    if (discountType === 'percentage' && value > 100) {
      value = 100
    }
    if (discountType === 'amount' && value > maxDiscount) {
      value = maxDiscount
    }

    setDiscountValue(value)
    const discountAmount = calculateDiscount(value, discountType)
    const finalDiscount = Math.min(Math.max(0, discountAmount), maxDiscount)
    onDiscountChange(finalDiscount)
  }

  const handleDiscountTypeChange = (newType: 'amount' | 'percentage') => {
    setDiscountType(newType)
    
    // Convert current discount to new type
    if (newType === 'percentage') {
      const percentage = originalAmount > 0 ? (currentDiscount / originalAmount) * 100 : 0
      setDiscountValue(percentage)
    } else {
      setDiscountValue(currentDiscount)
    }
  }

  const currentPercentage = originalAmount > 0 ? (currentDiscount / originalAmount) * 100 : 0
  const finalAmount = originalAmount - currentDiscount
  const perItemDiscount = itemQuantity > 0 ? currentDiscount / itemQuantity : 0
  const perItemPercentage = originalAmount > 0 ? (perItemDiscount / (originalAmount / itemQuantity)) * 100 : 0

  const handleQuickDiscount = (percentage: number) => {
    setDiscountType('percentage')
    setDiscountValue(percentage)
    handleDiscountChange(percentage)
  }

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
          <Select value={discountType} onValueChange={handleDiscountTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Percentage (%)
                </div>
              </SelectItem>
              <SelectItem value="amount">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Fixed Amount (Rs.)
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
              className="flex-1"
            />
            {discountType === 'percentage' && <span className="text-sm">%</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {discountType === 'percentage' 
              ? `Max: 100%` 
              : `Max: Rs. ${maxDiscount.toFixed(2)}`
            }
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Discount Amount:</span>
            <span className="font-medium">Rs. {currentDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount Percentage:</span>
            <span className="font-medium">{currentPercentage.toFixed(1)}%</span>
          </div>
          
          {showPerItemCalculation && itemQuantity > 1 && (
            <>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Per Item Discount:</span>
                  <span>Rs. {perItemDiscount.toFixed(2)} ({perItemPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </>
          )}
          
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>You Save:</span>
            <span className="text-green-600">Rs. {currentDiscount.toFixed(2)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Quick Discounts</Label>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(0)}
              className="text-xs"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(5)}
              className="text-xs"
            >
              5%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(10)}
              className="text-xs"
            >
              10%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(15)}
              className="text-xs"
            >
              15%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(20)}
              className="text-xs"
            >
              20%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickDiscount(25)}
              className="text-xs"
            >
              25%
            </Button>
          </div>
        </div>

        {showPerItemCalculation && itemQuantity > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
            <div className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Item Breakdown (Quantity: {itemQuantity})
            </div>
            <div className="space-y-1 text-blue-700 dark:text-blue-300">
              <div className="flex justify-between">
                <span>Per Item Original:</span>
                <span>Rs. {(originalAmount / itemQuantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Per Item Discount:</span>
                <span>Rs. {perItemDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Per Item Final:</span>
                <span>Rs. {((originalAmount - currentDiscount) / itemQuantity).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}