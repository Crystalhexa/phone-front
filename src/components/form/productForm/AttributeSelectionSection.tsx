import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Settings, Shuffle, Plus, X, Check, Trash2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Type definitions based on API response
interface AttributeValue {
  id: string;
  value: string;
}
 
interface Attribute {
  id: string;
  name: string;
  description: string;
  values: AttributeValue[];
}

interface ApiResponse {
  success: boolean;
  data: {
    attributes: Attribute[];
    total: number;
    limit: number;
    offset: number;
  };
  message: string;
  timestamp: string;
}

interface SelectedAttributeValue {
  id: string;
  value: string;
}

interface AddedAttributes {
  [attributeId: string]: SelectedAttributeValue[];
}

interface FormSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

interface AttributeSelectionSectionProps {
  attributes: Attribute[];
  selectedAttributes: AddedAttributes;
  onAttributeChange: (attributeId: string, values: SelectedAttributeValue[]) => void;
  onGenerateVariations: () => void;
  searchTerm: string;
  onSearch: (term: string) => void;
}

const FormSection: React.FC<FormSectionProps> = ({ icon: Icon, title, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</h3>
    </div>
    {children}
  </div>
);

export const AttributeSelectionSection: React.FC<AttributeSelectionSectionProps> = ({
  attributes,
  selectedAttributes,
  onAttributeChange,
  onGenerateVariations,
  searchTerm,
  onSearch
}) => {
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("");
  const [addedAttributes, setAddedAttributes] = useState<AddedAttributes>(selectedAttributes);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [activeAttributeId, setActiveAttributeId] = useState<string>("");
  const [tempSelectedValues, setTempSelectedValues] = useState<SelectedAttributeValue[]>([]);
  const [showValueDropdown, setShowValueDropdown] = useState<boolean>(false);

  // Sync internal state with props
  useEffect(() => {
    setAddedAttributes(selectedAttributes);
  }, [selectedAttributes]);

  const handleAttributeSelect = (attributeId: string): void => {
    setSelectedAttributeId(attributeId);
    setShowDropdown(false);
  };
  
  useEffect(() => {
    if (!showDropdown) {
      onSearch(""); // Reset when closed
    }
  }, [showDropdown]);

  const handleAddAttribute = (): void => {
    if (selectedAttributeId && !addedAttributes[selectedAttributeId]) {
      setActiveAttributeId(selectedAttributeId);
      setSelectedAttributeId("");
      setTempSelectedValues([]);
    }
  };

  const handleValueSelect = (attributeValue: AttributeValue): void => {
    const selectedValue: SelectedAttributeValue = {
      id: attributeValue.id,
      value: attributeValue.value
    };
    
    const isAlreadySelected = tempSelectedValues.some(v => v.id === attributeValue.id);
    if (!isAlreadySelected) {
      setTempSelectedValues(prev => [...prev, selectedValue]);
    }
    setShowValueDropdown(false);
  };

  const handleRemoveTempValue = (valueId: string): void => {
    setTempSelectedValues(prev => prev.filter(v => v.id !== valueId));
  };

  const handleSelectAll = (): void => {
    const attribute = attributes.find(attr => attr.id === activeAttributeId);
    if (attribute) {
      const allValues: SelectedAttributeValue[] = attribute.values.map(v => ({
        id: v.id,
        value: v.value
      }));
      setTempSelectedValues(allValues);
    }
  };

  const handleClearAll = (): void => {
    setTempSelectedValues([]);
  };

  const handleSaveValues = (): void => {
    if (activeAttributeId && tempSelectedValues.length > 0) {
      const newAddedAttributes = {
        ...addedAttributes,
        [activeAttributeId]: tempSelectedValues
      };
      setAddedAttributes(newAddedAttributes);
      onAttributeChange(activeAttributeId, tempSelectedValues);
      setActiveAttributeId("");
      setTempSelectedValues([]);
    }
  };

  const handleRemoveAttribute = (attributeId: string): void => {
    const newAttrs = { ...addedAttributes };
    delete newAttrs[attributeId];
    setAddedAttributes(newAttrs);
    onAttributeChange(attributeId, []);
  };

  const handleEditAttribute = (attributeId: string): void => {
    const currentValues = addedAttributes[attributeId];
    const attributeValues = Array.isArray(currentValues) ? currentValues : [];
    setActiveAttributeId(attributeId);
    setTempSelectedValues(attributeValues);
  };

  const selectedAttribute: Attribute | undefined = attributes.find(attr => attr.id === selectedAttributeId);
  const activeAttribute: Attribute | undefined = attributes.find(attr => attr.id === activeAttributeId);
  const availableAttributes: Attribute[] = attributes.filter(attr => !addedAttributes[attr.id]);

  return (
    <FormSection icon={Settings} title="Product Attributes">
      <div className="space-y-4">
        {/* Add Attribute Dropdown */}
        <div className="relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {selectedAttributeId ? selectedAttribute?.name : "Select Attribute"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {/* Search Input */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Search attributes..."
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>

                {/* Filtered Attributes */}
                {availableAttributes
                  .filter((attr) =>
                    attr.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((attribute) => (
                    <button
                      key={attribute.id}
                      type="button"
                      onClick={() => handleAttributeSelect(attribute.id)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      <div>
                        <div className="text-sm font-medium">{attribute.name}</div>
                        {attribute.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {attribute.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                {availableAttributes.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    No more attributes available
                  </div>
                )}
              </div>
            )}
          </div>
          
          {selectedAttributeId && (
            <Button
              type="button"
              size="sm"
              onClick={handleAddAttribute}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Attribute
            </Button>
          )}
        </div>

        {/* Active Attribute Value Selection */}
        {activeAttributeId && (
          <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Configure: {activeAttribute?.name}
            </h4>
            
            {/* Value Input Field */}
            <div className="relative mb-2">
              <div
                onClick={() => setShowValueDropdown(!showValueDropdown)}
                className="min-h-[32px] p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer flex flex-wrap gap-1 items-center"
              >
                {tempSelectedValues.map((selectedValue) => (
                  <Badge
                    key={selectedValue.id}
                    variant="secondary"
                    className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700"
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      handleRemoveTempValue(selectedValue.id);
                    }}
                  >
                    {selectedValue.value}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {tempSelectedValues.length === 0 ? "Click to select values" : ""}
                </span>
              </div>
              
              {showValueDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {activeAttribute?.values.map((attributeValue) => {
                    const isSelected = tempSelectedValues.some(v => v.id === attributeValue.id);
                    return (
                      <button
                        key={attributeValue.id}
                        type="button"
                        onClick={() => handleValueSelect(attributeValue)}
                        disabled={isSelected}
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {attributeValue.value}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Control Buttons */}
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                Select All
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                className="text-xs px-2 py-1 h-7"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
            
            {/* Save Button */}
            <Button
              type="button"
              size="sm"
              onClick={handleSaveValues}
              disabled={tempSelectedValues.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Save Attribute
            </Button>
          </div>
        )}

        {/* Added Attributes Display */}
        {Object.keys(addedAttributes).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Added Attributes:</h4>
            {Object.entries(addedAttributes).map(([attributeId, values]) => {
              const attribute = attributes.find(attr => attr.id === attributeId);
              const attributeValues = Array.isArray(values) ? values : [];
              return (
                <div key={attributeId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {attribute?.name}
                    </Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAttribute(attributeId)}
                        className="text-xs px-2 py-1 h-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveAttribute(attributeId)}
                        className="px-1 py-1 h-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(attributeValues) && attributeValues.length > 0 ? attributeValues.map((selectedValue) => (
                      <Badge key={selectedValue.id} variant="outline" className="text-xs px-1.5 py-0.5">
                        {selectedValue.value}
                      </Badge>
                    )) : (
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        No values selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Generate Variations Button */}
        {Object.keys(addedAttributes).length > 0 && (
          <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-600">
            <Button
              type="button"
              size="sm"
              onClick={onGenerateVariations}
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              <Shuffle className="h-3 w-3 mr-1" />
              Generate Variations
            </Button>
          </div>
        )}
      </div>
    </FormSection>
  );
};