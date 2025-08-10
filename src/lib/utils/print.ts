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
  sales_ref_name:string,
  paymentDetails: {
    amountPaid: number
    receivedAmount: number
    changeGiven: number
    reference?: string
  }
}

export function generateReceiptHTML(data: ReceiptData, user: User): string {
 return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${data.orderNumber}</title>
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          width: 80mm; 
          margin: 0; 
          padding: 15px; 
          background: white;
          color: #000;
          line-height: 1.4;
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
      </style>
    </head>
    <body>
      <div class="header">
        <div class="shop-name">Kandy Radio Engineers (Pvt) Ltd.</div>
        <div class="hotline">Hotline: 0812 220 550</div>
        <div class="branch-info">
          <div><strong>${user?.branch_name || 'Main Store'}</strong></div>
          <div>${user?.branch_address || 'No 12/B Kandy'}</div>
          <div>Tel: ${user?.branch_phone || '0814256548'}</div>
        </div>
      </div>

      <div class="employee-info center">
        <div><strong>Cashier:</strong> ${user?.employee_name," - ",user?.employee_number}</div>
        <div><strong>Sales ref:</strong> ${data?.sales_ref_name , "-",data?.sales_ref}</div>
      </div>

      <div class="order-info">
        <div><strong>Receipt No:</strong> ${data.orderNumber}</div>
        <div><strong>Payment No:</strong> ${data.paymentNumber}</div>
        <div><strong>Date & Time:</strong> ${data.date}</div>
        ${data.customerName ? `<div><strong>Customer:</strong> ${data.customerName}</div>` : ''}
      </div>

      <div class="double-line"></div>

      <div style="margin: 15px 0;">
        ${data.items.map(item => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="item-details">
              <span>${item.quantity} × Rs.${item.unitPrice.toFixed(2)}</span>
              <span><strong>Rs.${item.total.toFixed(2)}</strong></span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="line"></div>

      <div class="total-section">
        <div class="row">
          <span>Subtotal:</span>
          <span>Rs.${data.subtotal.toFixed(2)}</span>
        </div>
        ${data.discount > 0 ? `
          <div class="row">
            <span>Discount:</span>
            <span style="color: #d9534f;">-Rs.${data.discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="row total">
          <span>TOTAL AMOUNT:</span>
          <span>Rs.${data.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="payment-info">
        <div class="row">
          <span><strong>Payment Method:</strong></span>
          <span>${data.paymentMethod}</span>
        </div>
        ${data.paymentDetails.reference ? `
          <div class="row">
            <span><strong>Reference No:</strong></span>
            <span>${data.paymentDetails.reference}</span>
          </div>
        ` : ''}
      </div>

      <div class="payment-details">
        <div class="center" style="font-weight: bold; margin-bottom: 8px;">PAYMENT DETAILS</div>
        <div class="row">
          <span>Amount Paid:</span>
          <span><strong>Rs.${data.paymentDetails.amountPaid.toFixed(2)}</strong></span>
        </div>
        ${data.paymentMethod === 'Cash' ? `
          <div class="row">
            <span>Amount Received:</span>
            <span>Rs.${data.paymentDetails.receivedAmount.toFixed(2)}</span>
          </div>
          ${data.paymentDetails.changeGiven > 0 ? `
            <div class="change-highlight">
              CHANGE GIVEN: Rs.${data.paymentDetails.changeGiven.toFixed(2)}
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
          6 months warranty for Electronic and Electrical goods & accessories<br>
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

export function printReceipt(data: ReceiptData, user: User) {
  const receiptWindow = window.open('', '_blank', 'width=300,height=700')
  if (receiptWindow) {
    receiptWindow.document.write(generateReceiptHTML(data, user))
    receiptWindow.document.close()
    
    // Wait for content to load before printing
    receiptWindow.onload = () => {
      receiptWindow.print()
      receiptWindow.close()
    }
  } else {
    alert('Please allow popups to print the receipt')
  }
}