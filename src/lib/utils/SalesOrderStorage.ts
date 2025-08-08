// File: @/lib/utils/SalesOrderStorage.ts
// or
// File: @/utils/SalesOrderStorage.ts

/**
 * Sales Order localStorage Management Utility
 * Handles persistence of sales order data including cart, customer info, and order details
 */

// localStorage keys configuration
export const STORAGE_KEYS = {
  CART: 'sales_order_cart',
  CUSTOMER: 'sales_order_customer',
  ORDER_DISCOUNT: 'sales_order_discount',
  ORDER_NOTES: 'sales_order_notes',
  SCANNED_BARCODES: 'sales_order_scanned_barcodes',
  LAST_SAVE: 'sales_order_last_save'
} as const

// Type definitions for better type safety
export interface StorageData {
  cart: any[]
  customer: Record<string, any>
  orderDiscount: number
  orderNotes: string
  scannedBarcodes: string[]
  lastSave: string
}

/**
 * Save data to localStorage with automatic timestamp
 * @param key - Storage key from STORAGE_KEYS
 * @param data - Data to store
 */
export const saveToStorage = (key: string, data: any): void => {
  try {
    if (typeof window === 'undefined') {
      console.warn('localStorage not available (server-side)')
      return
    }

    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(STORAGE_KEYS.LAST_SAVE, new Date().toISOString())
  } catch (error) {
    console.error(`Failed to save to localStorage (key: ${key}):`, error)
    
    // Handle quota exceeded error
    if (error instanceof DOMException && error.code === 22) {
      console.error('localStorage quota exceeded. Consider clearing old data.')
    }
  }
}

/**
 * Load data from localStorage with fallback
 * @param key - Storage key to retrieve
 * @param defaultValue - Default value if key doesn't exist or parsing fails
 * @returns Parsed data or default value
 */
export const loadFromStorage = <T = any>(key: string, defaultValue: T = null as T): T => {
  try {
    if (typeof window === 'undefined') {
      console.warn('localStorage not available (server-side)')
      return defaultValue
    }

    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Failed to load from localStorage (key: ${key}):`, error)
    return defaultValue
  }
}

/**
 * Clear all sales order related data from localStorage
 */
export const clearStorage = (): void => {
  try {
    if (typeof window === 'undefined') {
      console.warn('localStorage not available (server-side)')
      return
    }

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

/**
 * Check if there's any saved data in localStorage
 * @returns boolean indicating if saved data exists
 */
export const hasSavedData = (): boolean => {
  try {
    if (typeof window === 'undefined') return false
    
    const cart = loadFromStorage(STORAGE_KEYS.CART, [])
    const customer = loadFromStorage(STORAGE_KEYS.CUSTOMER, {})
    const orderDiscount = loadFromStorage(STORAGE_KEYS.ORDER_DISCOUNT, 0)
    const orderNotes = loadFromStorage(STORAGE_KEYS.ORDER_NOTES, '')
    
    return cart.length > 0 || 
           Object.keys(customer).length > 0 || 
           orderDiscount > 0 || 
           orderNotes.trim() !== ''
  } catch (error) {
    console.error('Failed to check saved data:', error)
    return false
  }
}

/**
 * Get the last save timestamp
 * @returns Date object of last save or null if not available
 */
export const getLastSaveTime = (): Date | null => {
  try {
    const lastSave = loadFromStorage(STORAGE_KEYS.LAST_SAVE)
    return lastSave ? new Date(lastSave) : null
  } catch (error) {
    console.error('Failed to get last save time:', error)
    return null
  }
}

/**
 * Save all sales order data at once
 * @param data - Complete sales order data
 */
export const saveAllSalesOrderData = (data: Partial<StorageData>): void => {
  try {
    if (data.cart !== undefined) {
      saveToStorage(STORAGE_KEYS.CART, data.cart)
    }
    if (data.customer !== undefined) {
      saveToStorage(STORAGE_KEYS.CUSTOMER, data.customer)
    }
    if (data.orderDiscount !== undefined) {
      saveToStorage(STORAGE_KEYS.ORDER_DISCOUNT, data.orderDiscount)
    }
    if (data.orderNotes !== undefined) {
      saveToStorage(STORAGE_KEYS.ORDER_NOTES, data.orderNotes)
    }
    if (data.scannedBarcodes !== undefined) {
      saveToStorage(STORAGE_KEYS.SCANNED_BARCODES, data.scannedBarcodes)
    }
  } catch (error) {
    console.error('Failed to save all sales order data:', error)
  }
}

/**
 * Load all sales order data at once
 * @returns Complete sales order data with defaults
 */
export const loadAllSalesOrderData = (): StorageData => {
  return {
    cart: loadFromStorage(STORAGE_KEYS.CART, []),
    customer: loadFromStorage(STORAGE_KEYS.CUSTOMER, {}),
    orderDiscount: loadFromStorage(STORAGE_KEYS.ORDER_DISCOUNT, 0),
    orderNotes: loadFromStorage(STORAGE_KEYS.ORDER_NOTES, ''),
    scannedBarcodes: loadFromStorage(STORAGE_KEYS.SCANNED_BARCODES, []),
    lastSave: loadFromStorage(STORAGE_KEYS.LAST_SAVE, '')
  }
}

/**
 * Create a backup of current sales order data
 * @returns Serialized backup string
 */
export const createBackup = (): string => {
  try {
    const data = loadAllSalesOrderData()
    return JSON.stringify({
      ...data,
      backupTimestamp: new Date().toISOString(),
      version: '1.0'
    })
  } catch (error) {
    console.error('Failed to create backup:', error)
    return ''
  }
}

/**
 * Restore sales order data from backup
 * @param backupString - Serialized backup data
 * @returns Success boolean
 */
export const restoreFromBackup = (backupString: string): boolean => {
  try {
    const data = JSON.parse(backupString)
    
    // Validate backup structure
    if (!data.version || !data.backupTimestamp) {
      throw new Error('Invalid backup format')
    }
    
    saveAllSalesOrderData(data)
    return true
  } catch (error) {
    console.error('Failed to restore from backup:', error)
    return false
  }
}

/**
 * Get storage usage information
 * @returns Object with storage stats
 */
export const getStorageInfo = () => {
  try {
    if (typeof window === 'undefined') return null
    
    let totalSize = 0
    const itemSizes: Record<string, number> = {}
    
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key)
      const size = item ? item.length : 0
      itemSizes[key] = size
      totalSize += size
    })
    
    return {
      totalSize,
      itemSizes,
      formattedSize: `${(totalSize / 1024).toFixed(2)} KB`
    }
  } catch (error) {
    console.error('Failed to get storage info:', error)
    return null
  }
}

// Default export for convenience
export default {
  STORAGE_KEYS,
  saveToStorage,
  loadFromStorage,
  clearStorage,
  hasSavedData,
  getLastSaveTime,
  saveAllSalesOrderData,
  loadAllSalesOrderData,
  createBackup,
  restoreFromBackup,
  getStorageInfo
}