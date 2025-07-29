import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Minus } from 'lucide-react'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  label?: string
  step?: number
}

export function QuantitySelector({ 
  value, 
  onChange, 
  min = 1, 
  max, 
  label = "Quantity",
  step = 1 
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    onChange(Math.max(min, value - step))
  }

  const handleIncrease = () => {
    onChange(Math.min(max, value + step))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min
    onChange(Math.max(min, Math.min(max, newValue)))
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecrease}
          disabled={value <= min}
          className="h-9 w-9 p-0"
        >
          <Minus className="w-3 h-3" />
        </Button>
        
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="w-20 text-center h-9"
          min={min}
          max={max}
          step={step}
        />
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleIncrease}
          disabled={value >= max}
          className="h-9 w-9 p-0"
        >
          <Plus className="w-3 h-3" />
        </Button>
        
        <span className="text-sm text-muted-foreground ml-2">
          / {max}
        </span>
      </div>
    </div>
  )
}