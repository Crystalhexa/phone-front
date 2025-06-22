import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TableAction } from '@/types/table';
import { Button } from '../button';
import {  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger  } from '../dropdown-menu';

interface ActionCellProps {
  actions: TableAction[];
  row: any;
}

export const ActionCell: React.FC<ActionCellProps> = ({ actions, row }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            variant={action.variant}
            onClick={() => action.onClick(row)}
          >
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
