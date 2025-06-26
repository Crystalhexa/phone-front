import { Button } from "@/components/ui/button";

// Form Actions Component
export const FormActions = ({ isSubmitting, onSubmit, onReset }: any) => (
  <div className="flex flex-col sm:flex-row gap-4 pt-6">
    <Button
      type="button"
      disabled={isSubmitting}
      onClick={onSubmit}
      className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 text-lg font-medium"
    >
      {isSubmitting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Creating Product...
        </>
      ) : (
        'Create Product'
      )}
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={onReset}
      className="flex-1 sm:flex-none px-8 py-3 text-lg border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
    >
      Reset Form
    </Button>
  </div>
);
