import React from 'react';


interface TableHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ""
}) => {
  if (!title && !subtitle && !actions) return null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-2xl font-bold text-white">{title}</h2>}
          {subtitle && <p className="text-gray-400">{subtitle}</p>}
        </div>
      )}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
