'use client';

import React from 'react';
import Barcode from 'react-barcode';
import { BarcodeLabelType } from '@/types/BarcodeLabelType';

const BarcodeLabel = ({ barcodeValue, price }: BarcodeLabelType) => {
  return (
    <div className="w-[2in] h-[1in] p-[2mm] flex flex-col justify-between items-stretch font-sans text-[9pt] border border-black bg-white text-black print:page-break-after-always print:bg-white print:text-black overflow-hidden">

      {/* Barcode */}
      <div className="flex justify-center items-center bg-white">
        <Barcode
          value={barcodeValue}
          width={1}
          height={45}
          displayValue={true}
          background="#fff"
          lineColor="#000"
          margin={0}
        />
      </div>

      {/* Price */}
      <div className="text-right font-semibold text-[9pt] leading-none whitespace-nowrap">
        LKR {price}
      </div>
      
    </div>
  );
};

export default BarcodeLabel;
