import { CategoryFormConfig } from "./category";

export interface FormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  config?: Partial<CategoryFormConfig>;
}

export interface SubcategoryPreviewProps {
  subcategories: string[];
  onRemove: (index: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  enableDragDrop?: boolean;
}

export interface CategoryFormActionsProps {
  onCancel?: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEdit: boolean;
  showExport?: boolean;
  onExport?: () => void;
}