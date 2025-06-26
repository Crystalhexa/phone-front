import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { FormSection } from "./FormSection";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";

export const BasicInfoSection = ({ register, errors }: { register: any; errors: any }) => (
  <FormSection icon={Package} title="Basic Information">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <FormField label="Product Name" required error={errors.name?.message}>
          <Input
            {...register('name')}
            placeholder="Enter product name"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>

      <div className="md:col-span-2">
        <FormField label="Description" error={errors.description?.message}>
          <Textarea
            {...register('description')}
            placeholder="Enter product description"
            rows={3}
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          />
        </FormField>
      </div>
    </div>
  </FormSection>
);