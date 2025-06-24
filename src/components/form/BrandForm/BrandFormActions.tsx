import React from 'react';
import { Button } from '@/components/ui/button';

interface BrandFormActionsProps {
  onCancel?: () => void;
  onSubmit: () => void;
  onExport?: () => void;
  isLoading: boolean;
  isEdit: boolean;
  showExport?: boolean;
}

export const BrandFormActions: React.FC<BrandFormActionsProps> = ({
  onCancel,
  onSubmit,
  onExport,
  isLoading,
  isEdit,
  showExport,
}) => (
  <div className="flex justify-end space-x-2 pt-4">
    {showExport && (
      <Button type="button" variant="outline" onClick={onExport}>
        Export
      </Button>
    )}
    {onCancel && (
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    )}
    <Button type="submit" disabled={isLoading} onClick={onSubmit}>
      {isEdit ? 'Update Brand' : 'Create Brand'}
    </Button>
  </div>
);