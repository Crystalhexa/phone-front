import { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import PhoneInput from "react-phone-number-input";
import { E164Number } from "libphonenumber-js/core";
import { DatePicker } from "@/components/date-picker";
import { cn } from "@/lib/utils";
import Image from "next/image";

export enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  PHONE_INPUT = "phone-input",
  CHECKBOX = "checkbox",
  DATE_PICKER = "date-picker",
  SELECT = "select",
  SKELETON = "skeleton",
  EMAIL = "email",
  PASSWORD = "password",
  NUMBER = "number",
  FILE = "file",
}

export interface SelectOption {
  id: string | number;
  name: string;
  value?: string | number;
  disabled?: boolean;
}

interface CustomProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  iconSrc?: string;
  iconAlt?: string;
  disabled?: boolean;
  dateFormat?: string;
  showTimeSelect?: boolean;
  children?: React.ReactNode;
  renderSkeleton?: (field: any) => React.ReactNode;
  fieldType: FormFieldType;
  options?: SelectOption[];
  trackById?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  rows?: number; // For textarea
  min?: number; // For number input
  max?: number; // For number input
  step?: number; // For number input
  accept?: string; // For file input
  multiple?: boolean; // For file input
  required?: boolean;
  description?: string;
}

const RenderInput = <T extends FieldValues>({
  field,
  props,
}: {
  field: any;
  props: CustomProps<T>;
}) => {
  const inputBaseClass = cn(
    "w-full",
    props.iconSrc && "pl-10",
    props.inputClassName
  );

  switch (props.fieldType) {
    case FormFieldType.INPUT:
    case FormFieldType.EMAIL:
    case FormFieldType.PASSWORD:
    case FormFieldType.NUMBER:
      return (
        <FormControl>
          <div className="relative flex items-center">
            {props.iconSrc && (
              <Image
                src={props.iconSrc}
                alt={props.iconAlt || "icon"}
                width={20}
                height={20}
                className="absolute left-2 z-10"
              />
            )}
            <Input
              type={
                props.fieldType === FormFieldType.EMAIL
                  ? "email"
                  : props.fieldType === FormFieldType.PASSWORD
                    ? "password"
                    : props.fieldType === FormFieldType.NUMBER
                      ? "number"
                      : "text"
              }
              placeholder={props.placeholder}
              {...field}
              disabled={props.disabled}
              className={inputBaseClass}
              min={props.fieldType === FormFieldType.NUMBER ? props.min : undefined}
              max={props.fieldType === FormFieldType.NUMBER ? props.max : undefined}
              step={props.fieldType === FormFieldType.NUMBER ? props.step : undefined}
              required={props.required}
            />
          </div>
        </FormControl>
      );

    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            placeholder={props.placeholder}
            {...field}
            disabled={props.disabled}
            className={props.inputClassName}
            rows={props.rows}
            required={props.required}
          />
        </FormControl>
      );

    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <PhoneInput
            defaultCountry="US"
            placeholder={props.placeholder}
            international
            withCountryCallingCode
            value={field.value as E164Number | undefined}
            onChange={field.onChange}
            disabled={props.disabled}
            className={cn(
              "w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              props.inputClassName
            )}
          />
        </FormControl>
      );

    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-start space-x-2">
            <Checkbox
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={props.disabled}
              required={props.required}
              className="mt-0.5"
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={field.name}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {props.label}
                {props.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {props.description && (
                <p className="text-xs text-muted-foreground">
                  {props.description}
                </p>
              )}
            </div>
          </div>
        </FormControl>
      );

    case FormFieldType.DATE_PICKER:
      return (
        <FormControl>
          <DatePicker
            value={field.value}
            onChange={field.onChange}
            placeholder={props.placeholder}
            dateFormat={props.dateFormat}
          />
        </FormControl>
      );

    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select
            onValueChange={(val) => {
              // Handle different value types based on trackById and option configuration
              let parsedValue = val;
              if (props.trackById) {
                // If trackById is true, convert to number if possible
                const numVal = Number(val);
                parsedValue = isNaN(numVal) ? val : String(numVal);
              } else {
                // Check if option has custom value, otherwise use the selected value
                const selectedOption = props.options?.find(
                  opt => String(props.trackById ? opt.id : opt.value || opt.name) === val
                );
                parsedValue = selectedOption?.value !== undefined ? String(selectedOption.value) : val;
              }
              field.onChange(parsedValue);
            }}
            value={field.value ? String(field.value) : ""}
            disabled={props.disabled}
            required={props.required}
          >
            <SelectTrigger className={cn("w-full", props.inputClassName)}>
              <SelectValue placeholder={props.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {props.placeholder && <SelectLabel>{props.placeholder}</SelectLabel>}
                {props.options?.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={String(props.trackById ? opt.id : opt.value || opt.name)}
                    disabled={opt.disabled}
                  >
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormControl>
      );

    case FormFieldType.FILE:
      return (
        <FormControl>
          <div className="relative">
            {props.iconSrc && (
              <Image
                src={props.iconSrc}
                alt={props.iconAlt || "icon"}
                width={20}
                height={20}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10"
              />
            )}
            <Input
              type="file"
              accept={props.accept}
              multiple={props.multiple}
              onChange={(e) => {
                const files = e.target.files;
                if (props.multiple) {
                  field.onChange(files ? Array.from(files) : []);
                } else {
                  field.onChange(files?.[0] || null);
                }
              }}
              disabled={props.disabled}
              className={inputBaseClass}
              required={props.required}
            />
          </div>
        </FormControl>
      );

    case FormFieldType.SKELETON:
      return props.renderSkeleton ? props.renderSkeleton(field) : null;

    default:
      console.warn(`Unknown field type: ${props.fieldType}`);
      return null;
  }
};

const CustomFormField = <T extends FieldValues = FieldValues>(
  props: CustomProps<T>
) => {
  const { control, name, label, fieldType, className, labelClassName, required } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex-1 space-y-2", className)}>
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className={cn(labelClassName)}>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <RenderInput field={field} props={props} />
          {props.description && fieldType !== FormFieldType.CHECKBOX && (
            <p className="text-xs text-muted-foreground">{props.description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;