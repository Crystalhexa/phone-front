import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Keyboard } from 'lucide-react'

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  onScan: () => void
  isScanning: boolean
  placeholder?: string
  autoFocus?: boolean
  autoScan?: boolean
  autoScanDelay?: number
  minBarcodeLength?: number
  allowManualEntry?: boolean
}

export function BarcodeInput({
  value,
  onChange,
  onScan,
  isScanning,
  placeholder = "Ready to scan barcode...",
  autoFocus = true,
  autoScan = true,
  autoScanDelay = 150,
  minBarcodeLength = 8,
  allowManualEntry = false
}: BarcodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autoScanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const inputTimestamps = useRef<number[]>([])
  const processingRef = useRef(false)

  useEffect(() => {
    if (autoFocus && inputRef.current && !isScanning) {
      inputRef.current.focus()
    }
  }, [autoFocus, isScanning])

  useEffect(() => {
    return () => {
      if (autoScanTimeoutRef.current) {
        clearTimeout(autoScanTimeoutRef.current)
      }
    }
  }, [])

  const detectBarcodeScanner = useCallback((inputValue: string) => {
    const now = Date.now()
    inputTimestamps.current.push(now)
    
    // Keep only recent timestamps (last 2 seconds)
    inputTimestamps.current = inputTimestamps.current.filter(ts => now - ts < 2000)
    
    // Barcode scanner detection criteria:
    // 1. Rapid input (typical scanner behavior)
    // 2. Sufficient length
    // 3. Not in manual entry mode
    const isRapidInput = inputTimestamps.current.length > 3 && 
                        (now - inputTimestamps.current[0]) < 500
    
    const isValidLength = inputValue.length >= minBarcodeLength
    
    const isLikelyScanner = isRapidInput || 
                           (inputValue.length > 12 && (now - inputTimestamps.current[0]) < 1000)

    return isValidLength && isLikelyScanner && !showManualEntry && autoScan
  }, [minBarcodeLength, showManualEntry, autoScan])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear existing timeout
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current)
      autoScanTimeoutRef.current = null
    }

    // Don't process if already scanning or processing
    if (isScanning || processingRef.current) return

    // Auto-scan detection
    if (newValue && detectBarcodeScanner(newValue)) {
      processingRef.current = true
      autoScanTimeoutRef.current = setTimeout(() => {
        onScan()
        processingRef.current = false
      }, autoScanDelay)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Clear auto-scan timeout on manual typing
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
      if (autoScanTimeoutRef.current) {
        clearTimeout(autoScanTimeoutRef.current)
        autoScanTimeoutRef.current = null
      }
      processingRef.current = false
    }

    // Handle Enter key
    if (e.key === 'Enter') {
      e.preventDefault()
      if (autoScanTimeoutRef.current) {
        clearTimeout(autoScanTimeoutRef.current)
        autoScanTimeoutRef.current = null
      }
      processingRef.current = false
      if (value.trim()) {
        onScan()
      }
    }

    // Toggle manual entry mode with F2
    if (allowManualEntry && e.key === 'F2') {
      e.preventDefault()
      setShowManualEntry(!showManualEntry)
    }
  }

  const handleManualSubmit = () => {
    if (value.trim()) {
      onScan()
    }
  }

  if (!allowManualEntry) {
    // Production mode - just the input field, no buttons
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isScanning ? "Processing..." : placeholder}
          disabled={isScanning}
          className={`font-mono transition-all duration-200 ${
            isScanning ? 'bg-blue-50 border-blue-200' : ''
          }`}
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-2.5">
          {isScanning ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : value && autoScanTimeoutRef.current ? (
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          ) : null}
        </div>
      </div>
    )
  }

  // Development/manual mode - includes manual entry options
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isScanning ? "Processing..." : placeholder}
          disabled={isScanning}
          className={`font-mono transition-all duration-200 ${
            isScanning ? 'bg-blue-50 border-blue-200' : ''
          } ${showManualEntry ? 'border-orange-200 bg-orange-50' : ''}`}
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-2.5">
          {isScanning ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : showManualEntry ? (
            <Keyboard className="w-4 h-4 text-orange-500" />
          ) : value && autoScanTimeoutRef.current ? (
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          ) : null}
        </div>
      </div>

      {/* Manual entry controls - only show if enabled */}
      {showManualEntry && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowManualEntry(false)
              onChange('')
              inputRef.current?.focus()
            }}
            disabled={isScanning}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleManualSubmit}
            disabled={isScanning || !value.trim()}
            className="text-xs flex-1"
          >
            Submit
          </Button>
        </div>
      )}

      {/* Manual entry toggle button - only show if not in manual mode */}
      {!showManualEntry && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowManualEntry(true)}
          disabled={isScanning}
          className="text-xs w-full"
        >
          <Keyboard className="w-3 h-3 mr-1" />
          Manual Entry (F2)
        </Button>
      )}
    </div>
  )
}