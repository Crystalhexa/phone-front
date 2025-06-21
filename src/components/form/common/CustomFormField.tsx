import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export enum FormFieldType {
  INPUT = 'input',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  DATE_PICKER = 'datePicker',
  PHONE_INPUT = 'phoneInput',
}

interface CustomFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  fieldType: FormFieldType;
  className?: string;
  rows?: number;
}

const CustomFormField = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  disabled = false,
  required = false,
  helperText,
  fieldType,
  className,
  rows = 3,
}: CustomFormFieldProps<T>) => {
  const renderField = (field: any) => {
    switch (fieldType) {
      case FormFieldType.INPUT:
        return (
          <Input
            {...field}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(className)}
          />
        );
      case FormFieldType.TEXTAREA:
        return (
          <Textarea
            {...field}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={cn('resize-none', className)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            {renderField(field)}
          </FormControl>
          {helperText && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {helperText}
            </p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;