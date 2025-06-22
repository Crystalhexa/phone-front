import React from 'react';
import { Plus, Columns3 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";

interface CategoryTableHeaderProps {
  onAddCategory: () => void;
}

export const CategoryTableHeader: React.FC<CategoryTableHeaderProps> = ({
  onAddCategory
}) => {
  return (
    <>
      <Button variant="outline" size="sm">
        <Columns3 className="mr-2 h-4 w-4" />
        Columns
      </Button>
      
      {/* Add Category Dialog */}
      <ReusableDialogForm
        triggerLabel={
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </>
        }
        title="Add New Category"
        description="Create a new category for your system"
        formType="category"
        formProps={{
          mode: 'create',
          onSuccess: () => {
            // Refresh the table or handle success
            console.log('Category created successfully');
          }
        }}
      />
    </>
  );
};