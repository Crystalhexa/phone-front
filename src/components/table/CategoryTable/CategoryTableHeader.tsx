import React from 'react';
import { Plus, Columns3 } from "lucide-react";
import { Button } from '@/components/ui/button';

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
      <Button size="sm" onClick={onAddCategory}>
        <Plus className="mr-2 h-4 w-4" />
        Add Category
      </Button>
    </>
  );
};