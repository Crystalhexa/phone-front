import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Customer {
  customer_id?: string
  name?: string
  email?: string
  phone?: string
  nic?: string
  customer_type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE' | 'DISTRIBUTOR' | 'VIP'
}

interface CustomerFormProps {
  customer: Customer
  onChange: (customer: Customer) => void
  onSave?: () => void
}

export function CustomerForm({ customer, onChange, onSave }: CustomerFormProps) {
  const updateCustomer = (field: keyof Customer, value: string) => {
    onChange({
      ...customer,
      [field]: value
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">Customer Name</Label>
        <Input
          id="customer-name"
          value={customer.name || ''}
          onChange={(e) => updateCustomer('name', e.target.value)}
          placeholder="Enter customer name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-phone">Phone Number</Label>
        <Input
          id="customer-phone"
          type="tel"
          value={customer.phone || ''}
          onChange={(e) => updateCustomer('phone', e.target.value)}
          placeholder="Enter phone number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-email">Email Address</Label>
        <Input
          id="customer-email"
          type="email"
          value={customer.email || ''}
          onChange={(e) => updateCustomer('email', e.target.value)}
          placeholder="Enter email address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-nic">NIC Number</Label>
        <Input
          id="customer-nic"
          value={customer.nic || ''}
          onChange={(e) => updateCustomer('nic', e.target.value)}
          placeholder="Enter NIC number"
        />
      </div>

      <div className="space-y-2">
        <Label>Customer Type</Label>
        <Select 
          value={customer.customer_type || 'RETAIL'} 
          onValueChange={(value: any) => updateCustomer('customer_type', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RETAIL">🛍️ Retail Customer</SelectItem>
            <SelectItem value="WHOLESALE">📦 Wholesale Customer</SelectItem>
            <SelectItem value="CORPORATE">🏢 Corporate Customer</SelectItem>
            <SelectItem value="DISTRIBUTOR">🚚 Distributor</SelectItem>
            <SelectItem value="VIP">⭐ VIP Customer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onSave && (
        <Button onClick={onSave} className="w-full">
          Save Customer Information
        </Button>
      )}
    </div>
  )
}
