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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Package, 
  Layers, 
  Calendar, 
  DollarSign, 
  Package2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react'

const BatchDetailsViewer = ({ product }:any) => {

  const formatPrice = (price:any) => `$${price?.toFixed(2) || '0.00'}`
  
  const formatDate = (dateString:any) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTotalQuantity = () => {
    return product.batches?.reduce((sum:any, batch:any) => sum + batch.quantity, 0) || 0
  }

  const getTotalAvailable = () => {
    return product.batches?.reduce((sum:any, batch:any) => sum + batch.availableQuantity, 0) || 0
  }

  const isExpiringSoon = (expiryDate:any) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow && expiry > today
  }

  const isExpired = (expiryDate:any) => {
    if (!expiryDate) return false
    return new Date(expiryDate) <= new Date()
  }

  const getBatchStatusBadge = (batch:any) => {
    if (batch.availableQuantity === 0) {
      return <Badge variant="secondary" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>
    }
    if (isExpired(batch.expiryDate)) {
      return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>
    }
    if (isExpiringSoon(batch.expiryDate)) {
      return <Badge variant="outline" className="text-xs border-orange-500 text-orange-600"><Clock className="w-3 h-3 mr-1" />Expiring Soon</Badge>
    }
    return <Badge variant="default" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Available</Badge>
  }

  const getMargin = (costPrice:any, retailPrice:any) => {
    if (!costPrice || !retailPrice) return null
    return (((retailPrice - costPrice) / costPrice) * 100).toFixed(1)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Layers className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-width sm:max-w-3xl rounded-2xl p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package2 className="w-6 h-6" />
            Batch Details - {product.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            View all batch information for this product
          </DialogDescription>
        </DialogHeader>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{product.batches?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Batches</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{getTotalAvailable()}</div>
            <div className="text-sm text-muted-foreground">Available Units</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{getTotalQuantity()}</div>
            <div className="text-sm text-muted-foreground">Total Units</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{getTotalQuantity() - getTotalAvailable()}</div>
            <div className="text-sm text-muted-foreground">Units Sold</div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {product.batches?.map((batch:any, index:any) => (
              <Card key={batch.batchId} className="relative overflow-hidden hover:shadow-md transition-shadow">
                {/* Color indicator based on status */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  batch.availableQuantity === 0 ? 'bg-gray-400' :
                  isExpired(batch.expiryDate) ? 'bg-red-500' :
                  isExpiringSoon(batch.expiryDate) ? 'bg-orange-500' :
                  'bg-green-500'
                }`} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Batch #{index + 1}
                    </CardTitle>
                    {getBatchStatusBadge(batch)}
                  </div>
                  <div className="text-sm font-mono text-muted-foreground bg-muted px-3 py-1 rounded-md w-fit">
                    ID: {batch.batchId}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quantity Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Stock Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Quantity:</span>
                          <span className="font-bold text-lg">{batch.quantity}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Available:</span>
                          <span className="font-bold text-lg text-green-600">{batch.availableQuantity}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Sold:</span>
                          <span className="font-bold text-lg text-red-600">{batch.quantity - batch.availableQuantity}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all" 
                              style={{ width: `${(batch.availableQuantity / batch.quantity) * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {((batch.availableQuantity / batch.quantity) * 100).toFixed(0)}% remaining
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pricing</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                          <span className="text-sm">Retail Price:</span>
                          <span className="font-bold text-green-600">{formatPrice(batch.retailPrice)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                          <span className="text-sm">Wholesale:</span>
                          <span className="font-bold text-blue-600">{formatPrice(batch.wholesalePrice)}</span>
                        </div>
                        {getMargin(batch.costPrice, batch.retailPrice) && (
                          <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                            <span className="text-sm flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Profit Margin:
                            </span>
                            <span className="font-bold text-purple-600">
                              {getMargin(batch.costPrice, batch.retailPrice)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date Information */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Timeline</h4>
                      <div className="space-y-3">
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Received Date
                          </span>
                          <span className="font-medium">{formatDate(batch.receivedDate)}</span>
                        </div>
{/*                         
                        {batch.expiryDate && (
                          <div className="flex flex-col space-y-1">
                            <span className={`text-sm flex items-center gap-1 ${
                              isExpired(batch.expiryDate) ? 'text-red-600' : 
                              isExpiringSoon(batch.expiryDate) ? 'text-orange-600' : 
                              'text-muted-foreground'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              Expiry Date
                            </span>
                            <span className={`font-medium ${
                              isExpired(batch.expiryDate) ? 'text-red-600' : 
                              isExpiringSoon(batch.expiryDate) ? 'text-orange-600' : 
                              ''
                            }`}>
                              {formatDate(batch.expiryDate)}
                            </span>
                            {isExpiringSoon(batch.expiryDate) && !isExpired(batch.expiryDate) && (
                              <span className="text-xs text-orange-600 font-medium">
                                Expires in {Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            )}
                          </div>
                        )} */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {(!product.batches || product.batches.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Batches Found</h3>
                <p>This product doesn't have any batch records yet.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default BatchDetailsViewer