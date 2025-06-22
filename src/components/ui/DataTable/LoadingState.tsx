import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className = ""
}) => {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      <span className="ml-2 text-gray-300">{message}</span>
    </div>
  );
};