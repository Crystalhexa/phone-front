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
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import PhoneInput from "react-phone-number-input";
import { E164Number } from "libphonenumber-js/core";
import { DatePicker } from "../date-picker";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Edit, Save, X, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

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
  // Enhanced editing props
  editable?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  displayValue?: string; // Custom display value when not editing
  formatDisplayValue?: (value: any) => string; // Function to format display value
  // New props for enhanced functionality
  editMode?: 'inline' | 'toggle'; // inline shows edit/save buttons, toggle shows single edit button
  showEditIcon?: boolean; // Show/hide edit icon
  editIconPosition?: 'right' | 'left'; // Position of edit icon
  confirmEdit?: boolean; // Show confirmation before saving
  confirmMessage?: string; // Custom confirmation message
  validateOnEdit?: boolean; // Validate field when editing
  preserveValueOnCancel?: boolean; // Keep original value when canceling
  editButtonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  editButtonSize?: 'sm' | 'default' | 'lg';
  readOnlyStyle?: 'muted' | 'bordered' | 'plain'; // Different styles for read-only display
  allowQuickEdit?: boolean; // Double-click to edit
}

// Enhanced helper function to format display values
const formatDisplayValue = (
  value: any, 
  fieldType: FormFieldType, 
  options?: SelectOption[], 
  trackById?: boolean,
  customFormatter?: (value: any) => string
): string => {
  // Use custom formatter if provided
  if (customFormatter) {
    try {
      return customFormatter(value);
    } catch (error) {
      console.warn('Custom formatter error:', error);
    }
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  switch (fieldType) {
    case FormFieldType.SELECT:
      if (options) {
        const selectedOption = options.find(opt => 
          String(trackById ? opt.id : opt.value || opt.name) === String(value)
        );
        return selectedOption ? selectedOption.name : String(value);
      }
      return String(value);
    
    case FormFieldType.CHECKBOX:
      return value ? 'Yes' : 'No';
    
    case FormFieldType.DATE_PICKER:
      if (value) {
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch {
          return String(value);
        }
      }
      return '-';
    
    case FormFieldType.NUMBER:
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    
    case FormFieldType.PHONE_INPUT:
      return String(value);
    
    case FormFieldType.EMAIL:
      return String(value);
    
    case FormFieldType.PASSWORD:
      return '••••••••'; // Hide password value
    
    case FormFieldType.FILE:
      if (value) {
        if (Array.isArray(value)) {
          return `${value.length} file(s) selected`;
        }
        return value.name || 'File selected';
      }
      return 'No file selected';
    
    case FormFieldType.TEXTAREA:
      const text = String(value);
      return text.length > 100 ? `${text.substring(0, 100)}...` : text;
    
    default:
      return String(value);
  }
};

const RenderInput = <T extends FieldValues>({
  field,
  props,
}: {
  field: any;
  props: CustomProps<T>;
}) => {
  const inputBaseClass = cn(
    "w-full transition-all duration-200",
    props.iconSrc && "pl-10",
    props.inputClassName
  );

  const [showPassword, setShowPassword] = useState(false);

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
                    ? (showPassword ? "text" : "password")
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
            {props.fieldType === FormFieldType.PASSWORD && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 px-3 py-2 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}
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
            className={cn("transition-all duration-200", props.inputClassName)}
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
              "w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all duration-200",
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
            <SelectTrigger className={cn("w-full transition-all duration-200", props.inputClassName)}>
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
              className={cn("transition-all duration-200", inputBaseClass)}
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

const RenderDisplayValue = <T extends FieldValues>({
  field,
  props,
}: {
  field: any;
  props: CustomProps<T>;
}) => {
  const displayValue = props.displayValue || 
    formatDisplayValue(
      field.value, 
      props.fieldType, 
      props.options, 
      props.trackById, 
      props.formatDisplayValue
    );

  const getReadOnlyStyle = () => {
    const baseStyle = "min-h-[40px] px-3 py-2 text-sm flex items-center rounded-md transition-all duration-200";
    
    switch (props.readOnlyStyle) {
      case 'bordered':
        return cn(baseStyle, "border border-input bg-background", props.inputClassName);
      case 'plain':
        return cn(baseStyle, "bg-transparent", props.inputClassName);
      case 'muted':
      default:
        return cn(baseStyle, "bg-muted/50", props.inputClassName);
    }
  };

  const handleQuickEdit = () => {
    if (props.allowQuickEdit && props.onEdit) {
      props.onEdit();
    }
  };

  return (
    <div 
      className={getReadOnlyStyle()}
      onDoubleClick={handleQuickEdit}
      title={props.allowQuickEdit ? "Double-click to edit" : undefined}
    >
      <span className={cn(
        "flex-1",
        displayValue === '-' && "text-muted-foreground italic"
      )}>
        {displayValue}
      </span>
    </div>
  );
};

const EditActionButtons = <T extends FieldValues>({
  props,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  props: CustomProps<T>;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const buttonVariant = props.editButtonVariant || 'outline';
  const buttonSize = props.editButtonSize || 'sm';

  if (props.editMode === 'toggle' && !isEditing) {
    return (
      <Button
        type="button"
        size={buttonSize}
        variant={buttonVariant}
        onClick={onEdit}
        className="h-8 w-8 p-0"
        title="Edit"
      >
        <Edit className="w-3 h-3" />
      </Button>
    );
  }

  if (props.editMode === 'inline' || isEditing) {
    return (
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <Button
              type="button"
              size={buttonSize}
              variant={buttonVariant}
              onClick={async () => {
                if (props.confirmEdit) {
                  const confirmed = window.confirm(
                    props.confirmMessage || 'Are you sure you want to save these changes?'
                  );
                  if (!confirmed) return;
                }
                onSave();
              }}
              className="h-8 w-8 p-0"
              title="Save"
            >
              <Save className="w-3 h-3" />
            </Button>
            <Button
              type="button"
              size={buttonSize}
              variant="outline"
              onClick={onCancel}
              className="h-8 w-8 p-0"
              title="Cancel"
            >
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size={buttonSize}
            variant={buttonVariant}
            onClick={onEdit}
            className="h-8 w-8 p-0"
            title="Edit"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return null;
};

const CustomFormField = <T extends FieldValues = FieldValues>(
  props: CustomProps<T>
) => {
  const { 
    control, 
    name, 
    label, 
    fieldType, 
    className, 
    labelClassName, 
    required, 
    editable = false,
    editing = false,
    onEdit,
    onSave,
    onCancel,
    editMode = 'inline',
    showEditIcon = true,
    editIconPosition = 'right',
    preserveValueOnCancel = true,
  } = props;

  const [internalEditing, setInternalEditing] = useState(false);
  const [originalValue, setOriginalValue] = useState(null);
  const isEditing = editing || internalEditing;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      // Store original value for cancel functionality
      if (preserveValueOnCancel) {
        const currentValue = control._getWatch(name);
        setOriginalValue(currentValue);
      }
      setInternalEditing(true);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      setInternalEditing(false);
      setOriginalValue(null);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Restore original value if preserveValueOnCancel is true
      if (preserveValueOnCancel && originalValue !== null) {
      }
      setInternalEditing(false);
      setOriginalValue(null);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex-1 space-y-2", className)}>
          {fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className={cn(
              "flex items-center justify-between",
              labelClassName
            )}>
              <span className="flex items-center gap-2">
                {editIconPosition === 'left' && editable && showEditIcon && (
                  <EditActionButtons
                    props={props}
                    isEditing={isEditing}
                    onEdit={handleEdit}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                )}
                <span>
                  {label}
                  {required && <span className="text-destructive ml-1">*</span>}
                </span>
              </span>
              {editIconPosition === 'right' && editable && showEditIcon && (
                <EditActionButtons
                  props={props}
                  isEditing={isEditing}
                  onEdit={handleEdit}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}
            </FormLabel>
          )}
          
          {editable && !isEditing ? (
            <RenderDisplayValue field={field} props={props} />
          ) : (
            <RenderInput field={field} props={props} />
          )}
          
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