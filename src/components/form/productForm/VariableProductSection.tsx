import { Shuffle } from "lucide-react";
import { FormSection } from "./FormSection";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const VariableProductSection = ({ 
  register, 
  isVariable, 
  onVariableToggle 
}: { 
  register: any; 
  isVariable: boolean; 
  onVariableToggle: (checked: boolean) => void; 
}) => (
  <FormSection icon={Shuffle} title="Product Type">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="isVariable"
        checked={isVariable}
        onCheckedChange={onVariableToggle}
        className="border-gray-300 dark:border-gray-600"
      />
      <Label htmlFor="isVariable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        This is a variable product (has variations like size, color, etc.)
      </Label>
    </div>
    {isVariable && (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Variable products allow you to create multiple variations with different attributes, prices, and stock levels.
        </p>
      </div>
    )}
  </FormSection>
);
