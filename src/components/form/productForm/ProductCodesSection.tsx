import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { FormSection } from "./FormSection";
import { Scan, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export 
// Product Codes Section
const ProductCodesSection = ({ 
  register, 
  errors, 
  isScanning, 
  simulateBarcodeScan, 
  generateCustomBarcode,
  isVariable
}: any) => (
  <FormSection icon={Zap} title="Product Codes">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField label="SKU (Stock Keeping Unit)" required error={errors.sku?.message}>
        <Input
          {...register('sku')}
          placeholder="Auto-generated from product name"
          readOnly={isVariable}
          className={`${isVariable ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-900'} border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100`}
        />
        {isVariable && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Individual SKUs will be generated for each variation
          </p>
        )}
      </FormField>

      <FormField label="Barcode">
        <div className="flex gap-2">
          <Input
            {...register('barcode')}
            placeholder={isVariable ? "Will be set per variation" : "Scan or generate barcode"}
            readOnly={isVariable}
            className={`flex-1 ${isVariable ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-900'} border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100`}
          />
          {!isVariable && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={simulateBarcodeScan}
                disabled={isScanning}
                className="shrink-0 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Scan className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={generateCustomBarcode}
                className="shrink-0 px-3 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Generate
              </Button>
            </>
          )}
        </div>
        {isScanning && (
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">Scanning barcode...</p>
        )}
        {isVariable && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Barcodes will be managed individually for each variation
          </p>
        )}
      </FormField>
    </div>
  </FormSection>
);