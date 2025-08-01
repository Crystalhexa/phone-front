'use client';

import React from 'react';
import BarcodeLabel from './BarcodeLabel';
import { BarcodeLabelType } from '@/types/BarcodeLabelType';

type Props = {
  labelData: BarcodeLabelType;
  quantity: number;
};

const PrintLabels = ({ labelData, quantity }: Props) => {
  const labels = Array.from({ length: quantity });

  return (
    <div>
      <button onClick={() => window.print()} className="print:hidden px-4 py-2 bg-blue-600 text-white rounded">
        Print {quantity} Labels
      </button>

      <div className="flex flex-col gap-2">
       
      </div>
    </div>
  );
};

export default PrintLabels;
