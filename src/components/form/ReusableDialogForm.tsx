import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReactNode } from "react";
import CategoryForm from "./CategoryForm";
import BrandForm from "./BrandForm/BrandForm";
import AttributeForm from "./Attribute/AttributeForm";

interface ReusableDialogFormProps {
  triggerLabel?: ReactNode;
  title?: string;
  description?: string;
  formType: "category" | "brand" |"attribute";
  formProps?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function ReusableDialogForm({
  triggerLabel = "Open Dialog",
  formType,
  formProps = {},
  open,
  onOpenChange,
  showTrigger = true,
}: ReusableDialogFormProps) {

  console.log("formProps",formProps)
  const renderForm = () => {
    switch (formType) {
      case "category":
        return <CategoryForm {...formProps} />;
      case "brand":
        return <BrandForm {...formProps} />;
      case "attribute":
        return <AttributeForm {...formProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" className="whitespace-nowrap">
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl"></DialogTitle>
          </DialogHeader>
          <div className="space-y-6">{renderForm()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}