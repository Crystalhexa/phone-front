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

interface ReusableDialogFormProps {
  triggerLabel?: ReactNode;
  title?: string;
  description?: string;
  formType: "category" | "zonal";
  formProps?: any;
  // Add these props for external state control
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Make trigger optional when controlling externally
  showTrigger?: boolean;
}

export function ReusableDialogForm({
  triggerLabel = "Open Dialog",
  title = "",
  description,
  formType,
  formProps = {},
  open,
  onOpenChange,
  showTrigger = true,
}: ReusableDialogFormProps) {
  const renderForm = () => {
    switch (formType) {
      case "category":
        return <CategoryForm {...formProps} />;
      case "zonal":
        return <div>Zonal Form Coming Soon</div>;
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
            <DialogTitle className="text-xl">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-6">{renderForm()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}