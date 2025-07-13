import React, { JSX } from 'react';
import { Plus, Columns3 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";

interface SubCategoryTableHeaderProps {
  categoryId: string;
}

export function SubCategoryTableHeader({ categoryId }: SubCategoryTableHeaderProps): JSX.Element {
  return (
    <>
      <Button variant="outline" size="sm">
        <Columns3 className="mr-2 h-4 w-4" />
        Columns
      </Button>

      {/* Add Subcategory Dialog */}
      <ReusableDialogForm
        triggerLabel={
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Sub Category
          </>
        }
        formType="subcategory"
        formProps={{
          showExport: true,
          isEdit: false,
          categoryId, // 👈 Pass categoryId if your form needs it
        }}
      />
    </>
  );
}
