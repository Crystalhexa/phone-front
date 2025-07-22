import React, { useState, useRef } from 'react';
import { Package, Calendar, User, FileText, Download, Printer, Building } from 'lucide-react';

// Types
interface PurchaseOrderItem {
  batch_active: boolean;
  batch_code: string | null;
  batch_number: string | null;
  cost_price: string;
  expiry_date: string | null;
  id: string;
  line_total: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  purchase_order_id: string;
  quantity_ordered: number;
  quantity_received: number;
  retail_price: string;
  wholesale_price: string;
}

interface PurchaseOrder {
  branch_id: string;
  branch_name: string;
  created_at: string;
  expected_date: string;
  id: string;
  invoice_number: string | null;
  items: PurchaseOrderItem[];
  items_count: string;
  notes: string | null;
  order_date: string;
  order_number: string;
  purchased_by: string | null;
  received_date: string | null;
  status: string;
  subtotal: string;
  supplier_code: string;
  supplier_id: string;
  supplier_name: string;
  tax_amount: string;
  total_amount: string;
  updated_at: string;
  username: string | null;
}

interface GRNProps {
  purchaseOrder?: PurchaseOrder;
}

const GRNGenerator: React.FC<GRNProps> = ({ purchaseOrder: propsPO }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Default sample data or use props
  const defaultPO: PurchaseOrder = {
    branch_id: "cmd9pzj9j00019eeu7dmi1wo4",
    branch_name: "Main store",
    created_at: "2025-07-20T14:25:18.897Z",
    expected_date: "2025-07-19T18:30:00.000Z",
    id: "z82ba4nhrzxskwvp897tla25",
    invoice_number: null,
    items: [{
      batch_active: true,
      batch_code: null,
      batch_number: null,
      cost_price: "150.00",
      expiry_date: null,
      id: "krtvypovdk61mwsmeif4ejlw",
      line_total: "750.00",
      product_id: "cmd2ey7jr000dqpeu1q5wh9vi",
      product_name: " Anker Power Bank",
      product_sku: " Power Bank- Anker4-10000MAH-5V/2A",
      purchase_order_id: "z82ba4nhrzxskwvp897tla25",
      quantity_ordered: 5,
      quantity_received: 0,
      retail_price: "350.00",
      wholesale_price: "250.00"
    }],
    items_count: "1",
    notes: null,
    order_date: "2025-07-19T18:30:00.000Z",
    order_number: "PO-000021",
    purchased_by: null,
    received_date: null,
    status: "COMPLETED",
    subtotal: "750.00",
    supplier_code: "SUP002",
    supplier_id: "cmdad9xow0001rceugmz15rts",
    supplier_name: "Kumara",
    tax_amount: "0.00",
    total_amount: "750.00",
    updated_at: "2025-07-20T14:25:18.897Z",
    username: null
  };

  const purchaseOrder = propsPO || defaultPO;
  const [grnNumber] = useState(`GRN-${Date.now().toString().slice(-6)}`);
  const currentDate = new Date().toISOString().split('T')[0];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: string | number) => {
    return `LKR ${parseFloat(amount.toString()).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Create a new window with the GRN content for PDF generation
    const printWindow = window.open('', '_blank');
    const grnContent = printRef.current?.innerHTML;
    
    if (printWindow && grnContent) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GRN-${grnNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333; 
            }
            .grn-container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white; 
            }
            .grn-header { 
              background: #f8fafc; 
              padding: 20px; 
              border-bottom: 2px solid #e2e8f0; 
              text-align: center; 
            }
            .grn-title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1e293b; 
              margin: 0 0 10px 0; 
            }
            .grn-number { 
              font-size: 18px; 
              color: #3b82f6; 
              margin: 0; 
            }
            .info-section { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              padding: 20px; 
            }
            .info-block { 
              background: #f9fafb; 
              padding: 15px; 
              border-radius: 8px; 
            }
            .info-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #374151; 
              margin-bottom: 10px; 
            }
            .info-item { 
              margin-bottom: 5px; 
            }
            .info-label { 
              font-weight: 600; 
              color: #4b5563; 
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            .items-table th, .items-table td { 
              border: 1px solid #d1d5db; 
              padding: 12px 8px; 
              text-align: left; 
            }
            .items-table th { 
              background: #f3f4f6; 
              font-weight: 600; 
            }
            .items-table td { 
              font-size: 14px; 
            }
            .text-center { 
              text-align: center; 
            }
            .text-right { 
              text-align: right; 
            }
            .summary-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-top: 2px solid #e2e8f0; 
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 10px; 
            }
            .summary-label { 
              font-weight: 600; 
            }
            .total-row { 
              font-size: 18px; 
              font-weight: bold; 
              color: #1e293b; 
              border-top: 1px solid #d1d5db; 
              padding-top: 10px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              padding: 20px; 
              border-top: 1px solid #e2e8f0; 
              color: #6b7280; 
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${grnContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Wait a bit for content to load, then print
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 100);
      }, 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Control Buttons */}
      <div className="mb-6 flex justify-end space-x-4 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print GRN
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </button>
      </div>

      {/* GRN Document */}
      <div ref={printRef} className="grn-container bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grn-header bg-gray-50 p-8 border-b-2 border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="grn-title text-3xl font-bold text-gray-800 mb-2">
                GOODS RECEIVED NOTE
              </h1>
              <p className="grn-number text-xl font-semibold text-blue-600">
                GRN #{grnNumber}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end mb-2">
                <Building className="w-5 h-5 mr-2 text-gray-600" />
                <span className="font-semibold text-gray-800">{purchaseOrder.branch_name}</span>
              </div>
              <p className="text-sm text-gray-600">Generated: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="info-section grid md:grid-cols-2 gap-8 p-8">
          {/* Purchase Order Information */}
          <div className="info-block bg-blue-50 p-6 rounded-lg">
            <h3 className="info-title text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Purchase Order Details
            </h3>
            <div className="space-y-3">
              <div className="info-item">
                <span className="info-label">PO Number:</span> {purchaseOrder.order_number}
              </div>
              <div className="info-item">
                <span className="info-label">Order Date:</span> {formatDate(purchaseOrder.order_date)}
              </div>
              <div className="info-item">
                <span className="info-label">Expected Date:</span> {formatDate(purchaseOrder.expected_date)}
              </div>
              <div className="info-item">
                <span className="info-label">PO Status:</span> 
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                  {purchaseOrder.status}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Branch:</span> {purchaseOrder.branch_name}
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="info-block bg-green-50 p-6 rounded-lg">
            <h3 className="info-title text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-green-600" />
              Supplier Information
            </h3>
            <div className="space-y-3">
              <div className="info-item">
                <span className="info-label">Supplier Name:</span> {purchaseOrder.supplier_name}
              </div>
              <div className="info-item">
                <span className="info-label">Supplier Code:</span> {purchaseOrder.supplier_code}
              </div>
              <div className="info-item">
                <span className="info-label">Supplier ID:</span> {purchaseOrder.supplier_id}
              </div>
              <div className="info-item">
                <span className="info-label">Invoice Number:</span> {purchaseOrder.invoice_number || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <Package className="w-5 h-5 mr-2 text-orange-600" />
            Items Received
          </h3>
          
          <div className="overflow-x-auto">
            <table className="items-table w-full border border-gray-300 rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-4 font-semibold">Product Details</th>
                  <th className="text-left p-4 font-semibold">SKU</th>
                  <th className="text-center p-4 font-semibold">Qty Ordered</th>
                  <th className="text-center p-4 font-semibold">Qty Received</th>
                  <th className="text-right p-4 font-semibold">Unit Cost</th>
                  <th className="text-right p-4 font-semibold">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.items.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-800">{item.product_name.trim()}</p>
                        <p className="text-sm text-gray-600">ID: {item.product_id}</p>
                        {item.batch_number && (
                          <p className="text-xs text-gray-500">Batch: {item.batch_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700">{item.product_sku.trim()}</td>
                    <td className="p-4 text-center font-medium">{item.quantity_ordered}</td>
                    <td className="p-4 text-center font-medium text-green-600">
                      {item.quantity_ordered} {/* Assuming full delivery */}
                    </td>
                    <td className="p-4 text-right">{formatCurrency(item.cost_price)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="summary-section bg-gray-50 p-8 border-t border-gray-200">
          <div className="max-w-md ml-auto">
            <div className="space-y-3">
              <div className="summary-row flex justify-between">
                <span className="summary-label">Subtotal:</span>
                <span>{formatCurrency(purchaseOrder.subtotal)}</span>
              </div>
              <div className="summary-row flex justify-between">
                <span className="summary-label">Tax Amount:</span>
                <span>{formatCurrency(purchaseOrder.tax_amount)}</span>
              </div>
              <div className="summary-row total-row flex justify-between text-lg font-bold border-t pt-3">
                <span>Total Amount:</span>
                <span className="text-green-600">{formatCurrency(purchaseOrder.total_amount)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Reception Details:</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Received Date:</span> {formatDate(new Date().toISOString())}</p>
                <p><span className="font-medium">Total Items:</span> {purchaseOrder.items_count}</p>
                <p><span className="font-medium">Total Quantity:</span> {purchaseOrder.items.reduce((sum, item) => sum + item.quantity_ordered, 0)}</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
              <div className="text-sm">
                <p>{purchaseOrder.notes || 'All items received in good condition as per purchase order specifications.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer border-t border-gray-200 p-6 text-center text-sm text-gray-600">
          <div className="grid md:grid-cols-3 gap-8 mb-4">
            <div>
              <p className="font-semibold mb-2">Received By:</p>
              <div className="border-t border-gray-300 mt-8 pt-2">
                <p>Signature & Date</p>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2">Verified By:</p>
              <div className="border-t border-gray-300 mt-8 pt-2">
                <p>Signature & Date</p>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2">Approved By:</p>
              <div className="border-t border-gray-300 mt-8 pt-2">
                <p>Signature & Date</p>
              </div>
            </div>
          </div>
          <p className="text-xs">This document was auto-generated from Purchase Order {purchaseOrder.order_number} on {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
};

export default GRNGenerator;