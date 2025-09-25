import { User } from "@/types/auth"
import { formatCurrency } from "./formatCurrency"
import { Customer } from "@/types/customer"

export interface CustomerLedger {
  transaction_id: string,
  transaction_number: string,
  transaction_type: string,
  description: string,
  debit: number,
  credit: number,
  balance: number,
  date: Date
}

export interface CustomerInfo {
  customer_id: string,
  customer_name: string,
  customer_number?: string,
  customer_address?: string,
  customer_phone?: string,
  customer_email?: string
}

export interface StatementData {
  customer: Customer,
  transactions: CustomerLedger[],
  statement_period: {
    from_date: Date,
    to_date: Date
  },
}

export interface PrintOptions {
  autoClose?: boolean
  timeout?: number
  showPreview?: boolean
  paperSize?: 'thermal' | 'a4'
}

export class CustomerStatementPrinter {
  private static readonly DEFAULT_OPTIONS: PrintOptions = {
    autoClose: true,
    timeout: 5000,
    showPreview: false,
    paperSize: 'a4'
  }

  public static generateStatementHTML(data: StatementData, user: User): string {
    // Validate required data
    if (!data.customer || !data.customer.name) {
      throw new Error('Customer information is required')
    }

    if (!data.transactions || data.transactions.length === 0) {
      throw new Error('Statement must contain at least one transaction')
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

    // Validate numerical values
    const validateNumber = (num: number, fallback: number = 0): number => {
      return isNaN(num) ? fallback : num
    }

    // Format date helper
    const formatDate = (date: Date | string): string => {
      const d = new Date(date)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }

    // Sort transactions by date
    const sortedTransactions = [...data.transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer Statement - ${escapeHtml(data.customer.name)}</title>
      <style>
        @media print {
          body { margin: 0 !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: white;
          color: #000;
          line-height: 1.4;
          font-size: 11px;
        }

        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 3px solid #000;
          padding-bottom: 20px;
        }

        .company-name { 
          font-size: 24px; 
          font-weight: bold; 
          margin: 10px 0;
          text-transform: uppercase;
          color: #2c3e50;
        }

        .hotline { 
          font-size: 14px; 
          margin: 5px 0;
          font-weight: bold;
          color: #e74c3c;
        }

        .branch-info { 
          font-size: 12px; 
          margin: 3px 0; 
          color: #34495e;
        }

        .statement-title {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          text-transform: uppercase;
          background: #f8f9fa;
          padding: 15px;
          border: 2px solid #dee2e6;
        }

        .customer-section {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
          background: #f8f9fa;
          padding: 15px;
          border: 1px solid #dee2e6;
        }

        .customer-info {
          flex: 1;
        }

        .statement-info {
          flex: 1;
          text-align: right;
        }

        .info-row {
          margin: 5px 0;
          font-size: 12px;
        }

        .info-label {
          font-weight: bold;
          display: inline-block;
          min-width: 120px;
        }

        .summary-section {
          margin: 20px 0;
          background: #e8f5e8;
          padding: 15px;
          border: 2px solid #28a745;
          border-radius: 5px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 15px;
          text-align: center;
        }

        .summary-item {
          padding: 10px;
          background: white;
          border: 1px solid #28a745;
          border-radius: 3px;
        }

        .summary-label {
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          color: #28a745;
          margin-bottom: 5px;
        }

        .summary-value {
          font-size: 14px;
          font-weight: bold;
          color: #2c3e50;
        }

        .transactions-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 10px;
        }

        .transactions-table th {
          background: #2c3e50;
          color: white;
          padding: 10px 8px;
          text-align: left;
          border: 1px solid #34495e;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 9px;
        }

        .transactions-table td {
          padding: 8px;
          border: 1px solid #dee2e6;
          vertical-align: top;
        }

        .transactions-table tr:nth-child(even) {
          background: #f8f9fa;
        }

        .transactions-table tr:hover {
          background: #e3f2fd;
        }

        .transaction-number {
          font-weight: bold;
          color: #2c3e50;
        }

        .transaction-type {
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .type-sale { background: #d4edda; color: #155724; }
        .type-payment { background: #cce5ff; color: #004085; }
        .type-refund { background: #f8d7da; color: #721c24; }
        .type-adjustment { background: #fff3cd; color: #856404; }

        .debit-amount {
          color: #dc3545;
          font-weight: bold;
          text-align: right;
        }

        .credit-amount {
          color: #28a745;
          font-weight: bold;
          text-align: right;
        }

        .balance-amount {
          font-weight: bold;
          text-align: right;
          background: #f8f9fa;
        }

        .balance-positive { color: #28a745; }
        .balance-negative { color: #dc3545; }

        .date-column {
          white-space: nowrap;
          font-weight: bold;
        }

        .description-column {
          max-width: 200px;
          word-wrap: break-word;
        }

        .totals-section {
          margin: 20px 0;
          border: 2px solid #2c3e50;
          background: #f8f9fa;
        }

        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 15px;
          border-bottom: 1px solid #dee2e6;
          font-size: 12px;
        }

        .totals-row:last-child {
          border-bottom: none;
          background: #2c3e50;
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .totals-label {
          font-weight: bold;
        }

        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #2c3e50;
          font-size: 9px;
          color: #6c757d;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .terms-section {
          background: #fff3cd;
          padding: 10px;
          border: 1px solid #ffc107;
          border-radius: 3px;
        }

        .generated-info {
          text-align: right;
          font-size: 8px;
          color: #6c757d;
          margin-top: 10px;
        }

        .no-transactions {
          text-align: center;
          padding: 40px;
          color: #6c757d;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Kandy Radio Engineers (Pvt) Ltd.</div>
        <div class="hotline">Hotline: 0812 220 550</div>
        <div class="branch-info">
          <div><strong>${escapeHtml(user?.branch_name) || 'Main Store'}</strong></div>
          <div>${escapeHtml(user?.branch_address) || 'Kandy, Sri Lanka'}</div>
          <div>Tel: ${escapeHtml(user?.branch_phone) || '0814256548'}</div>
        </div>
      </div>

      <div class="statement-title">
        Customer Account Statement
      </div>

      <div class="customer-section">
        <div class="customer-info">
          <div class="info-row">
            <span class="info-label">Customer Name:</span>
            <strong>${escapeHtml(data.customer.name)}</strong>
          </div>
          ${data.customer.customer_number ? `
            <div class="info-row">
              <span class="info-label">Customer ID:</span>
              ${escapeHtml(data.customer.customer_number)}
            </div>
          ` : ''}
          ${data.customer.address ? `
            <div class="info-row">
              <span class="info-label">Address:</span>
              ${escapeHtml(data.customer.address)}
            </div>
          ` : ''}
          ${data.customer.phone ? `
            <div class="info-row">
              <span class="info-label">Phone:</span>
              ${escapeHtml(data.customer.phone)}
            </div>
          ` : ''}
          ${data.customer.email ? `
            <div class="info-row">
              <span class="info-label">Email:</span>
              ${escapeHtml(data.customer.email)}
            </div>
          ` : ''}
        </div>

        <div class="statement-info">
          <div class="info-row">
            <span class="info-label">Statement Period:</span>
          </div>
          <div class="info-row">
            <strong>From:</strong> ${formatDate(data.statement_period.from_date)}
          </div>
          <div class="info-row">
            <strong>To:</strong> ${formatDate(data.statement_period.to_date)}
          </div>
          <div class="info-row">
            <span class="info-label">Generated By:</span>
            ${escapeHtml(user?.employee_name)} (${escapeHtml(user?.employee_number)})
          </div>
          <div class="info-row">
            <span class="info-label">Generated On:</span>
            ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}
          </div>
        </div>
      </div>

      <table class="transactions-table">
        <thead>
          <tr>
            <th style="width: 80px;">Date</th>
            <th style="width: 120px;">Transaction No.</th>
            <th style="width: 80px;">Type</th>
            <th>Description</th>
            <th style="width: 90px;">Debit</th>
            <th style="width: 90px;">Credit</th>
            <th style="width: 100px;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTransactions.map(transaction => {
            const debit = validateNumber(transaction.debit)
            const credit = validateNumber(transaction.credit)
            const balance = validateNumber(transaction.balance)
            
            // Determine transaction type class
            let typeClass = 'type-adjustment'
            const type = transaction.transaction_type.toLowerCase()
            if (type.includes('sale') || type.includes('invoice')) typeClass = 'type-sale'
            else if (type.includes('payment') || type.includes('receipt')) typeClass = 'type-payment'
            else if (type.includes('refund') || type.includes('return')) typeClass = 'type-refund'
            
            return `
            <tr>
              <td class="date-column">${formatDate(transaction.date)}</td>
              <td class="transaction-number">${escapeHtml(transaction.transaction_number)}</td>
              <td>
                <span class="transaction-type ${typeClass}">
                  ${escapeHtml(transaction.transaction_type)}
                </span>
              </td>
              <td class="description-column">${escapeHtml(transaction.description)}</td>
              <td class="debit-amount">
                ${debit > 0 ? formatCurrency(debit) : '-'}
              </td>
              <td class="credit-amount">
                ${credit > 0 ? formatCurrency(credit) : '-'}
              </td>
              <td class="balance-amount ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                ${formatCurrency(balance)}
              </td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div class="footer-grid">
          <div class="terms-section">
            <strong>Important Notes:</strong><br>
            • Please verify all transactions and report discrepancies within 30 days<br>
            • This statement is computer generated and does not require signature<br>
            • For queries, contact our customer service: 0812 220 550
          </div>
          
          <div>
            <div><strong>System Information:</strong></div>
            <div>System by <strong>Crystalhexa</strong></div>
            <div>Support: 0706820822</div>
            <div class="generated-info">
              Statement ID: ${Date.now()}<br>
              Generated: ${new Date().toLocaleString('en-GB')}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `
  }

  public static async printStatement(
    data: StatementData, 
    user: User, 
    options: PrintOptions = {}
  ): Promise<boolean> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    
    try {
      // Validate inputs
      if (!data || !user) {
        throw new Error('Statement data and user information are required')
      }

      // Generate HTML
      const html = this.generateStatementHTML(data, user)
      
      // Check if browser supports printing
      if (!window.print) {
        throw new Error('Printing is not supported in this browser')
      }

      return await this.openPrintWindow(html, config, data.customer.name)
      
    } catch (error) {
      console.error('Statement printing failed:', error)
      this.handlePrintError(error as Error)
      return false
    }
  }

  public static previewStatement(data: StatementData, user: User): boolean {
    try {
      const html = this.generateStatementHTML(data, user)
      const previewWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes')
      
      if (!previewWindow) {
        throw new Error('Popup blocked or failed to open preview window')
      }

      previewWindow.document.open()
      previewWindow.document.write(html)
      previewWindow.document.close()
      previewWindow.focus()

      return true
    } catch (error) {
      console.error('Statement preview failed:', error)
      this.handlePrintError(error as Error)
      return false
    }
  }

  private static async openPrintWindow(
    html: string, 
    options: PrintOptions, 
    customerName: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let printWindow: Window | null = null
      let timeoutId: NodeJS.Timeout | null = null
      let resolved = false

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
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
        const windowFeatures = options.showPreview 
          ? 'width=1000,height=800,scrollbars=yes,resizable=yes,menubar=yes,toolbar=yes'
          : 'width=800,height=600,scrollbars=yes'
          
        printWindow = window.open('', '_blank', windowFeatures)
        
        if (!printWindow) {
          throw new Error('Popup blocked or failed to open print window')
        }

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()

        printWindow.addEventListener('load', () => {
          try {
            if (options.showPreview) {
              resolveOnce(true)
            } else {
              printWindow!.print()
              
              const handleAfterPrint = () => {
                if (options.autoClose) {
                  setTimeout(() => resolveOnce(true), 100)
                } else {
                  resolveOnce(true)
                }
              }

              if (printWindow!.onafterprint !== undefined) {
                printWindow!.onafterprint = handleAfterPrint
              } else {
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

  private static handlePrintError(error: Error) {
    let message = 'Failed to print customer statement. '
    
    if (error.message.includes('Popup blocked')) {
      message += 'Please allow popups for this site and try again.'
    } else if (error.message.includes('not supported')) {
      message += 'Printing is not supported in this browser.'
    } else if (error.message.includes('required')) {
      message += 'Missing required information.'
    } else {
      message += 'Please check your printer settings and try again.'
    }

    if (typeof window !== 'undefined' && window.alert) {
      alert(message)
    } else {
      console.error(message)
    }
  }

  public static async downloadStatementPDF(data: StatementData, user: User): Promise<boolean> {
    try {
      const html = this.generateStatementHTML(data, user)
      
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `statement-${data.customer.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      return true
    } catch (error) {
      console.error('Statement download failed:', error)
      return false
    }
  }

  public static getStatementBase64(data: StatementData, user: User): string {
    try {
      const html = this.generateStatementHTML(data, user)
      return btoa(unescape(encodeURIComponent(html)))
    } catch (error) {
      console.error('Base64 encoding failed:', error)
      throw error
    }
  }
}

// Convenience functions for backward compatibility
export function generateStatementHTML(data: StatementData, user: User): string {
  return CustomerStatementPrinter.generateStatementHTML(data, user)
}

export function printStatement(data: StatementData, user: User): Promise<boolean> {
  return CustomerStatementPrinter.printStatement(data, user)
}

export function previewStatement(data: StatementData, user: User): boolean {
  return CustomerStatementPrinter.previewStatement(data, user)
}