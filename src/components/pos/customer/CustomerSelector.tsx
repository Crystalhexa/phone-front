'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Search, Plus, User, Phone, CreditCard, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Customer, CreateCustomerRequest, ApiResponse, CustomerType } from '@/types/customer'
import { toast } from 'sonner'

interface CustomerSelectorProps {
  onCustomerSelect: (customer: Customer | null) => void
  selectedCustomer: Customer | null
}

export default function CustomerSelector({ onCustomerSelect, selectedCustomer }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  // Form state for new customer
  const [newCustomer, setNewCustomer] = useState<CreateCustomerRequest>({
    name: '',
    email: '',
    nic: '',
    phone: '',
    address: '',
    date_of_birth: '',
    customer_type: 'RETAIL',
    credit_limit: undefined,
    discount_percentage: undefined
  })

  // Debounced search
  const searchCustomers = useCallback(async (search: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customer/cart?search=${encodeURIComponent(search)}&limit=20`)
      const data: ApiResponse<Customer[]> = await response.json()
      
      if (data.success) {
        setCustomers(data.data || [])
      } else {
        toast(data.message)
      }
    } catch (error) {
      toast( "Failed to search customers")
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm, searchCustomers])

  // Load initial customers
  useEffect(() => {
    searchCustomers('')
  }, [searchCustomers])

  // Handle customer creation
  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast( "Customer name is required")
      return
    }

    setCreateLoading(true)
    try {
      const response = await fetch('/api/customer/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCustomer,
          email: newCustomer.email || undefined,
          nic: newCustomer.nic || undefined,
          phone: newCustomer.phone || undefined,
          address: newCustomer.address || undefined,
          date_of_birth: newCustomer.date_of_birth || undefined,
        }),
      })

      const data: ApiResponse<Customer> = await response.json()

      if (data.success && data.data) {
        toast(`${data.data.name} has been created successfully`)
        
        // Add to customers list and select
        setCustomers(prev => [data.data!, ...prev])
        onCustomerSelect(data.data)
        setShowCreateDialog(false)
        resetForm()
      } else {
        toast(data.message)
      }
    } catch (error) {
      toast( "Failed to create customer")
    } finally {
      setCreateLoading(false)
    }
  }

  const resetForm = () => {
    setNewCustomer({
      name: '',
      email: '',
      nic: '',
      phone: '',
      address: '',
      date_of_birth: '',
      customer_type: 'RETAIL',
      credit_limit: undefined,
      discount_percentage: undefined
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getCustomerTypeColor = (type: CustomerType) => {
    switch (type) {
      case 'VIP': return 'bg-purple-100 text-purple-800'
      case 'WHOLESALE': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Selected Customer Display */}
      {selectedCustomer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Selected Customer
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCustomerSelect(null)}
              >
                Clear Selection
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-lg">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-600">#{selectedCustomer.customer_number}</p>
              </div>
              <div className="text-right">
                <Badge className={getCustomerTypeColor(selectedCustomer.customer_type)}>
                  {selectedCustomer.customer_type}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
              {selectedCustomer.nic && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span>{selectedCustomer.nic}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-500" />
                <span>{selectedCustomer.loyalty_points} points</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Outstanding Balance:</span>
              <span className={`font-bold ${selectedCustomer.running_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(selectedCustomer.running_balance)}
              </span>
            </div>
            
            {selectedCustomer.discount_percentage && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Discount:</span>
                <span className="font-bold text-green-600">
                  {selectedCustomer.discount_percentage}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer Search and Selection */}
      {!selectedCustomer &&(
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Select Customer
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Customer</DialogTitle>
                  <DialogDescription>
                    Add a new customer to the system
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Customer name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nic">NIC</Label>
                      <Input
                        id="nic"
                        value={newCustomer.nic}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, nic: e.target.value }))}
                        placeholder="NIC number"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customer_type">Customer Type</Label>
                    <Select
                      value={newCustomer.customer_type}
                      onValueChange={(value: CustomerType) => setNewCustomer(prev => ({ ...prev, customer_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETAIL">Retail</SelectItem>
                        <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                        <SelectItem value="VIP">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Customer address"
                      rows={2}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={createLoading}>
                    {createLoading ? 'Creating...' : 'Create Customer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, NIC, or customer number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Customer List */}
          <ScrollArea className="h-64">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No customers found' : 'No customers available'}
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-900`}
                    onClick={() => onCustomerSelect(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{customer.name}</span>
                            <Badge variant="outline" className="text-xs">
                              #{customer.customer_number}
                            </Badge>
                            <Badge className={getCustomerTypeColor(customer.customer_type)}>
                              {customer.customer_type}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.nic && (
                              <div className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {customer.nic}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right text-sm">
                          <div className={`font-medium ${customer.running_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(customer.running_balance)}
                          </div>
                          <div className="text-gray-500">
                            {customer.loyalty_points} pts
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      )}
    </div>
  )
}