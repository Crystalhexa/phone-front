"use client";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import { FormProvider, useForm } from "react-hook-form";


interface SearchForm {
  option: string;
  id: string;
}
export default function SearchWithSelect() {

  const handleSearch = async () => {
    const response = await fetch(`/api/return/${form.getValues("option")}`, {
      method: 'POST',
      headers:{
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({barcode: form.getValues('id')})
    })
  };

  const form = useForm<SearchForm>({
    defaultValues: {
      option: 'barcode',
      id: '',
    }
  })

  return (
    <div className="flex gap-2 items-center w-full max-w-xl mx-auto">
      <FormProvider {...form}>
        <CustomFormField
          name="option"
          label=""
          fieldType={FormFieldType.SELECT}
          control={form.control}
          options={[
            { label: "Barcode", value: "barcode" },
            { label: "Sales order", value: "sales_order" },
          ]}
          placeholder="Select option" 
        />
        {/* Search Input */}
        <CustomFormField
          name="id"
          label=""
          fieldType={FormFieldType.INPUT}
          placeholder="Search..."
          control={form.control}
        />
        {/* Search Button */}
        <Button onClick={handleSearch}>
          <Search className="w-4 h-4 mr-1" />
          Search
        </Button>
      </FormProvider>
    </div>
  );
}
