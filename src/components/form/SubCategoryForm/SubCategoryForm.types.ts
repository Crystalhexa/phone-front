
export interface CategoryFormProps {
  categoryId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  showExport?: boolean;
}

export interface CategoryFormHeaderProps {
  isEdit: boolean;
  title?: string;
}

export interface CategoryFormActionsProps {
  onCancel?: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit: boolean;
  showExport?: boolean;
  onExport?: () => void;
}


