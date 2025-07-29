import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Scan, Camera } from 'lucide-react'

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  onScan: () => void
  isScanning: boolean
  placeholder?: string
  autoFocus?: boolean
}

export function BarcodeInput({ 
  value, 
  onChange, 
  onScan, 
  isScanning, 
  placeholder = "Scan or enter barcode",
  autoFocus = true 
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onScan()
    }
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="font-mono pr-10"
          disabled={isScanning}
        />
        <Scan className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
      </div>
      <Button 
        onClick={onScan} 
        disabled={isScanning || !value.trim()}
        className="min-w-[80px]"
      >
        {isScanning ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden sm:inline">Scanning</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Scan className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </div>
        )}
      </Button>
    </div>
  )
}
