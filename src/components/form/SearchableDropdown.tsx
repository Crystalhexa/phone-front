import { ChevronDown, Search, X, Check } from "lucide-react";
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
  size?: 'sm' | 'md' | 'lg';
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
  isSearching = false,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.id === value);

  console.log(options)
  // Use external search term if provided, otherwise use local search
  const currentSearchTerm = onSearch ? searchTerm : localSearchTerm;
  
  // Filter options based on search term
  const filteredOptions = onSearch 
    ? options // If using external search, options are already filtered from the API
    : options.filter(option =>
        option.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        option.code?.toLowerCase().includes(localSearchTerm.toLowerCase())
      );

  // Size variants
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-sm',
      dropdown: 'max-h-48',
      option: 'px-2 py-1.5 text-sm',
      search: 'px-2 py-1 text-xs',
      logo: 'w-3 h-3'
    },
    md: {
      button: 'px-3 py-2 text-sm',
      dropdown: 'max-h-56',
      option: 'px-3 py-2 text-sm',
      search: 'px-3 py-1.5 text-sm',
      logo: 'w-4 h-4'
    },
    lg: {
      button: 'px-4 py-2.5 text-base',
      dropdown: 'max-h-64',
      option: 'px-4 py-2.5 text-base',
      search: 'px-4 py-2 text-sm',
      logo: 'w-5 h-5'
    }
  };

  const currentSize = sizeClasses[size];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setLocalSearchTerm('');
        setFocusedIndex(-1);
        if (onSearch) {
          onSearch('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onSearch]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearchChange = (term: string) => {
    if (onSearch) {
      onSearch(term);
    } else {
      setLocalSearchTerm(term);
    }
    setFocusedIndex(-1);
  };

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setIsOpen(false);
    setLocalSearchTerm('');
    setFocusedIndex(-1);
    if (onSearch) {
      onSearch('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full text-left bg-background border border-input rounded-lg shadow-sm 
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${currentSize.button}
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-blue-950 hover:border-accent-foreground/20 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}
        `}
      >
        <div className="flex items-center justify-between min-h-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedOption?.logo && (
              <img 
                src={selectedOption.logo} 
                alt={selectedOption.name} 
                className={`${currentSize.logo} rounded flex-shrink-0`} 
              />
            )}
            <span className={`truncate ${selectedOption ? 'text-foreground' : 'text-muted-foreground'}`}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
            {selectedOption?.code && size !== 'sm' && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                ({selectedOption.code})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {selectedOption && !disabled && (
              <div
                onClick={clearSelection}
                className="p-0.5 hover:bg-muted rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
              >
                <X className="w-3 h-3" />
              </div>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Search Input */}
          <div className="border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              {isSearching && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={currentSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={`
                  w-full pl-7 pr-8 bg-transparent text-foreground border-0 
                  focus:outline-none focus:ring-0 placeholder:text-muted-foreground
                  ${currentSize.search}
                `}
              />
            </div>
          </div>
          
          {/* Options List */}
          <div className={`overflow-y-auto ${currentSize.dropdown}`}>
            {/* Clear/All option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`
                w-full text-left hover:bg-accent hover:text-accent-foreground
                border-b border-border/50 transition-colors duration-150
                ${currentSize.option}
                ${!value ? 'bg-accent/50' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground italic">All {placeholder.toLowerCase()}</span>
                {!value && <Check className="w-3 h-3 text-primary" />}
              </div>
            </button>
            
            {/* Filtered Options */}
            {filteredOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`
                  w-full text-left hover:bg-blue-950 hover:text-accent-foreground
                  transition-colors duration-150 ${currentSize.option}
                  ${focusedIndex === index ? 'bg-accent text-accent-foreground' : ''}
                  ${value === option.id ? 'bg-accent/50' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option.logo && (
                      <img 
                        src={option.logo} 
                        alt={option.name} 
                        className={`${currentSize.logo} rounded flex-shrink-0`} 
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{option.name}</div>
                      {(option.code || option.description) && size !== 'sm' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {option.code && <span>Code: {option.code}</span>}
                          {option.description && (
                            <span className="truncate">{option.description}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {value === option.id && (
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
            
            {/* Empty State */}
            {filteredOptions.length === 0 && !isSearching && (
              <div className={`text-muted-foreground text-center ${currentSize.option}`}>
                {currentSearchTerm ? (
                  <div>
                    <div className="font-medium">No results found</div>
                    <div className="text-xs">Try searching with different terms</div>
                  </div>
                ) : (
                  emptyMessage
                )}
              </div>
            )}
            
            {/* Loading State */}
            {isSearching && (
              <div className={`text-muted-foreground text-center ${currentSize.option}`}>
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Searching...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};