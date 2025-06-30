'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Form } from '../ui/form'
import CustomFormField, { FormFieldType } from '../form/CustomFormField'
import SubmitButton from '../form/SubmitButton'
import { useGetRolesQuery } from '@/state/api'
import { Props, RolesApiResponse } from '@/types/roles'
import {
  useCreateUserMutation,
  useGetUserByIdQuery,
  useUpdateUserMutation,
} from '@/state/employee'

const userSchema = z.object({
  user_id: z.string().optional(),
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  password_hash: z.string().min(6, 'Password must be at least 6 characters'),
  is_active: z.boolean(),
  role_id: z.string().min(1, 'Role is required'),
  employee: z.object({
    employee_number: z.string().min(1, 'Employee number is required'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    nic: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    date_of_birth: z.coerce.date().optional(),
    hire_date: z.coerce.date().optional(),
    is_active: z.boolean(),
  }),
})

export type UserFormData = z.infer<typeof userSchema>

const UserForm: React.FC<Props> = ({ userId, isEdit = false }) => {
  const router = useRouter()

  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery() as {
    data?: RolesApiResponse
    isLoading: boolean
  }

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      email: '',
      password_hash: '',
      is_active: true,
      role_id: '',
      employee: {
        employee_number: '',
        name: '',
        email: '',
        phone: '',
        nic: '',
        gender: 'MALE',
        position: '',
        department: '',
        date_of_birth: new Date(),
        hire_date: new Date(),
        is_active: true,
      },
    },
  })

  const { data, isLoading } = useGetUserByIdQuery(userId ?? '', { skip: !isEdit || !userId })

  const generateEmployeeNumber = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    return `EMP${year}${month}${random}`
  }

  // Set generated employee number for new user
  useEffect(() => {
    if (!isEdit) {
      form.setValue('employee.employee_number', generateEmployeeNumber())
    }
  }, [isEdit, form])

  // Populate form for editing
  useEffect(() => {
    if (isEdit && data?.data) {
      const user = data.data
      console.log(user)
      form.reset({
        username: user.username,
        email: user.email,
        password_hash: '',
        is_active: user.is_active,
        role_id: user.role_id,
        employee: {
          employee_number: user.employee?.employee_number || '',
          name: user.employee?.name || '',
          email: user.employee?.email || user.email,
          phone: user.employee?.phone || '',
          nic: user.employee?.nic || '',
          gender: user.employee?.gender || 'MALE',
          position: user.employee?.position || '',
          department: user.employee?.department || '',
          date_of_birth: user.employee?.date_of_birth
            ? new Date(user.employee.date_of_birth)
            : new Date(),
          hire_date: user.employee?.hire_date
            ? new Date(user.employee.hire_date)
            : new Date(),
          is_active: user.employee?.is_active ?? true,
        },
      })
    }
  }, [isEdit, data, form])

  const handleBack = () => {
    router.push('/dashboard/user/employees')
  }

  const [createUser, { isLoading: creating }] = useCreateUserMutation()
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation()

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (isEdit && userId) {
        await updateUser({ id: userId, body: data }).unwrap()
        toast.success('User updated successfully!')
        router.push('/dashboard/user/employees')
      } else {
        await createUser(data).unwrap()
        toast.success('User created successfully!')
        form.reset()
        form.setValue('employee.employee_number', generateEmployeeNumber())
      }
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Submission failed'
      toast.error(`User ${isEdit ? 'update' : 'creation'} failed! ${message}`)
    }
  }

  if (isEdit && isLoading) {
    return <p className="text-center py-10">Loading user data...</p>
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <button
          onClick={handleBack}
          type="button"
          className="text-blue-500 flex items-center text-lg hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="mr-2" />
          Back
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {isEdit ? 'Edit User Account' : 'Create User Account'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CustomFormField
                control={form.control}
                name="username"
                label="Username"
                fieldType={FormFieldType.INPUT}
                placeholder="johndoe"
                required
              />
              <CustomFormField
                control={form.control}
                name="email"
                label="User Email"
                fieldType={FormFieldType.EMAIL}
                placeholder="john@example.com"
                required
              />
              <CustomFormField
                control={form.control}
                name="password_hash"
                label="Password"
                fieldType={FormFieldType.PASSWORD}
                placeholder="••••••••"
                required={!isEdit}
                description={isEdit ? 'Leave blank to keep current password' : undefined}
              />
              <CustomFormField
                control={form.control}
                name="role_id"
                label="User Role"
                fieldType={FormFieldType.SELECT}
                placeholder="Select Role"
                options={
                  rolesData?.data?.map(role => ({
                    id: role.id,
                    name: role.name,
                    value: role.id,
                  })) || []
                }
                required
              />
              <CustomFormField
                control={form.control}
                name="is_active"
                label="User Account Active"
                fieldType={FormFieldType.CHECKBOX}
              />
            </div>
          </div>

          <hr className="border-gray-300 dark:border-gray-700" />

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Employee Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CustomFormField
                control={form.control}
                name="employee.employee_number"
                label="Employee Number"
                fieldType={FormFieldType.INPUT}
                placeholder="EMP202401001"
                disabled={isEdit}
                required
              />
              <CustomFormField
                control={form.control}
                name="employee.name"
                label="Full Name"
                fieldType={FormFieldType.INPUT}
                placeholder="John Doe"
                required
              />
              <CustomFormField
                control={form.control}
                name="employee.email"
                label="Employee Email"
                fieldType={FormFieldType.EMAIL}
                placeholder="john.doe@company.com"
                required
              />
              <CustomFormField
                control={form.control}
                name="employee.phone"
                label="Phone Number"
                fieldType={FormFieldType.INPUT}
                placeholder="+1234567890"
              />
              <CustomFormField
                control={form.control}
                name="employee.nic"
                label="NIC Number"
                fieldType={FormFieldType.INPUT}
                placeholder="123456789V"
              />
              <CustomFormField
                control={form.control}
                name="employee.gender"
                label="Gender"
                fieldType={FormFieldType.SELECT}
                placeholder="Select gender"
                options={[
                  { id: 1, name: 'Male', value: 'MALE' },
                  { id: 2, name: 'Female', value: 'FEMALE' },
                  { id: 3, name: 'Other', value: 'OTHER' },
                ]}
              />
              <CustomFormField
                control={form.control}
                name="employee.position"
                label="Position"
                fieldType={FormFieldType.INPUT}
                placeholder="Software Engineer"
              />
              <CustomFormField
                control={form.control}
                name="employee.department"
                label="Department"
                fieldType={FormFieldType.INPUT}
                placeholder="IT Department"
              />
              <CustomFormField
                control={form.control}
                name="employee.date_of_birth"
                label="Date of Birth"
                fieldType={FormFieldType.DATE_PICKER}
              />
              <CustomFormField
                control={form.control}
                name="employee.hire_date"
                label="Hire Date"
                fieldType={FormFieldType.DATE_PICKER}
              />
              <CustomFormField
                control={form.control}
                name="employee.is_active"
                label="Employee Active"
                fieldType={FormFieldType.CHECKBOX}
              />
            </div>
          </div>

          <div className="pt-4">
            <SubmitButton
              isLoading={form.formState.isSubmitting || creating || updating}
              className="w-full py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50"
            >
              {isEdit ? 'Update User & Employee' : 'Create User & Employee'}
            </SubmitButton>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default UserForm
