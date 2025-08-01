'use client';

import React from 'react';
import Barcode from 'react-barcode';

interface BarcodeData {
  id: string;
  code: string;
  type: string;
  status: string;
  purchased_at: string;
  purchase_cost: number;
  condition: string;
  warranty_expiry: string | null;
  location_branch: string | null;
  notes: string | null;
}

const BarcodeLabel = (barcode: BarcodeData) => {
  return (
    <div className="w-[2in] h-[1in] p-[2mm] flex flex-col justify-between items-stretch font-sans text-[9pt] border border-black bg-white text-black print:page-break-after-always print:bg-white print:text-black overflow-hidden">
      {/* Barcode */}
      <div className="flex justify-center items-center bg-white">
        <Barcode
          value={barcode.code}
          width={1}
          height={45}
          displayValue={true}
          background="#fff"
          lineColor="#000"
          margin={0}
        />
      </div>

      {/* Price - Fixed to show purchase_cost instead of purchased_at */}
      <div className="text-right font-semibold text-[9pt] leading-none whitespace-nowrap">
        LKR {barcode.purchase_cost.toFixed(2)}
      </div>
    </div>
  );
};

export default BarcodeLabel;