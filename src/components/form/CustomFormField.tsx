import Image from "next/image";
import { Control } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import PhoneInput from "react-phone-number-input";
import { E164Number } from "libphonenumber-js/core";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { DatePicker } from "../date-picker";

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
}


interface CustomProps {
  control: Control<any>;
  name: string;
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
  options?: { id: number; name: string }[]; // 👈 Add this
  trackById?: boolean; // 👈 NEW
}


const RenderInput = ({ field, props }: { field: any; props: CustomProps }) => {
  switch (props.fieldType) {
    case FormFieldType.INPUT:
    case FormFieldType.EMAIL:
    case FormFieldType.PASSWORD:
      return (
        <FormControl>
          <div className="relative flex items-center">
            {props.iconSrc && (
              <Image
                src={props.iconSrc}
                alt={props.iconAlt || "icon"}
                width={20}
                height={20}
                className="absolute left-2"
              />
            )}
            <Input
              type={
                props.fieldType === FormFieldType.EMAIL
                  ? "email"
                  : props.fieldType === FormFieldType.PASSWORD
                    ? "password"
                    : "text"
              }
              placeholder={props.placeholder}
              {...field}
              disabled={props.disabled}
              className={props.iconSrc ? "pl-10" : ""}
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
            className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
          />
        </FormControl>
      );

    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <label htmlFor={field.name} className="text-sm">
              {props.label}
            </label>
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
    <Select
      onValueChange={(val) => {
        const parsed = props.trackById ? Number(val) : val;
        field.onChange(parsed);
      }}
      value={props.trackById ? String(field.value) : field.value}
      disabled={props.disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={props.placeholder ?? "Select an option"} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{props.placeholder}</SelectLabel>
          {props.options?.map((opt) => (
            <SelectItem
              key={opt.id}
              value={props.trackById ? String(opt.id) : opt.name}
            >
              {opt.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );

    case FormFieldType.SKELETON:
      return props.renderSkeleton ? props.renderSkeleton(field) : null;
    default:
      return null;
  }
};

const CustomFormField = (props: CustomProps) => {
  const { control, name, label, fieldType } = props;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1 space-y-2">
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel>{label}</FormLabel>
          )}
          <RenderInput field={field} props={props} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
