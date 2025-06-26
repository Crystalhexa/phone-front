import { AlertCircle, CheckCircle } from "lucide-react";

 
// Status Message Component
export const StatusMessage = ({ status }: { status: string }) => {
  if (status === 'success') {
    return (
      <div className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
        <div className="text-green-800 dark:text-green-200">
          <h4 className="font-semibold">Success!</h4>
          <p>Product has been created successfully.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="text-red-800 dark:text-red-200">
          <h4 className="font-semibold">Error!</h4>
          <p>There was an error creating the product. Please try again.</p>
        </div>
      </div>
    );
  }

  return null;
};
