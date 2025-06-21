import { CategoryFormConfig } from '@/types/category';

export interface CategoryFormProps {
  categoryId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  config?: Partial<CategoryFormConfig>;
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

export interface SubcategoryPreviewProps {
  subcategories: string[];
  onRemove: (index: number) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  enableDragDrop?: boolean;
}

export interface SubcategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (subcategory: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  separator?: string;
  suggestions?: string[];
  showSuggestions?: boolean;
}

export interface CategoryFormSkeletonProps {
  showPreview?: boolean;
}
