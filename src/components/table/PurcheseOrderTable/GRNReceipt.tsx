import React, { useRef } from 'react';
import { Printer, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  quantity_ordered: number;
  quantity_received?: number;
  cost_price: string;
  total_price: string;
  unit?: string;
  description?: string;
  condition?: 'good' | 'damaged' | 'partial';
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  invoice_number?: string;
  supplier_id: string;
  supplier_name: string;
  supplier_code: string;
  purchased_by?: string;
  purchaser_name?: string;
  branch_id?: string;
  branch_name?: string;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  status: 'PENDING' | 'COMPLETED' | 'RECEIVED' | 'CANCELLED';
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  items?: PurchaseOrderItem[];
}

interface GRNReceiptProps {
  purchaseOrder: PurchaseOrder;
  grnNumber?: string;
  receivedBy?: string;
  receivedDate?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

// Simple date formatter
const formatDate = (date: string | Date, formatType = 'dd/MM/yyyy') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  if (formatType === 'HH:mm') return `${hours}:${minutes}`;
  if (formatType === 'dd/MM/yyyy HH:mm') return `${day}/${month}/${year} ${hours}:${minutes}`;
  if (formatType === 'MM/dd/yyyy') return `${month}/${day}/${year}`;
  if (formatType === 'MMM dd, yyyy \'at\' HH:mm') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${day}, ${year} at ${hours}:${minutes}`;
  }
  return `${day}/${month}/${year}`;
};


const GRNReceipt: React.FC<GRNReceiptProps> = ({
  purchaseOrder,
  receivedBy = 'Warehouse Staff',
  receivedDate = formatDate(new Date(), 'yyyy-MM-dd')
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>GRN - ${purchaseOrder.order_number}</title>
              <style>
                ${getInlineStyles()}
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (receiptRef.current) {
      handlePrint();
    }
  };

  const calculateTotals = () => {
    const items = purchaseOrder.items || [];
    const totalOrdered = items.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.quantity_received || item.quantity_ordered), 0);
    const totalValue = items.reduce((sum, item) => {
      const received = item.quantity_received || item.quantity_ordered;
      return sum + (received * parseFloat(item.cost_price));
    }, 0);

    return { totalOrdered, totalReceived, totalValue };
  };

  const getConditionBadge = (condition: string = 'good') => {
    const badges = {
      good: { class: 'condition-good', text: '✓' },
      damaged: { class: 'condition-damaged', text: '✗' },
      partial: { class: 'condition-partial', text: '~' }
    };
    return badges[condition as keyof typeof badges] || badges.good;
  };

  const { totalOrdered, totalReceived, totalValue } = calculateTotals();

  return (
    <div className="grn-wrapper">
      {/* Action Buttons */}
      <div className="action-buttons no-print" style={{ marginBottom: '15px', textAlign: 'right' }}>
        <button onClick={handlePrint} className="btn btn-primary mr-2">
          <Printer size={16} style={{ marginRight: '5px' }} />
          Print GRN
        </button>
        <button onClick={handleDownload} className="btn btn-outline">
          <Download size={16} style={{ marginRight: '5px' }} />
          Download PDF
        </button>
      </div>

      {/* GRN Receipt */}
      <div ref={receiptRef} className="grn-container">
        <style dangerouslySetInnerHTML={{ __html: getInlineStyles() }} />

        {/* Compact Header */}
        <div className="grn-header">
          <div className="header-content">
            <div className="title-section">
              <div className="grn-title">GOODS RECEIVED NOTE</div>
              <div className="grn-subtitle">Official Receipt of Goods</div>
            </div>
            <div className="date-section">
              <div>Date: {formatDate(new Date(receivedDate))}</div>
              <div>Time: {formatDate(new Date(), 'HH:mm')}</div>
            </div>
          </div>
        </div>

        {/* GRN Number Banner */}
        <div className="grn-number">
          GRN NUMBER: {purchaseOrder.order_number}
        </div>

        {/* Compact Info Section */}
        <div className="grn-info">
          <div className="info-section">
            <h3>Supplier Information</h3>
            <div className="info-row">
              <span className="info-label">Supplier:</span>
              <span className="info-value">{purchaseOrder.supplier_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Code:</span>
              <span className="info-value">{purchaseOrder.supplier_code}</span>
            </div>
            <div className="info-row">
              <span className="info-label">PO Number:</span>
              <span className="info-value">{purchaseOrder.order_number}</span>
            </div>
            {purchaseOrder.invoice_number && (
              <div className="info-row">
                <span className="info-label">Invoice:</span>
                <span className="info-value">{purchaseOrder.invoice_number}</span>
              </div>
            )}
          </div>
          <div className="info-section">
            <h3>Receiving Information</h3>
            <div className="info-row">
              <span className="info-label">Received By:</span>
              <span className="info-value">{receivedBy}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Branch:</span>
              <span className="info-value">{purchaseOrder.branch_name || 'Main Branch'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">{purchaseOrder.status}</span>
            </div>
          </div>
        </div>

        {/* Compact Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Product</th>
              <th style={{ width: '12%' }}>Unit Price</th>
              <th style={{ width: '10%' }}>Ord.</th>
              <th style={{ width: '10%' }}>Rec.</th>
              <th style={{ width: '8%' }}>Cond.</th>
              <th style={{ width: '10%' }}>Unit</th>
              <th style={{ width: '15%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(purchaseOrder.items || []).map((item, index) => {
              const quantityReceived = item.quantity_received || item.quantity_ordered;
              const itemTotal = quantityReceived * parseFloat(item.cost_price);
              const condition = getConditionBadge(item.condition);

              return (
                <tr key={item.id}>
                  <td>
                    <div className="product-name">{item.product_name}</div>
                    <div className="product-code">Code: {item.product_code}</div>
                  </td>
                  <td className="text-right">{formatCurrency(item.cost_price)}</td>
                  <td className="qty-ordered text-center">{item.quantity_ordered}</td>
                  <td className="qty-received text-center">{quantityReceived}</td>
                  <td className="text-center">
                    <span className={`condition-badge ${condition.class}`}>
                      {condition.text}
                    </span>
                  </td>
                  <td className="text-center">{item.unit || 'pcs'}</td>
                  <td className="text-right total-cell">{formatCurrency(itemTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Compact Summary Section */}
        <div className="summary-section">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-number">{totalReceived}</div>
              <div className="summary-label">Items Received</div>
            </div>
            <div className="summary-card">
              <div className="summary-number">{totalOrdered}</div>
              <div className="summary-label">Items Ordered</div>
            </div>
            <div className="summary-card highlight">
              <div className="summary-number">{formatCurrency(totalValue)}</div>
              <div className="summary-label">Total Value</div>
            </div>
          </div>

          {purchaseOrder.notes && (
            <div className="notes-section">
              <h4>Notes:</h4>
              <p>{purchaseOrder.notes}</p>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="grn-footer">
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Received By</div>
              <div className="signature-name">{receivedBy}</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Authorized By</div>
              <div className="signature-name">Manager</div>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <div className="signature-label">Date</div>
              <div className="signature-name">{formatDate(new Date(receivedDate), 'MM/dd/yyyy')}</div>
            </div>
          </div>
          
          <div className="footer-text">
            This document serves as official confirmation of goods received.
            <br />
            Generated on {formatDate(new Date(), 'MMM dd, yyyy \'at\' HH:mm')}
          </div>
        </div>
      </div>
    </div>
  );
};

const getInlineStyles = () => `
  .grn-wrapper * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .grn-wrapper {
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    line-height: 1.3;
  }

