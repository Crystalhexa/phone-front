import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Edit2, Trash2 } from "lucide-react";
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

export const VariationsSection = ({
  variations,
  onUpdateVariation,
  onDeleteVariation,
  selectedAttributes,
}: {
  variations: VariationData[];
  onUpdateVariation: (index: number, field: string, value: any) => void;
  onDeleteVariation: (index: number) => void;
  selectedAttributes: AddedAttributes;
}) => {
 
  const getAttributeLabel = (attributeId: string, valueId: string) => {
    const values = selectedAttributes[attributeId];
    const match = values?.find(v => v.id === valueId);
    return match?.value||'Unknown';
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
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Retail Price</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Stock</th>
                  <th className="text-left p-2 font-medium text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {variations.map((variation, index) => (
                  <tr key={variation.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(variation.attributes).map(([attrId, valueId]) => (
                           <h1>{getAttributeLabel(attrId, valueId)}</h1>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        value={variation.sku}
                        onChange={(e) => onUpdateVariation(index, "sku", e.target.value)}
                        className="w-24 text-sm"
                        placeholder="SKU"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={variation.costPrice}
                        onChange={(e) =>
                          onUpdateVariation(index, "costPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={variation.retailPrice}
                        onChange={(e) =>
                          onUpdateVariation(index, "retailPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-sm"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={variation.stockQuantity}
                        onChange={(e) =>
                          onUpdateVariation(index, "stockQuantity", parseInt(e.target.value) || 0)
                        }
                        className="w-20 text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteVariation(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
