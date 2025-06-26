import { Label } from "@/components/ui/label";

export const FormField = ({ 
  label, 
  required = false, 
  error, 
  children 
}: { 
  label: string; 
  required?: boolean; 
  error?: string; 
  children: React.ReactNode; 
}) => (
  <div>
    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && '*'}
    </Label>
    <div className="mt-1">
      {children}
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
);
