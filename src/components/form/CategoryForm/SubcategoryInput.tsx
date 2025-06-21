import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, Lightbulb } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { SubcategoryInputProps } from './CategoryForm.types';
import { COMMON_SUBCATEGORIES } from '@/lib/constants/categoryConstants';
import { stringToSubcategories } from '@/lib/utils/subcategoryUtils';

export const SubcategoryInput: React.FC<SubcategoryInputProps> = ({
  value,
  onChange,
  onAdd,
  disabled = false,
  placeholder = "Type subcategory and press Enter",
  maxLength = 30,
  separator = '|',
  suggestions = [],
  showSuggestions = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [debouncedInputValue] = useDebounce(inputValue, 300);
  
  // Get existing subcategories to avoid duplicates
  const existingSubcategories = stringToSubcategories(value, separator);
  
  // Generate suggestions based on input and common subcategories
  useEffect(() => {
    if (!debouncedInputValue.trim() || !showSuggestions) {
      setFilteredSuggestions([]);
      return;
    }
    
    const searchTerm = debouncedInputValue.toLowerCase();
    const allSuggestions = [
      ...suggestions,
      ...Object.values(COMMON_SUBCATEGORIES).flat(),
    ];
    
    const filtered = allSuggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(searchTerm) &&
        !existingSubcategories.some(existing => 
          existing.toLowerCase() === suggestion.toLowerCase()
        )
      )
      .slice(0, 8); // Limit to 8 suggestions
    
    setFilteredSuggestions(filtered);
    setSelectedSuggestionIndex(-1);
  }, [debouncedInputValue, suggestions, existingSubcategories, separator, showSuggestions]);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
      setShowSuggestionsList(true);
    }
  };
  
  // Handle adding subcategory
  const handleAddSubcategory = (subcategory: string) => {
    const trimmedSubcategory = subcategory.trim();
    if (!trimmedSubcategory) return;
    
    // Check if it already exists
    const isDuplicate = existingSubcategories.some(existing => 
      existing.toLowerCase() === trimmedSubcategory.toLowerCase()
    );
    
    if (!isDuplicate) {
      onAdd(trimmedSubcategory);
      setInputValue('');
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);
    }
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && filteredSuggestions[selectedSuggestionIndex]) {
        handleAddSubcategory(filteredSuggestions[selectedSuggestionIndex]);
      } else if (inputValue.trim()) {
        handleAddSubcategory(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleAddSubcategory(suggestion);
  };
  
  // Handle input focus
  const handleInputFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestionsList(true);
    }
  };
  
  // Handle input blur
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestionsList(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };
  
  // Get smart suggestions based on category context
  const getSmartSuggestions = () => {
    const categoryName = value.toLowerCase();
    
    // Find matching category in common subcategories
    const matchingCategory = Object.keys(COMMON_SUBCATEGORIES).find(cat => 
      categoryName.includes(cat.toLowerCase())
    );
    
    if (matchingCategory) {
      return COMMON_SUBCATEGORIES[matchingCategory].filter(sub =>
        !existingSubcategories.some(existing => 
          existing.toLowerCase() === sub.toLowerCase()
        )
      );
    }
    
    return [];
  };
  
  const smartSuggestions = getSmartSuggestions();
  
  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        
        {/* Add Button */}
        <button
          type="button"
          onClick={() => handleAddSubcategory(inputValue)}
          disabled={disabled || !inputValue.trim()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add subcategory"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      {/* Character Counter */}
      {inputValue.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 text-right">
          {inputValue.length}/{maxLength}
        </div>
      )}
      
      {/* Suggestions Dropdown */}
      {showSuggestionsList && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-600"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                index === selectedSuggestionIndex
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="font-medium">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && !showSuggestionsList && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Suggested subcategories:
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {smartSuggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleAddSubcategory(suggestion)}
                disabled={disabled}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Help Text */}
      <div className="text-xs text-gray-500 mt-1">
        Type and press Enter to add, or click suggestions above
      </div>
    </div>
  );
};