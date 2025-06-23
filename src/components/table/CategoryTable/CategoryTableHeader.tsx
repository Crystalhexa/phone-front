import React from 'react';
import { Plus, Columns3 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";

interface CategoryTableHeaderProps {
}

export const CategoryTableHeader: React.FC<CategoryTableHeaderProps> = ({
  
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
        formType="category"
        formProps={{
          showExport:true,
          isEdit: false,
        }}
      />
    </>
  );
};