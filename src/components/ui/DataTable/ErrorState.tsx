import React from 'react';

interface ErrorStateProps {
  error: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  className = ""
}) => {
  return (
    <div className={`bg-red-900/20 border border-red-600 rounded-md p-4 ${className}`}>
      <p className="text-red-400">Error: {error}</p>
    </div>
  );
};