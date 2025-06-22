import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../input';


interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = ""
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e: { target: { value: string; }; }) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  );
};