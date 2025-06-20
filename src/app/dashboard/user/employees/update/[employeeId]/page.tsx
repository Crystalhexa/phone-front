'use client'
import { use } from 'react'
import UserForm from '@/components/form/UserRegistrationForm'
import { toast } from 'sonner'

const EditUserPage = ({ params }: { params: Promise<{ employeeId: string }> }) => {
  const { employeeId } = use(params) // ✅ unwrap params safely

  
  return (
    <div>
      <UserForm userId={employeeId} isEdit />
    </div>
  )
}

export default EditUserPage
