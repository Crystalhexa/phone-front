'use client'

import { useEffect, useState } from 'react'
import { useRouter, redirect } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'

import { Form } from '../ui/form'
import CustomFormField, { FormFieldType } from '../form/CustomFormField'
import SubmitButton from '../form/SubmitButton'

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
    dob: z.coerce.date(),
    hire_date: z.coerce.date(),
    nic: z.string().min(1, 'NIC is required'),
  }),
})

export type UserFormData = z.infer<typeof userSchema>

type Props = {
  userId?: string
  isEdit?: boolean
}

const UserForm: React.FC<Props> = ({ userId, isEdit = false }) => {
  const [userRoles, setUserRoles] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState<boolean>(isEdit)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
        dob: new Date(),
        hire_date: new Date(),
        nic: '',
      },
    },
  })

  // Fetch user roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/userRoles')
        const data = await res.json()
        setUserRoles(data.map((r: any) => ({ id: r.role_id, name: r.name })))
      } catch (err) {
        setError('Failed to load roles')
      }
    }
    fetchRoles()
  }, [])

  // Fetch user data for editing
  useEffect(() => {
    if (!isEdit || !userId) return

    const fetchUser = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/users/${userId}`)
        if (!res.ok) throw new Error('Failed to fetch user')
        const data = await res.json()

        const formatted: UserFormData = {
          username: data.username,
          password_hash: '',
          is_active: data.is_active,
          role_id: data.role_id,
          employee: {
            name: data.employee.name,
            email: data.employee.email,
            phone: data.employee.phone,
            gender: data.employee.gender,
            dob: new Date(data.employee.dob),
            hire_date: new Date(data.employee.hire_date),
            nic: data.employee.nic,
          },
        }

        form.reset(formatted)
      } catch (err) {
        setError('Error loading user data')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [isEdit, userId])

  const handleBack = () => {
    redirect('/dashboard/user/employees')
  }

  const handleSubmit = async (data: UserFormData) => {
  const url = isEdit
    ? `http://localhost:3001/api/users/${userId}`
    : 'http://localhost:3001/api/users'

  const method = isEdit ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      throw new Error(result?.error || 'Something went wrong')
    }

    toast.success(`User ${isEdit ? 'updated' : 'registered'} successfully!`)

    if (!isEdit) {
      form.reset()
    } else {
      router.push('/dashboard/user/employees')
    }
  } catch (err: any) {
    toast.error(err.message || 'Submission failed')
  }
}

  if (loading) return <p className="text-center py-10">Loading user data...</p>

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <button onClick={handleBack} type="button" className="text-blue-500 flex items-center text-lg">
          <ArrowLeft className="mr-2" />
          Back
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {isEdit ? 'Edit User' : 'Register User'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                trackById
              />
              <CustomFormField
                control={form.control}
                name="is_active"
                label="User Active"
                fieldType={FormFieldType.CHECKBOX}
              />
            </div>
          </div>

          <hr className="border-gray-300 dark:border-gray-700" />

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Employee Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <CustomFormField control={form.control} name="employee.name" label="Full Name" fieldType={FormFieldType.INPUT} />
              <CustomFormField control={form.control} name="employee.email" label="Email" fieldType={FormFieldType.EMAIL} />
              <CustomFormField control={form.control} name="employee.phone" label="Phone Number" fieldType={FormFieldType.INPUT} />
              <CustomFormField control={form.control} name="employee.hire_date" label="Hire Date" fieldType={FormFieldType.DATE_PICKER} />
              <CustomFormField control={form.control} name="employee.dob" label="Date of Birth" fieldType={FormFieldType.DATE_PICKER} />
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
              <CustomFormField control={form.control} name="employee.nic" label="NIC No." fieldType={FormFieldType.INPUT} />
            </div>
          </div>

          {error && (
            <div className="text-red-600 bg-red-100 border border-red-300 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="pt-4">
            <SubmitButton
              isLoading={form.formState.isSubmitting}
              className="w-full py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
            >
              {isEdit ? 'Update User' : 'Register Employee'}
            </SubmitButton>
            
          </div>
        </form>
      </Form>
    </div>
  )
}

export default UserForm
