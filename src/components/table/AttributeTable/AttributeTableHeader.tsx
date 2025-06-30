import React, { JSX } from 'react';
import { Plus } from "lucide-react";
import { ReusableDialogForm } from "@/components/form/ReusableDialogForm";

export function AttributeTableHeader(): JSX.Element {
  return (
    <>
      <ReusableDialogForm
        triggerLabel={
          <>
            <Plus className="mr-2 h-4 w-4" />
            Attribute
          </>
        }
        formType="attribute"
        formProps={{
          showExport: true,
          isEdit: false,
        }}
      />
    </>
  );
}
