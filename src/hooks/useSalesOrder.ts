import { useState, useCallback } from 'react'

interface SalesOrderHook {
  scanProduct: (barcode: string) => Promise<any>
  placeOrder: (orderData: any) => Promise<any>
  isLoading: boolean
  error: string | null
}

export function useSalesOrder(): SalesOrderHook {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scanProduct = useCallback(async (barcode: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode: barcode.trim() }),
      })
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to scan product')
      }

      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const placeOrder = useCallback(async (orderData: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to place order')
      }

      return result.data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    scanProduct,
    placeOrder,
    isLoading,
    error
  }
}