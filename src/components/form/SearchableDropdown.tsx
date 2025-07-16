import { ChevronDown, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
// Searchable Dropdown Component
interface SearchableDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  options: Array<{ id: string; name: string; description?: string; logo?: string; code?: string }>;
  disabled?: boolean;
  emptyMessage?: string;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  isSearching?: boolean;
}
export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  options,
  disabled = false,
  emptyMessage = "No options available",
  onSearch,
  searchTerm = '',
  isSearching = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.id === value);
  
  // Use external search term if provided, otherwise use local search
  const currentSearchTerm = onSearch ? searchTerm : localSearchTerm;
  
  // Filter options based on search term
  const filteredOptions = onSearch 
    ? options // If using external search, options are already filtered from the API
    : options.filter(option =>
        option.name.toLowerCase().includes(localSearchTerm.toLowerCase())
      );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setLocalSearchTerm('');
        // Reset external search when closing
        if (onSearch) {
          onSearch('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearch]);

  const handleSearchChange = (term: string) => {
    if (onSearch) {
      onSearch(term);
    } else {
      setLocalSearchTerm(term);
    }
  };

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setIsOpen(false);
    setLocalSearchTerm('');
    // Reset external search when selecting
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedOption?.logo && (
              <img src={selectedOption.logo} alt={selectedOption.name} className="w-4 h-4 rounded" />
            )}
            <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
            {selectedOption?.code && (
              <span className="text-xs text-gray-400">({selectedOption.code})</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              {isSearching && (
                <div className="absolute right-2 top-2 animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              <input
                type="text"
                value={currentSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-8 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
            >
              <span className="text-gray-500">All {placeholder.toLowerCase()}</span>
            </button>
            
            {filteredOptions.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                <div className="flex items-center gap-2">
                  {option.logo && (
                    <img src={option.logo} alt={option.name} className="w-4 h-4 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{option.name}</div>
                    {option.code && (
                      <div className="text-xs text-gray-500">Code: {option.code}</div>
                    )}
                    {option.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{option.description}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
            
            {filteredOptions.length === 0 && !isSearching && (
              <div className="px-3 py-2 text-gray-500 text-center">
                {currentSearchTerm ? `No results found for "${currentSearchTerm}"` : emptyMessage}
              </div>
            )}
            
            {isSearching && (
              <div className="px-3 py-2 text-gray-500 text-center flex items-center justify-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                Searching...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};