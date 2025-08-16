'use client'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Package,
  Package2,
  AlertTriangle,
  Building2,
  RefreshCw,
  Loader2,
  Building2Icon
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatCurrency'

interface BatchDetail {
  batchId: string
  batchNumber: string | null
  quantity: number
  availableQuantity: number
  costPrice: number
  wholesalePrice: number 
  retailPrice: number
  receivedDate: string
  receivedBy: string | null
  receivedByName: string | null
  fifoSequence: number | null
  isActive: boolean
}

interface BranchBatchDetails {
  branchId: string
  branchName: string
  branchCode: string
  totalQuantity: number
  totalAvailable: number
  totalSold: number
  batches: BatchDetail[]
}

interface ProductBatchResponse {
  productId: string
  productName: string
  productSku: string
  branches: BranchBatchDetails[]
  summary: {
    totalBranches: number
    totalQuantityAllBranches: number
    totalAvailableAllBranches: number
    totalSoldAllBranches: number
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  errors?: any[]
  timestamp: string
  metadata?: any
}

interface BatchDetailsViewerProps {
  product: {
    id: string
    name: string
    sku?: string
  }
}

const BatchDetailsViewer = ({ product }: BatchDetailsViewerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [batchData, setBatchData] = useState<ProductBatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBatchDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/products/${product.id}/batch-details`)
      const result: ApiResponse<ProductBatchResponse> = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch batch details')
      }
      
      if (result.success && result.data) {
        setBatchData(result.data)
      } else {
        throw new Error(result.message || 'No data received')
      }
    } catch (err) {
      console.error('Error fetching batch details:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && !batchData && !loading) {
      fetchBatchDetails()
    }
  }, [isOpen, batchData, loading])

  const handleRefresh = () => {
    setBatchData(null)
    fetchBatchDetails()
  }

  const renderLoadingState = () => (
    <div className="space-y-6">
      {/* Summary Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Branch Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderErrorState = () => (
    <div className="text-center py-12">
      <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500 opacity-50" />
      <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Data</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={handleRefresh} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  )

  const renderBranchBatches = (branch: BranchBatchDetails) => (
    <Card key={branch.branchId} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5" />
            {branch.branchName}
            <Badge variant="outline" className="text-xs">
              {branch.branchCode}
            </Badge>
          </CardTitle>
          <div className="flex gap-2 text-sm">
            <Badge variant="secondary">
              Total: {branch.totalQuantity}
            </Badge>
            <Badge variant="default" className="bg-green-100 text-green-800">
              Available: {branch.totalAvailable}
            </Badge>
            <Badge variant="default" className="bg-red-100 text-red-800">
              Sold: {branch.totalSold}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
          <ScrollArea className="max-h-[60vh]">
        {branch.batches.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-[80px]">Total</TableHead>
                  <TableHead className="text-center w-[80px]">Available</TableHead>
                  <TableHead className="text-right w-[100px]">wholesale</TableHead>
                  <TableHead className="text-right w-[100px]">Retail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branch.batches.map((batch) => (
                  <TableRow key={batch.batchId} className="hover:bg-muted/50">
                    <TableCell className="text-center font-semibold">
                      {batch.quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-600">
                        {batch.availableQuantity}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right font-semibold text-blue-600">
                      {formatCurrency(batch?.wholesalePrice)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(batch.retailPrice)}
                    </TableCell>
                   
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No batch records found for this branch</p>
          </div>
        )}
      </ScrollArea>
    </Card>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Building2Icon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="overflow-y-auto px-6 py-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Package2 className="w-6 h-6" />
                  Branch Batch Details - {product.name}
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  View batch information across all branches for this product
                </DialogDescription>
              </div>
              {batchData && (
                <Button 
                  onClick={handleRefresh} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading && !batchData && renderLoadingState()}
          
          {error && !batchData && renderErrorState()}
          
          {batchData && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {batchData.summary.totalBranches}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Branches</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {batchData.summary.totalQuantityAllBranches}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Units</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {batchData.summary.totalAvailableAllBranches}
                    </div>
                    <div className="text-sm text-muted-foreground">Available Units</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {batchData.summary.totalSoldAllBranches}
                    </div>
                    <div className="text-sm text-muted-foreground">Units Sold</div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="mb-6" />

              {/* Branch Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Branch-wise Batch Details
                </h3>
                
                {batchData.branches.length > 0 ? (
                  <ScrollArea className="max-h-[50vh]">
                    {batchData.branches.map(renderBranchBatches)}
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Batch Data Found</h3>
                    <p>This product doesn't have any batch records in any branch yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BatchDetailsViewer