import { BarChart3 } from "lucide-react";
import { FormField } from "./FormField";
import { FormSection } from "./FormSection";
import { Input } from "@/components/ui/input";

// Inventory & Warranty Section (for simple products only)
export const InventoryWarrantySection = ({ register, errors, isVariable }: any) => {
  if (isVariable) return null;

  return (
    <FormSection icon={BarChart3} title="Inventory & Warranty">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField label="Stock Quantity" required error={errors.stockQuantity?.message}>
          <Input
            type="number"
            {...register('stockQuantity', { valueAsNumber: true })}
            placeholder="0"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>

        <FormField label="Low Stock Threshold" required error={errors.lowStockThreshold?.message}>
          <Input
            type="number"
            {...register('lowStockThreshold', { valueAsNumber: true })}
            placeholder="5"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>

        <FormField label="Warranty Period (months)" error={errors.warrantyPeriod?.message}>
          <Input
            type="number"
            {...register('warrantyPeriod', { valueAsNumber: true })}
            placeholder="12"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
