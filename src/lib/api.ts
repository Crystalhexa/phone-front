import { Branch, ScannedProduct, TransferRequest } from "@/types/transfer"

export class TransferAPI {
  private static baseUrl = '/api'

  static async scanBarcode(barcode: string): Promise<ScannedProduct> {
    const response = await fetch(`${this.baseUrl}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: barcode.trim() }),
    })

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to scan barcode')
    }

    return data.data
  }

  static async getBranches(): Promise<Branch[]> {
    const response = await fetch(`${this.baseUrl}/branches`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch branches')
    }

    return data.data
  }

  static async createTransfer(transferData: TransferRequest) {
    const response = await fetch(`${this.baseUrl}/stock-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transferData),
    })

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create transfer')
    }

    return data.data
  }
}