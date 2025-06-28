import { Settings } from "lucide-react";
import { FormSection } from "./FormSection";
import { FormField } from "./FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brand } from "@/state/brand";

type Option = {
  id: string;
  name: string;
  code?: string;
};

type Props = {
  categories: Option[];
  subcategories: Option[];
  brands: Brand[];
  setValue: (field: string, value: any) => void;
  watchedCategory: string | null;
  errors: Record<string, { message?: string }>;
  onCategoryChange?: (categoryId: string) => void;
};

export const CategoryBrandSection = ({
  categories,
  subcategories,
  brands,
  setValue,
  watchedCategory,
  errors,
  onCategoryChange,
}: Props) => (
  <FormSection icon={Settings} title="Category & Brand">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {/* Category */}
    <FormField label="Category" required error={errors.categoryId?.message}>
      <Select
        onValueChange={(value) => {
          setValue("categoryId", value);
          onCategoryChange?.(value);
        }}
      >
        <SelectTrigger className="w-full min-w-[200px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          {categories.map((category) => (
            <SelectItem
              key={category.id}
              value={category.id}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>

    {/* Subcategory */}
    <FormField label="Subcategory" required error={errors.subcategoryId?.message}>
      <Select
        onValueChange={(value) => setValue("subcategoryId", value)}
        disabled={!watchedCategory}
      >
        <SelectTrigger className="w-full min-w-[200px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600">
          <SelectValue placeholder="Select subcategory" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          {subcategories.map((subcategory) => (
            <SelectItem
              key={subcategory.id}
              value={subcategory.id}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {subcategory.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>

    {/* Brand */}
    <FormField label="Brand" required error={errors.brandId?.message}>
      <Select onValueChange={(value) => setValue("brandId", value)}>
        <SelectTrigger className="w-full min-w-[200px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600">
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          {brands.map((brand) => (
            <SelectItem
              key={brand.id}
              value={brand.id}
              className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                {brand.code && (
                  <Badge
                    variant="outline"
                    className="text-xs border border-gray-300 dark:border-gray-600"
                  >
                    {brand.code}
                  </Badge>
                )}
                {brand.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  </div>
</FormSection>

);
