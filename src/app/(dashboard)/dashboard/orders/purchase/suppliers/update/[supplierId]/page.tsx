'use client'

import SupplierForm from '@/components/form/SupplierRegistrationForm'
import { use } from 'react'

const EditCustomerPage = ({ params }: { params: Promise<{ supplierId: string }> }) => {
  const { supplierId } = use(params) // ✅ unwrap params safely

  
  return (
    <div>
      <SupplierForm supplierId={supplierId} isEdit />
    </div>
  )
}

export default EditCustomerPage
