import { CartItem } from "./salesCalculations"

const CART_STORAGE_KEY = 'sales_cart'
const CUSTOMER_STORAGE_KEY = 'sales_customer'

export function saveCartToStorage(cart: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error)
  }
}

export function loadCartFromStorage(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error)
    return []
  }
}

export function clearCartFromStorage() {
  try {
    localStorage.removeItem(CART_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear cart from localStorage:', error)
  }
}

export function saveCustomerToStorage(customer: any) {
  try {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
  } catch (error) {
    console.warn('Failed to save customer to localStorage:', error)
  }
}

export function loadCustomerFromStorage(): any {
  try {
    const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to load customer from localStorage:', error)
    return {}
  }
}