  .btn {
    padding: 6px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    display: inline-flex;
    align-items: center;
    background: white;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .btn-outline {
    background: white;
    color: #374151;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .mr-2 {
    margin-right: 8px;
  }

  .grn-container {
    width: 210mm;
    min-height: 297mm;
    max-width: 100%;
    margin: 0 auto;
    background: white;
    border: 1px solid #d1d5db;
    padding: 12mm;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .grn-header {
    border-bottom: 2px solid #2563eb;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .grn-title {
    font-size: 18px;
    font-weight: bold;
    color: #2563eb;
    margin-bottom: 3px;
    letter-spacing: 0.5px;
  }

  .grn-subtitle {
    font-size: 10px;
    color: #6b7280;
  }

  .date-section {
    text-align: right;
    font-size: 10px;
    color: #6b7280;
  }

  .grn-number {
    background: #fef3c7;
    color: #92400e;
    padding: 8px 12px;
    text-align: center;
    font-size: 12px;
    font-weight: bold;
    border-left: 3px solid #f59e0b;
    margin-bottom: 12px;
  }

  .grn-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e7eb;
  }

  .info-section h3 {
    color: #374151;
    font-size: 11px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #2563eb;
    font-weight: 600;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    padding: 2px 0;
    font-size: 10px;
  }

  .info-label {
    font-weight: 600;
    color: #6b7280;
    flex: 1;
  }

  .info-value {
    font-weight: 500;
    color: #111827;
    flex: 1;
    text-align: right;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 9px;
  }

  .items-table th {
    background: #f8fafc;
    color: #374151;
    font-weight: 600;
    padding: 6px 4px;
    text-align: left;
    border: 1px solid #e5e7eb;
    font-size: 9px;
  }

  .items-table td {
    padding: 4px;
    border: 1px solid #e5e7eb;
    color: #374151;
    vertical-align: top;
  }

  .items-table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  .product-name {
    font-weight: 600;
    font-size: 9px;
    margin-bottom: 1px;
  }

  .product-code {
    font-size: 8px;
    color: #6b7280;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .qty-received {
    font-weight: 600;
    color: #059669;
  }

  .qty-ordered {
    color: #6b7280;
  }

  .total-cell {
    font-weight: 600;
  }

  .condition-badge {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    text-align: center;
    line-height: 14px;
    font-size: 8px;
    font-weight: bold;
  }

  .condition-good {
    background: #d1fae5;
    color: #065f46;
  }

  .condition-damaged {
    background: #fee2e2;
    color: #991b1b;
  }

  .condition-partial {
    background: #fef3c7;
    color: #92400e;
  }

  .summary-section {
    background: #f8fafc;
    padding: 12px;
    border-top: 1px solid #e5e7eb;
    margin-bottom: 12px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  .summary-card {
    text-align: center;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
  }

  .summary-card.highlight {
    background: #eff6ff;
    border-color: #2563eb;
  }

  .summary-number {
    font-size: 14px;
    font-weight: bold;
    color: #2563eb;
    margin-bottom: 2px;
  }

  .summary-label {
    color: #6b7280;
    font-size: 9px;
  }

  .notes-section {
    margin-top: 10px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
  }

  .notes-section h4 {
    margin-bottom: 4px;
    color: #374151;
    font-size: 10px;
  }

  .notes-section p {
    color: #6b7280;
    line-height: 1.4;
    font-size: 9px;
  }

  .grn-footer {
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
  }

  .signature-section {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    margin-bottom: 10px;
  }

  .signature-box {
    text-align: center;
  }

  .signature-line {
    border-bottom: 1px solid #374151;
    margin-bottom: 4px;
    height: 20px;
  }

  .signature-label {
    font-size: 8px;
    color: #6b7280;
    margin-bottom: 2px;
  }

  .signature-name {
    font-weight: 600;
    color: #374151;
    font-size: 9px;
  }

  .footer-text {
    text-align: center;
    font-size: 8px;
    color: #9ca3af;
    line-height: 1.3;
  }

  @media print {
    .no-print {
      display: none !important;
    }
    
    .grn-container {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      padding: 10mm !important;
      box-shadow: none !important;
      border: none !important;
      font-size: 9px !important;
    }
    
    body {
      background: white !important;
      margin: 0 !important;
    }
    
    .grn-wrapper {
      margin: 0 !important;
    }
    
    .items-table {
      font-size: 8px !important;
    }
    
    .items-table th,
    .items-table td {
      padding: 2px !important;
    }
    
    .product-name {
      font-size: 8px !important;
    }
    
    .product-code {
      font-size: 7px !important;
    }
    
    .grn-title {
      font-size: 16px !important;
    }
    
    .summary-section {
      padding: 8px !important;
    }
    
    .grn-footer {
      padding-top: 8px !important;
    }
  }

  @media (max-width: 768px) {
    .grn-container {
      width: 100%;
      padding: 10px;
    }
    
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .date-section {
      text-align: left;
      margin-top: 8px;
    }
    
    .grn-info {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    
    .summary-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    
    .signature-section {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    
    .items-table {
      font-size: 8px;
    }
    
    .items-table th,
    .items-table td {
      padding: 3px 2px;
    }
  }
`;

export default GRNReceipt;