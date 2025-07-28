'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Scan, Package, AlertTriangle } from 'lucide-react'
import { TransferAPI } from '@/lib/api'
import { ScannedProduct } from '@/types/transfer'

interface BarcodeScannerProps {
  onProductScanned: (product: ScannedProduct) => void
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onProductScanned }) => {
  const [barcode, setBarcode] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Optional: auto-scan if barcode input changes (simulate scanner input)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (barcode.trim().length > 3 && !isScanning) {
        handleScan()
      }
    }, 300) // adjust delay to match scanner speed

    return () => clearTimeout(timeout)
  }, [barcode])

  const handleScan = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode')
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const product = await TransferAPI.scanBarcode(barcode.trim())
      onProductScanned(product)
      setBarcode('')
      inputRef.current?.focus()
    } catch (err: any) {
      setError(err.message || 'Failed to scan barcode')
    } finally {
      setIsScanning(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleScan()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Scan Product
        </CardTitle>
        <CardDescription>
          Scan a barcode to add products to your transfer request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <div className="flex gap-2">
            <Input
              id="barcode"
              ref={inputRef}
              placeholder="Scan or enter barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isScanning}
            />
            <Button 
              onClick={handleScan} 
              disabled={isScanning || !barcode.trim()}
              className="shrink-0"
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {isScanning ? 'Scanning...' : 'Add'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
