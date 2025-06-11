'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { Form } from '../ui/form'
import CustomFormField, { FormFieldType } from '../form/CustomFormField'
import SubmitButton from '../form/SubmitButton'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Define the userSchema using zod
const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password_hash: z.string().min(6, 'Password must be at least 6 characters'),
  is_active: z.boolean(),
  role_id: z.number().min(1, 'Role is required'),
  employee: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(10, 'Phone number is required'),
    gender: z.string(),
    hire_date: z.date(),
    date_of_birth: z.date(),
    nic: z.string().min(1, 'NIC is required'),
  }),
});

type UserFormData = z.infer<typeof userSchema>

const UserRegistrationForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUseRoles = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/userRoles');
        if (!response.ok) {
          throw new Error('Failed to fetch user roles');
        }
        const result = await response.json();
        const formattedRoles = result.map((role: any) => ({
          id: role.role_id,
          name: role.name,
        }));
        console.log(formattedRoles)
        setUserRoles(formattedRoles);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred while fetching user roles');
      }
    }
    fetchUseRoles();
  }, [])

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      password_hash: '',
      is_active: true,
      role_id: 0,
      employee: {
        name: '',
        email: '',
        phone: '',
        gender: 'Male',
        hire_date: new Date(), // ← was string, now Date
        date_of_birth: new Date(), // ← was string, now Date
        nic: '',
      },
    },

  })
  
  const onSubmit = async (values: UserFormData) => {
  setIsLoading(true);
  try {
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result?.error || 'Failed to create user');

    toast.success('✅ User created successfully!');
    form.reset(); // Optionally reset form
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    toast.error(`❌ ${message}`);
  } finally {
    setIsLoading(false);
  }
};



  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-3xl mx-auto p-4 sm:p-6 rounded-lg shadow-md border"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
          borderColor: 'var(--border)',
        }}
      >
        {/* USER CREDENTIALS */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            User Credentials
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CustomFormField
              control={form.control}
              name="username"
              label="Username"
              fieldType={FormFieldType.INPUT}
              placeholder="johndoe"
            />
            <CustomFormField
              control={form.control}
              name="password_hash"
              label="Password"
              fieldType={FormFieldType.PASSWORD}
              placeholder="••••••••"
            />
            <CustomFormField
              control={form.control}
              name="role_id"
              label="Role"
              fieldType={FormFieldType.SELECT}
              placeholder="Select Role"
              options={userRoles}
              trackById // 👈 Store ID instead of name
            />
            <CustomFormField
              control={form.control}
              name="is_active"
              label="User Active"
              fieldType={FormFieldType.CHECKBOX}
            />
          </div>
        </div>

        <hr className="border" style={{ borderColor: 'var(--border)' }} />

        {/* EMPLOYEE DETAILS */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Employee Details
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CustomFormField
              control={form.control}
              name="employee.name"
              label="Full Name"
              fieldType={FormFieldType.INPUT}
              placeholder="John Doe"
            />
            <CustomFormField
              control={form.control}
              name="employee.email"
              label="Email"
              fieldType={FormFieldType.EMAIL}
              placeholder="john@example.com"
            />
            <CustomFormField
              control={form.control}
              name="employee.phone"
              label="Phone Number"
              fieldType={FormFieldType.INPUT}
              placeholder="9876543210"
            />
            <CustomFormField
              control={form.control}
              name="employee.hire_date"
              label="Hire Date"
              fieldType={FormFieldType.DATE_PICKER}
              placeholder="Select hire date"
            />
            <CustomFormField
              control={form.control}
              name="employee.date_of_birth"
              label="Date of Birth"
              fieldType={FormFieldType.DATE_PICKER}
              placeholder="Select date of birth"
            />
            <CustomFormField
              control={form.control}
              name="employee.gender"
              label="Gender"
              fieldType={FormFieldType.SELECT}
              placeholder="Select gender"
              options={[
                { id: 1, name: 'Male' },
                { id: 2, name: 'Female' },
                { id: 3, name: 'Other' },
              ]}
            />
            <CustomFormField
              control={form.control}
              name="employee.nic"
              label="NIC No."
              fieldType={FormFieldType.INPUT}
              placeholder="9876543210V"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div>
          {/* SUBMIT BUTTON */}
          {error && (
            <div className="text-red-500 bg-red-100 border border-red-300 p-3 rounded-md">
              {error}
            </div>
          )}
          <div>
            <SubmitButton
              isLoading={isLoading}
              className="shad-primary-btn w-full py-3 text-lg font-semibold"
            >
              Register Employee
            </SubmitButton>
          </div>

        </div>
      </form>
    </Form>
  )
}

export default UserRegistrationForm
