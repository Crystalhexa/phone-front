import React from 'react';

export const BrandFormSkeleton: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto animate-pulse space-y-4 p-4">
    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
    <div className="h-24 bg-gray-200 rounded"></div>
    <div className="h-10 bg-gray-300 rounded w-1/4"></div>
  </div>
);
