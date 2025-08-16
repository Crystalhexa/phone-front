import { User } from "@/types/auth"

export interface ReceiptData {
  orderNumber: string
  paymentNumber: string
  date: string
  customerName?: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  sales_ref: string
  sales_ref_name: string
  paymentDetails: {
    amountPaid: number
    receivedAmount: number
    changeGiven: number
    reference?: string
  }
}

export interface PrintOptions {
  autoClose?: boolean
  timeout?: number
  showPreview?: boolean
  paperSize?: 'thermal' | 'a4'
}

export class ReceiptPrinter {
  private static readonly DEFAULT_OPTIONS: PrintOptions = {
    autoClose: true,
    timeout: 5000,
    showPreview: false,
    paperSize: 'thermal'
  }

  /**
   * Generate receipt HTML with proper escaping and validation
   */
  public static generateReceiptHTML(data: ReceiptData, user: User): string {
    // Validate required data
    if (!data.orderNumber || !data.paymentNumber || !data.date) {
      throw new Error('Missing required receipt data')
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('Receipt must contain at least one item')
    }

    if (!user) {
      throw new Error('User information is required')
    }

    // Escape HTML to prevent XSS
    const escapeHtml = (str: string | undefined | null): string => {
      if (!str) return ''
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    // Format currency consistently
    const formatCurrency = (amount: number): string => {
      if (isNaN(amount)) return 'Rs.0.00'
      return `Rs.${amount.toFixed(2)}`
    }

    // Validate numerical values
    const validateNumber = (num: number, fallback: number = 0): number => {
      return isNaN(num) ? fallback : num
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt ${escapeHtml(data.orderNumber)}</title>
      <style>
        @media print {
          body { margin: 0 !important; }
          .no-print { display: none !important; }
        }
        
        body { 
          font-family: 'Courier New', monospace; 
          width: 80mm; 
          margin: 0; 
          padding: 15px; 
          background: white;
          color: #000;
          line-height: 1.4;
          font-size: 12px;
        }
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        .shop-name { 
          font-size: 16px; 
          font-weight: bold; 
          margin: 5px 0;
          text-transform: uppercase;
        }
        .hotline { 
          font-size: 12px; 
          margin: 5px 0;
          font-weight: bold;
        }
        .branch-info { 
          font-size: 11px; 
          margin: 3px 0; 
        }
        .employee-info {
          font-size: 10px;
          margin: 8px 0;
          padding: 8px;
          background: #f5f5f5;
          border: 1px solid #ddd;
        }
        .order-info {
          margin: 15px 0;
          text-align: center;
          font-size: 12px;
        }
        .line { 
          border-bottom: 1px dashed #000; 
          margin: 10px 0; 
        }
        .double-line { 
          border-bottom: 2px solid #000; 
          margin: 15px 0; 
        }
        .row { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0;
          font-size: 11px;
        }
        .item-row {
          margin: 8px 0;
          font-size: 11px;
        }
        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
          word-wrap: break-word;
        }
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .total-section {
          margin: 15px 0;
          padding: 10px 0;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }
        .total { 
          font-weight: bold; 
          font-size: 14px;
          padding: 5px 0;
          background: #f0f0f0;
          margin: 5px -5px;
          padding-left: 5px;
          padding-right: 5px;
        }
        .payment-info {
          margin: 15px 0;
          font-size: 11px;
          padding: 10px;
          background: #f9f9f9;
          border: 1px solid #ddd;
        }
        .payment-details {
          margin: 10px 0;
          padding: 10px;
          background: #e8f5e8;
          border: 1px solid #28a745;
        }
        .change-highlight {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 8px;
          margin: 5px 0;
          font-weight: bold;
          text-align: center;
        }
        .center { 
          text-align: center; 
        }
        .footer {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #000;
          font-size: 9px;
          text-align: center;
          line-height: 1.3;
        }
        .warranty {
          background: #f9f9f9;
          padding: 8px;
          margin: 10px 0;
          border: 1px solid #ccc;
        }
        .thank-you {
          font-size: 12px;
          font-weight: bold;
          margin: 15px 0;
        }
        .error {
          color: #d9534f;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">Kandy Radio Engineers (Pvt) Ltd.</div>
        <div class="hotline">Hotline: 0812 220 550</div>
        <div class="branch-info">
          <div><strong>${escapeHtml(user?.branch_name) || 'Main Store'}</strong></div>
          <div>${escapeHtml(user?.branch_address) || 'No 12/B Kandy'}</div>
          <div>Tel: ${escapeHtml(user?.branch_phone) || '0814256548'}</div>
        </div>
      </div>

      <div class="employee-info center">
        <div><strong>Cashier:</strong> ${escapeHtml(user?.employee_name)} - ${escapeHtml(user?.employee_number)}</div>
        <div><strong>Sales ref:</strong> ${escapeHtml(data?.sales_ref_name)} - ${escapeHtml(data?.sales_ref)}</div>
      </div>

      <div class="order-info">
        <div><strong>Receipt No:</strong> ${escapeHtml(data.orderNumber)}</div>
        <div><strong>Payment No:</strong> ${escapeHtml(data.paymentNumber)}</div>
        <div><strong>Date &amp; Time:</strong> ${escapeHtml(data.date)}</div>
        ${data.customerName ? `<div><strong>Customer:</strong> ${escapeHtml(data.customerName)}</div>` : ''}
      </div>

      <div class="double-line"></div>

      <div style="margin: 15px 0;">
        ${data.items.map(item => {
          const quantity = validateNumber(item.quantity, 1)
          const unitPrice = validateNumber(item.unitPrice, 0)
          const total = validateNumber(item.total, 0)
          
          return `
          <div class="item-row">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-details">
              <span>${quantity} × ${formatCurrency(unitPrice)}</span>
              <span><strong>${formatCurrency(total)}</strong></span>
            </div>
          </div>
        `}).join('')}
      </div>

      <div class="line"></div>

      <div class="total-section">
        <div class="row">
          <span>Subtotal:</span>
          <span>${formatCurrency(validateNumber(data.subtotal))}</span>
        </div>
        ${validateNumber(data.discount) > 0 ? `
          <div class="row">
            <span>Discount:</span>
            <span style="color: #d9534f;">-${formatCurrency(validateNumber(data.discount))}</span>
          </div>
        ` : ''}
        <div class="row total">
          <span>TOTAL AMOUNT:</span>
          <span>${formatCurrency(validateNumber(data.total))}</span>
        </div>
      </div>

      <div class="payment-info">
        <div class="row">
          <span><strong>Payment Method:</strong></span>
          <span>${escapeHtml(data.paymentMethod)}</span>
        </div>
        ${data.paymentDetails.reference ? `
          <div class="row">
            <span><strong>Reference No:</strong></span>
            <span>${escapeHtml(data.paymentDetails.reference)}</span>
          </div>
        ` : ''}
      </div>

      <div class="payment-details">
        <div class="center" style="font-weight: bold; margin-bottom: 8px;">PAYMENT DETAILS</div>
        <div class="row">
          <span>Amount Paid:</span>
          <span><strong>${formatCurrency(validateNumber(data.paymentDetails.amountPaid))}</strong></span>
        </div>
        ${data.paymentMethod === 'Cash' ? `
          <div class="row">
            <span>Amount Received:</span>
            <span>${formatCurrency(validateNumber(data.paymentDetails.receivedAmount))}</span>
          </div>
          ${validateNumber(data.paymentDetails.changeGiven) > 0 ? `
            <div class="change-highlight">
              CHANGE GIVEN: ${formatCurrency(validateNumber(data.paymentDetails.changeGiven))}
            </div>
          ` : ''}
        ` : ''}
      </div>

      <div class="center thank-you">
        Thank you for your business!
      </div>

      <div class="footer">
        <div class="warranty">
          <strong>WARRANTY INFORMATION</strong><br>
          6 months warranty for Electronic and Electrical goods &amp; accessories<br>
          (Manufacturing Defects Only)
        </div>
        
        <div style="margin-top: 10px; font-size: 8px;">
          System by <strong>Crystalhexa</strong><br>
          Tel: 0706820822
        </div>
        
        <div style="margin-top: 15px; font-size: 8px;">
          Generated on: ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
    `
  }

  /**
   * Print receipt with comprehensive error handling and logging
   */
  public static async printReceipt(
    data: ReceiptData, 
    user: User, 
    options: PrintOptions = {}
  ): Promise<boolean> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    
    try {
      // Validate inputs
      if (!data || !user) {
        throw new Error('Receipt data and user information are required')
      }

      // Generate HTML
      const html = this.generateReceiptHTML(data, user)
      
      // Check if browser supports printing
      if (!window.print) {
        throw new Error('Printing is not supported in this browser')
      }

      return await this.openPrintWindow(html, config, data.orderNumber)
      
    } catch (error) {
      console.error('Receipt printing failed:', error)
      this.handlePrintError(error as Error)
      return false
    }
  }

  /**
   * Preview receipt without auto-closing or timeout
   */
  public static previewReceipt(data: ReceiptData, user: User): boolean {
    try {
      const html = this.generateReceiptHTML(data, user)
      const previewWindow = window.open('', '_blank')
      
      if (!previewWindow) {
        throw new Error('Popup blocked or failed to open preview window')
      }

      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
      previewWindow.focus()

      return true
    } catch (error) {
      console.error('Receipt preview failed:', error)
      this.handlePrintError(error as Error)
      return false
    }
  }

  /**
   * Open print window with timeout and error handling
   */
  private static async openPrintWindow(
    html: string, 
    options: PrintOptions, 
    orderNumber: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let printWindow: Window | null = null
      let timeoutId: NodeJS.Timeout | null = null
      let resolved = false

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        // Only auto-close if autoClose is enabled and not in preview mode
        if (printWindow && !printWindow.closed && options.autoClose && !options.showPreview) {
          try {
            printWindow.close()
          } catch (e) {
            // Window might already be closed
          }
        }
      }

      const resolveOnce = (success: boolean) => {
        if (!resolved) {
          resolved = true
          if (!options.showPreview) {
            cleanup()
          }
          resolve(success)
        }
      }

      try {
        // Open print window with better dimensions for preview
        const windowFeatures = options.showPreview 
          ? 'width=400,height=700,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes'
          : 'width=300,height=700,scrollbars=yes'
          
        printWindow = window.open('', '_blank')
        
        if (!printWindow) {
          throw new Error('Popup blocked or failed to open print window')
        }

        // Write content
        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()

        // Set up event listeners
        printWindow.addEventListener('load', () => {
          try {
            if (options.showPreview) {
              // Just show the preview, don't auto-print or close
              resolveOnce(true)
            } else {
              // Auto-print
              printWindow!.print()
              
              // Handle different browsers
              const handleAfterPrint = () => {
                if (options.autoClose) {
                  setTimeout(() => resolveOnce(true), 100)
                } else {
                  resolveOnce(true)
                }
              }

              // Try to detect when printing is done
              if (printWindow!.onafterprint !== undefined) {
                printWindow!.onafterprint = handleAfterPrint
              } else {
                // Fallback for browsers that don't support afterprint
                setTimeout(handleAfterPrint, 1000)
              }
            }
          } catch (error) {
            console.error('Print execution failed:', error)
            resolveOnce(false)
          }
        })

        printWindow.addEventListener('error', (event) => {
          console.error('Print window error:', event)
          resolveOnce(false)
        })

        // Only set timeout if not in preview mode
        if (!options.showPreview) {
          timeoutId = setTimeout(() => {
            console.warn(`Print timeout after ${options.timeout}ms`)
            resolveOnce(false)
          }, options.timeout)
        }

      } catch (error) {
        console.error('Failed to create print window:', error)
        resolveOnce(false)
      }
    })
  }

  /**
   * Handle print errors with user-friendly messages
   */
  private static handlePrintError(error: Error) {
    let message = 'Failed to print receipt. '
    
    if (error.message.includes('Popup blocked')) {
      message += 'Please allow popups for this site and try again.'
    } else if (error.message.includes('not supported')) {
      message += 'Printing is not supported in this browser.'
    } else if (error.message.includes('required')) {
      message += 'Missing required information.'
    } else {
      message += 'Please check your printer settings and try again.'
    }

    // You can replace this with your preferred notification system
    if (typeof window !== 'undefined' && window.alert()) {
      alert(message)
    } else {
      console.error(message)
    }
  }

  /**
   * Download receipt as PDF (alternative to printing)
   */
  public static async downloadReceiptPDF(data: ReceiptData, user: User): Promise<boolean> {
    try {
      const html = this.generateReceiptHTML(data, user)
      
      // Create a blob with the HTML content
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${data.orderNumber}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      console.error('PDF download failed:', error)
      return false
    }
  }

  /**
   * Get receipt as base64 encoded string for API transmission
   */
  public static getReceiptBase64(data: ReceiptData, user: User): string {
    try {
      const html = this.generateReceiptHTML(data, user)
      return btoa(unescape(encodeURIComponent(html)))
    } catch (error) {
      console.error('Base64 encoding failed:', error)
      throw error
    }
  }
}

// Backward compatibility - keep the original function signatures
export function generateReceiptHTML(data: ReceiptData, user: User): string {
  return ReceiptPrinter.generateReceiptHTML(data, user)
}

export function printReceipt(data: ReceiptData, user: User): Promise<boolean> {
  return ReceiptPrinter.printReceipt(data, user)
}

// Additional convenience functions
export function previewReceipt(data: ReceiptData, user: User): boolean {
  return ReceiptPrinter.previewReceipt(data, user)
}