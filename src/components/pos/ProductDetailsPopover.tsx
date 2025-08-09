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
import { formatCurrency } from '@/lib/utils/formatCurrency'

const BatchDetailsViewer = ({ product }: any) => {

  const formatDate = (dateString: any) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTotalQuantity = () => {
    return product.batches?.reduce((sum: any, batch: any) => sum + batch.quantity, 0) || 0
  }

  const getTotalAvailable = () => {
    return product.batches?.reduce((sum: any, batch: any) => sum + batch.availableQuantity, 0) || 0
  }

  const getBatchStatusBadge = (batch: any) => {
    if (batch.availableQuantity === 0) {
      return <Badge variant="secondary" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>
    }
    return <Badge variant="default" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Available</Badge>
  }

  const getMargin = (costPrice: any, retailPrice: any) => {
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
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">

          <DialogHeader className="mb-6">
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
              <div className="text-2xl font-bold text-blue-600">{product.wholesale_quantity || 0}</div>
              <div className="text-sm text-muted-foreground">wholesale_quantity</div>
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
            {product.batches && product.batches.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-[100px]">Total Qty</TableHead>
                      <TableHead className="text-center w-[100px]">Available</TableHead>
                      <TableHead className="text-center w-[80px]">Sold</TableHead>
                      <TableHead className="text-right w-[100px]">Retail Price</TableHead>
                      <TableHead className="text-right w-[100px]">Wholesale</TableHead>
                      <TableHead className="text-center w-[80px]">Margin</TableHead>
                      <TableHead className="w-[120px]">Received Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.batches.map((batch: any, index: any) => (
                      <TableRow key={batch.batchId} className="hover:bg-muted/50">
                        <TableCell className="text-center font-semibold">
                          {batch.quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600">
                            {batch.availableQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-red-600">
                            {batch.quantity - batch.availableQuantity}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(batch.retailPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(batch.wholesalePrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getMargin(batch.costPrice, batch.retailPrice) ? (
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp className="w-3 h-3 text-purple-600" />
                              <span className="font-semibold text-purple-600">
                                {getMargin(batch.costPrice, batch.retailPrice)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {formatDate(batch.receivedDate)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Batches Found</h3>
                <p>This product doesn't have any batch records yet.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BatchDetailsViewer