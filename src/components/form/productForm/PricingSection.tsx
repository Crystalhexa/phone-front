import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { FormSection } from "./FormSection";
import { DollarSign } from "lucide-react";

export // Pricing Section (for simple products only)
const PricingSection = ({ register, errors, isVariable }: any) => {
  if (isVariable) return null;

  return (
    <FormSection icon={DollarSign} title="Pricing">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField label="Cost Price" required error={errors.costPrice?.message}>
          <Input
            type="number"
            step="0.01"
            {...register('costPrice', { valueAsNumber: true })}
            placeholder="0.00"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>

        <FormField label="Wholesale Price" error={errors.wholesalePrice?.message}>
          <Input
            type="number"
            step="0.01"
            {...register('wholesalePrice', { valueAsNumber: true })}
            placeholder="0.00"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>

        <FormField label="Retail Price" required error={errors.retailPrice?.message}>
          <Input
            type="number"
            step="0.01"
            {...register('retailPrice', { valueAsNumber: true })}
            placeholder="0.00"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>
    </FormSection>
  );
};