import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2 } from "lucide-react";
import { FormSection } from "./FormSection";

type VariationData = {
  id: string;
  attributes: { [key: string]: string };
  sku: string;
  costPrice: number;
  wholesalePrice?: number;
  retailPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
};

type AttributeValue = { id: string; value: string };
type AddedAttributes = { [attributeId: string]: AttributeValue[] };

// Updated error type to match the main form's validation structure
type VariationErrors = Array<{
  id?: { message?: string };
  attributes?: { message?: string };
  sku?: { message?: string };
  costPrice?: { message?: string };
  wholesalePrice?: { message?: string };
  retailPrice?: { message?: string };
  stockQuantity?: { message?: string };
  lowStockThreshold?: { message?: string };
  barcode?: { message?: string };
  weight?: { message?: string };
  dimensions?: { message?: string };
}> | undefined;

export const VariationsSection = ({
  variations,
  onUpdateVariation,
  onDeleteVariation,
  selectedAttributes,
  errors = [],
}: {
  variations: VariationData[];
  onUpdateVariation: (index: number, field: string, value: any) => void;
  onDeleteVariation: (index: number) => void;
  selectedAttributes: AddedAttributes;
  errors?: VariationErrors;
}) => {
  const getAttributeLabel = (attributeId: string, valueId: string) => {
    const values = selectedAttributes[attributeId];
    const match = values?.find((v) => v.id === valueId);
    return match?.value || "Unknown";
  };

  return (
    <FormSection icon={Edit2} title={`Product Variations (${variations.length})`}>
      <div className="space-y-4">
        {variations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No variations generated yet. Select attributes and click "Generate Variations".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Variation</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">SKU</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Cost Price</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Wholesale Price</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Retail Price</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Stock</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Low Stock</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Barcode</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Weight</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variations.map((variation, index) => (
                  <tr key={variation.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(variation.attributes).map(([attrId, valueId]) => (
                          <span 
                            key={attrId} 
                            className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                          >
                            {getAttributeLabel(attrId, valueId)}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="p-2">
                      <Input
                        value={variation.sku}
                        onChange={(e) => onUpdateVariation(index, "sku", e.target.value)}
                        className="w-32 text-sm"
                        placeholder="SKU"
                      />
                      {errors?.[index]?.sku && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.sku?.message}</p>
                      )}
                    </td>

                    {/* Cost Price */}
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variation.costPrice}
                        onChange={(e) =>
                          onUpdateVariation(index, "costPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-28 text-sm"
                        placeholder="0.00"
                      />
                      {errors?.[index]?.costPrice && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.costPrice?.message}</p>
                      )}
                    </td>

                    {/* Wholesale Price */}
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variation.wholesalePrice || ''}
                        onChange={(e) =>
                          onUpdateVariation(index, "wholesalePrice", e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-28 text-sm"
                        placeholder="0.00"
                      />
                      {errors?.[index]?.wholesalePrice && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.wholesalePrice?.message}</p>
                      )}
                    </td>

                    {/* Retail Price */}
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variation.retailPrice}
                        onChange={(e) =>
                          onUpdateVariation(index, "retailPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-28 text-sm"
                        placeholder="0.00"
                      />
                      {errors?.[index]?.retailPrice && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.retailPrice?.message}</p>
                      )}
                    </td>

                    {/* Stock Quantity */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={variation.stockQuantity}
                        onChange={(e) =>
                          onUpdateVariation(index, "stockQuantity", parseInt(e.target.value) || 0)
                        }
                        className="w-20 text-sm"
                        placeholder="0"
                      />
                      {errors?.[index]?.stockQuantity && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.stockQuantity?.message}</p>
                      )}
                    </td>

                    {/* Low Stock Threshold */}
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        value={variation.lowStockThreshold}
                        onChange={(e) =>
                          onUpdateVariation(index, "lowStockThreshold", parseInt(e.target.value) || 0)
                        }
                        className="w-20 text-sm"
                        placeholder="5"
                      />
                      {errors?.[index]?.lowStockThreshold && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.lowStockThreshold?.message}</p>
                      )}
                    </td>

                    {/* Barcode */}
                    <td className="p-2">
                      <Input
                        value={variation.barcode || ''}
                        onChange={(e) => onUpdateVariation(index, "barcode", e.target.value || undefined)}
                        className="w-32 text-sm"
                        placeholder="Barcode"
                      />
                      {errors?.[index]?.barcode && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.barcode?.message}</p>
                      )}
                    </td>

                    {/* Weight */}
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={variation.weight || ''}
                        onChange={(e) =>
                          onUpdateVariation(index, "weight", e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="w-24 text-sm"
                        placeholder="kg"
                      />
                      {errors?.[index]?.weight && (
                        <p className="text-xs text-red-500 mt-1">{errors[index]?.weight?.message}</p>
                      )}
                    </td>

                    {/* Delete Button */}
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteVariation(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FormSection>
  );
};