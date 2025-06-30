'use client'
import CustomerForm from '@/components/form/CustomerRegistrationForm'
import { use } from 'react'

const EditCustomerPage = ({ params }: { params: Promise<{ customerId: string }> }) => {
  const { customerId } = use(params) // ✅ unwrap params safely

  
  return (
    <div>
      <CustomerForm customerId={customerId} isEdit />
    </div>
  )
}

export default EditCustomerPage
