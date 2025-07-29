export interface ReceiptData {
  orderNumber: string
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
  cashier: string
}

export function generateReceiptHTML(data: ReceiptData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${data.orderNumber}</title>
      <style>
        body { font-family: monospace; width: 80mm; margin: 0; padding: 10px; }
        .header { text-align: center; margin-bottom: 20px; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; font-size: 1.2em; }
        .center { text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Kandy Radio Engineers (Pvt) Ltd.</h2>
        <p>Order: ${data.orderNumber}</p>
        <p>Date: ${data.date}</p>
        ${data.customerName ? `<p>Customer: ${data.customerName}</p>` : ''}
      </div>
      
      <div class="line"></div>
      
      ${data.items.map(item => `
        <div class="row">
          <span>${item.name}</span>
        </div>
        <div class="row">
          <span>${item.quantity} x Rs.${item.unitPrice.toFixed(2)}</span>
          <span>Rs.${item.total.toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="line"></div>
      
      <div class="row">
        <span>Subtotal:</span>
        <span>Rs.${data.subtotal.toFixed(2)}</span>
      </div>
      
      ${data.discount > 0 ? `
        <div class="row">
          <span>Discount:</span>
          <span>-Rs.${data.discount.toFixed(2)}</span>
        </div>
      ` : ''}
      
      <div class="row total">
        <span>TOTAL:</span>
        <span>Rs.${data.total.toFixed(2)}</span>
      </div>
      
      <div class="line"></div>
      
      <div class="row">
        <span>Payment:</span>
        <span>${data.paymentMethod}</span>
      </div>
      
      <div class="row">
        <span>Cashier:</span>
        <span>${data.cashier}</span>
      </div>
      
      <div class="center" style="margin-top: 20px;">
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `
}

export function printReceipt(data: ReceiptData) {
  const receiptWindow = window.open('', '_blank', 'width=300,height=600')
  if (receiptWindow) {
    receiptWindow.document.write(generateReceiptHTML(data))
    receiptWindow.document.close()
    receiptWindow.print()
    receiptWindow.close()
  }
}