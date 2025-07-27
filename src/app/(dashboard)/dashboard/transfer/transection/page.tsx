'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowRightLeft,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

import { TransferAPI } from '@/lib/api'
import {  ScannedProduct, TransferItem, TransferRequest } from '@/types/transfer'
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner'
import { ProductCard } from '@/components/transfer/ProductCard'
import { TransferSummary } from '@/components/transfer/TransferSummary'
import { SearchableDropdown } from '@/components/form/SearchableDropdown'
import { useBranchData } from '@/components/table/BranchTable/useBranchData'
import { Branch } from '@/types/branch'
import { useAuth } from '@/hooks/useAuth'

const StockTransferPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [fromBranch, setFromBranch] = useState('')
  const [toBranch, setToBranch] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const { user } = useAuth();

  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [transferItems, setTransferItems] = useState<TransferItem[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleProductScanned = (product: ScannedProduct) => {
    setScannedProduct(product)
    setError(null)
  }

  const handleAddToTransfer = (item: TransferItem) => {
    setTransferItems(prev => [...prev, item])
    setScannedProduct(null)
  }

  const handleRemoveItem = (index: number) => {
    setTransferItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)
    setSubmitSuccess(false)

    // Validation
    if (!fromBranch || !toBranch) {
      setError('Please select both source and destination branches')
      return
    }

    if (fromBranch === toBranch) {
      setError('Source and destination branches cannot be the same')
      return
    }

    if (transferItems.length === 0) {
      setError('Please add at least one item to transfer')
      return
    }

    setIsSubmitting(true)

    try {
      const transferRequest: TransferRequest = {
        from_branch_id: fromBranch,
        to_branch_id: toBranch,
        transfer_items: transferItems.map(item => ({
          product_id: item.product_id,
          transfer_type: item.transfer_type,
          ...(item.transfer_type === 'BATCH' && {
            batches: item.batches?.map(batch => ({
              batch_id: batch.batch_id,
              quantity: batch.quantity
            }))
          }),
          ...(item.transfer_type === 'INDIVIDUAL' && {
            individual_items: item.individual_items?.map(individualItem => ({
              item_barcode_id: individualItem.item_barcode_id
            }))
          })
        })),
        requested_by: requestedBy || undefined,
        priority,
        notes: notes || undefined,
        reason: reason || undefined
      }

      const result = await TransferAPI.createTransfer(transferRequest)

      setSubmitSuccess(true)
      setTransferItems([])
      setScannedProduct(null)
      setNotes('')
      setReason('')

      console.log('Transfer created successfully:', result)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const {
    data: branchOptions,
    isLoading: isSearching,
    handleSearch: handleBranchSearch,
    searchTerm,
    handlePageSizeChange,
  } = useBranchData();

  const branch = branchOptions?.data?.branches;

  console.log(branch)
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <ArrowRightLeft className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Stock Transfer</h1>
      </div>

      {submitSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Stock transfer completed successfully!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Transfer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Details</CardTitle>
              <CardDescription>
                Configure the transfer parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Branch</Label>
                  <SearchableDropdown
                    value={fromBranch}
                    onValueChange={(value) => setFromBranch(value)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branches..."
                    options={branch || []} // array of branches: { id, name, ... }
                    disabled={false}
                    emptyMessage="No branches found"
                    onSearch={handleBranchSearch} // optional, for remote search
                    searchTerm={searchTerm}
                    isSearching={isSearching}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Branch</Label>
                  <SearchableDropdown
                    value={toBranch}
                    onValueChange={(value) => setToBranch(value)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branches..."
                    options={branch || []} // array of branches: { id, name, ... }
                    disabled={!fromBranch}
                    emptyMessage="No branches found"
                    onSearch={handleBranchSearch} // optional, for remote search
                    searchTerm={searchTerm}
                    isSearching={isSearching}
                  />

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Requested By</Label>
                  <Input
                    placeholder="Employee name"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="Transfer reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Barcode Scanner */}
          <BarcodeScanner onProductScanned={handleProductScanned} />

          {/* Scanned Product Card */}
          {scannedProduct && (
            <ProductCard
              product={scannedProduct}
              onAddToTransfer={handleAddToTransfer}
              onCancel={() => setScannedProduct(null)}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Transfer Summary */}
          <TransferSummary
            items={transferItems}
            onRemoveItem={handleRemoveItem}
          />

          {/* Submit Button */}
          {transferItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !fromBranch || !toBranch}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Transfer...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Transfer ({transferItems.length} items)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default StockTransferPage