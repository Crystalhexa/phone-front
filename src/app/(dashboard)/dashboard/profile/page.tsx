"use client"
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { User, Building, Lock, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CustomFormField, { FormFieldType } from '@/components/form/CustomFormField';
import { useAuth } from '@/hooks/useAuth';

// Form validation schema - only password fields are required for updates
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  employeeNumber: z.string().min(1, "Employee number is required"),
  employeeName: z.string().min(1, "Employee name is required"),
  branchName: z.string().min(1, "Branch name is required"),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const EmployeeProfileForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const { user, logout } = useAuth();

  // Create form data from user object
  const getUserFormData = (): FormData => ({
    username: user?.username || '',
    email: user?.email || '',
    employeeNumber: user?.employee_number || '',
    employeeName: user?.employee_name || '',
    branchName: user?.branch_name || '',
    password: '',
    confirmPassword: ''
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: getUserFormData(),
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      const userData = getUserFormData();
      form.reset(userData);
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Only send password for update
      const updateData = {
        password: data.password
      };
      
      console.log('Updating password for user:', user?.id, updateData);
      
      setSubmitMessage({
        type: 'success',
        message: 'Password updated successfully!'
      });
      
      // Reset password fields
      form.setValue('password', '');
      form.setValue('confirmPassword', '');
      
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        message: 'Failed to update password. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state if user data is not available yet
  if (!user) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 mt-20">
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 mt-20">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            Employee Profile
          </h1>
          <p className="text-sm text-muted-foreground">Manage your account settings</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1 h-6">
          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <Form {...form}>
        <div className="grid grid-cols-3 gap-4">
          {/* Profile Information - Takes 2 columns */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="w-4 h-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Two column grid for compact layout */}
              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  control={form.control}
                  name="employeeName"
                  label="Full Name"
                  fieldType={FormFieldType.INPUT}
                  disabled={true}
                  inputClassName="bg-muted/30 h-8 text-sm"
                  labelClassName="text-xs font-medium text-muted-foreground"
                  placeholder="Employee full name"
                />
                
                <CustomFormField
                  control={form.control}
                  name="username"
                  label="Username"
                  fieldType={FormFieldType.INPUT}
                  disabled={true}
                  inputClassName="bg-muted/30 h-8 text-sm"
                  labelClassName="text-xs font-medium text-muted-foreground"
                  placeholder="Username"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomFormField
                  control={form.control}
                  name="employeeNumber"
                  label="Employee ID"
                  fieldType={FormFieldType.INPUT}
                  disabled={true}
                  inputClassName="bg-muted/30 h-8 text-sm"
                  labelClassName="text-xs font-medium text-muted-foreground"
                  placeholder="Employee ID"
                />
                
                <CustomFormField
                  control={form.control}
                  name="branchName"
                  label="Branch"
                  fieldType={FormFieldType.INPUT}
                  disabled={true}
                  inputClassName="bg-muted/30 h-8 text-sm"
                  labelClassName="text-xs font-medium text-muted-foreground"
                  placeholder="Branch name"
                />
              </div>

              <div className="grid grid-cols-1">
                <CustomFormField
                  control={form.control}
                  name="email"
                  label="Email Address"
                  fieldType={FormFieldType.EMAIL}
                  disabled={true}
                  inputClassName="bg-muted/30 h-8 text-sm"
                  labelClassName="text-xs font-medium text-muted-foreground"
                  placeholder="Email address"
                />
              </div>

           
            </CardContent>
          </Card>

          {/* Password Update - Takes 1 column */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                  Password must be at least 8 characters
                </AlertDescription>
              </Alert>

              <CustomFormField
                control={form.control}
                name="password"
                label="New Password"
                fieldType={FormFieldType.PASSWORD}
                placeholder="Enter new password"
                required={true}
                inputClassName="h-8 text-sm"
                labelClassName="text-xs font-medium"
                description="Minimum 8 characters required"
              />
              
              <CustomFormField
                control={form.control}
                name="confirmPassword"
                label="Confirm Password"
                fieldType={FormFieldType.PASSWORD}
                placeholder="Confirm new password"
                required={true}
                inputClassName="h-8 text-sm"
                labelClassName="text-xs font-medium"
                description="Must match new password"
              />

              {/* Submit Message */}
              {submitMessage && (
                <Alert className={submitMessage.type === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}>
                  <AlertCircle className={`h-3 w-3 ${submitMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  <AlertDescription className={`text-xs ${submitMessage.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                    {submitMessage.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="w-full h-8 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Form>

      {/* Security Notice - Bottom */}
      <Card className="mt-4 border-dashed">
        <CardContent className="py-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <div>
              <span className="font-medium">Security Notice:</span> Profile information can only be updated by system administrators. Contact IT support for personal detail changes.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfileForm;