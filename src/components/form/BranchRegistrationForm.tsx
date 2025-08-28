"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import CustomFormField, { FormFieldType } from "./common/CustomFormField";
import { Button } from "@/components/ui/button";
import { useAddBranchMutation, useGetBranchByIdQuery, useUpdateBranchMutation } from "@/state/brnach";

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  location: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().max(20, "Phone number must be under 20 characters").optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  is_main_branch: z.boolean().optional(),
  can_purchase: z.boolean().optional(),
});

type BranchFormData = z.infer<typeof branchSchema>;

const defaultValues: BranchFormData = {
  name: "",
  location: "",
  address: "",
  phone: "",
  email: "",
  is_active: false,
  is_main_branch: false,
  can_purchase: false,
};

interface BranchFormProps {
  branchId?: string;
  isEdit?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  title?: string;
  showExport?: boolean;
}

const BranchForm: React.FC<BranchFormProps> = ({
  branchId,
  isEdit,
  onSuccess,
  onCancel,
  title,
}) => {
  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues,
  });
  const [addBranch, { isLoading: isAddingBranch }] = useAddBranchMutation();
  const [updateBranch, { isLoading: isUpdatingBranch }] = useUpdateBranchMutation();

  const {
    data: branchData,
    isLoading: isBranchLoading,
    isError: isBranchError,
    error: branchError,
  } = useGetBranchByIdQuery(branchId!, {
    skip: !isEdit || !branchId,
  });
  console.log(branchId)

  const isLoading = isAddingBranch || isUpdatingBranch || isBranchLoading;

  useEffect(() => {
    if (isEdit && branchData?.data) {
      form.reset({
        name: branchData.data.name || "",
        location: branchData.data.location || "",
        address: branchData.data.address || "",
        phone: branchData.data.phone || "",
        email: branchData.data.email || "",
        is_active: branchData.data.is_active || false,
        is_main_branch: branchData.data.is_main_branch || false,
        can_purchase: branchData.data.can_purchase || false,
      });
    }
  }, [isEdit, branchData, form]);

  const onSubmit = async (values: BranchFormData) => {
   
    try {
       const branchPayload = {
        name: values.name,
        location: values.location,
        address: values.address,
        phone: values.phone,
        email: values.email,
        is_active: values.is_active,
        is_main_branch: values.is_main_branch,
        can_purchase: values.can_purchase
      };
      if (isEdit && branchId) {
        await updateBranch({id:branchId,body:branchPayload}).unwrap()
        toast.success("Branch updated successfully!");
      } else {
        await addBranch(values).unwrap();
        toast.success("Branch created successfully!");
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || "An error occurred";
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    form.reset();
    if (onCancel) {
      onCancel();
    }
  };

  if (isEdit && isBranchError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 dark:text-red-400">
          Error loading branch data: {(branchError as any)?.data?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            {title || (isEdit ? "Edit Branch" : "Register New Branch")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEdit 
              ? "Update the branch information below." 
              : "Fill out the form to register a new branch."
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomFormField
            control={form.control}
            name="name"
            label="Branch Name"
            placeholder="Enter branch name"
            fieldType={FormFieldType.INPUT}
            required
          />

          <CustomFormField
            control={form.control}
            name="location"
            label="Location"
            placeholder="Enter location"
            fieldType={FormFieldType.INPUT}
          />

          <CustomFormField
            control={form.control}
            name="phone"
            label="Phone Number"
            placeholder="Enter phone number"
            fieldType={FormFieldType.INPUT}
          />

          <CustomFormField
            control={form.control}
            name="email"
            label="Email"
            placeholder="Enter email address"
            fieldType={FormFieldType.INPUT}
          />

          <CustomFormField
            control={form.control}
            name="is_active"
            label="Is Active?"
            fieldType={FormFieldType.CHECKBOX}
          />

          <CustomFormField
            control={form.control}
            name="is_main_branch"
            label="Is Main Branch"
            fieldType={FormFieldType.CHECKBOX}
          />

          <CustomFormField
            control={form.control}
            name="can_purchase"
            label="Can Purchase"
            fieldType={FormFieldType.CHECKBOX}
          />
        </div>

        <CustomFormField
          control={form.control}
          name="address"
          label="Address"
          placeholder="Enter full address"
          fieldType={FormFieldType.TEXTAREA}
        />

        <div className="pt-2 flex justify-end gap-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : (isEdit ? "Update" : "Submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default BranchForm;