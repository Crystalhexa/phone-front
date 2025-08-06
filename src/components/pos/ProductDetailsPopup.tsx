import {  AlertTriangle, Barcode, Building2, Calendar, DollarSign, FileText, Info, Package, TrendingDown, Warehouse } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductResponse,CartItem, Filters, ApiResponse } from '@/types/inventory';

export const ProductDetailsPopup: React.FC<{ product: ProductResponse }> = ({ product }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <FileText className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Details - {product.name}
            </DialogTitle>
            <DialogDescription>
              View complete product information and specifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Model</label>
                    <p className="font-medium">{product.model || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU</label>
                    <p className="font-mono text-sm">{product.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{product.description || 'No description available'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Warranty Period</label>
                    <p className="text-sm">{product.warranty_period ? `${product.warranty_period} months` : 'No warranty'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Brand & Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <div className="flex items-center gap-2">
                      {product.brand?.logo_url && (
                        <img 
                          src={product.brand.logo_url} 
                          alt={product.brand.name} 
                          className="w-6 h-6 rounded object-cover" 
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.brand?.name || 'No Brand'}</p>
                        <p className="text-sm text-muted-foreground">{product.brand?.code || ''}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="font-medium">{product.subcategory?.category?.name || 'No Category'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Subcategory</label>
                    <p className="font-medium">{product.subcategory?.name || 'No Subcategory'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Information */}
            {product.current_prices && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Pricing Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                      <p className="text-lg font-bold text-green-600">
                        ${product.current_prices.cost_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Wholesale Price</label>
                      <p className="text-lg font-bold text-blue-600">
                        {product.current_prices.wholesale_price ? 
                          `$${product.current_prices.wholesale_price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Retail Price</label>
                      <p className="text-lg font-bold text-purple-600">
                        ${product.current_prices.retail_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(product.current_prices.last_updated).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Barcodes */}
            {product.barcodes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Barcode className="w-5 h-5" />
                    Barcodes ({product.barcodes.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.barcodes.map((barcode, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-mono text-sm">{barcode.code}</p>
                          <p className="text-xs text-muted-foreground">{barcode.type}</p>
                        </div>
                        <Badge variant={barcode.is_active ? "default" : "secondary"}>
                          {barcode.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {product.specifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifications ({product.specifications.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.specifications.map((spec, index) => (
                      <div key={index} className="p-2 border rounded">
                        <p className="font-medium text-sm">{spec.spec_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {spec.spec_value} {spec.spec_unit && `(${spec.spec_unit})`}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export // Stock Details Popup Component
const StockDetailsPopup: React.FC<{ product: ProductResponse }> = ({ product }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1 h-auto">
          <Info className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl sm:max-w-3xl rounded-2xl p-0">
        <div className="max-h-[85vh] overflow-y-auto px-6 py-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Stock Details - {product.name}
            </DialogTitle>
            <DialogDescription>
              View detailed stock information across all branches
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Overall Stock Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Stock</span>
                  </div>
                  <p className="text-2xl font-bold">{product.total_system_stock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Available</span>
                  </div>
                  <p className="text-2xl font-bold">{product.total_available_stock}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Reserved</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {product.total_system_stock - product.total_available_stock}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge variant={
                    product.overall_stock_status === 'IN_STOCK' ? 'default' :
                    product.overall_stock_status === 'LOW_STOCK' ? 'destructive' : 'secondary'
                  }>
                    {product.overall_stock_status.replace('_', ' ')}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Branch Stock Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Branch Stock Details
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avg Cost</TableHead>
                      <TableHead>Last Restock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.branch_stock.map((stock) => (
                      <TableRow key={stock.branch_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stock.branch_name}</div>
                            <div className="text-sm text-muted-foreground">{stock.branch_code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{stock.total_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.available_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.reserved_quantity}</TableCell>
                        <TableCell className="font-mono">{stock.low_stock_threshold}</TableCell>
                        <TableCell>
                          <Badge variant={
                            stock.stock_status === 'IN_STOCK' ? 'default' :
                            stock.stock_status === 'LOW_STOCK' ? 'destructive' : 'secondary'
                          }>
                            {stock.stock_status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {stock.average_cost_price ? `$${stock.average_cost_price.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {stock.last_restock_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-sm">
                                {new Date(stock.last_restock_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export  const getStockBadge = (product: ProductResponse) => {
    switch (product.overall_stock_status) {
      case 'IN_STOCK':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <Package className="w-3 h-3 mr-1" />
            In Stock
          </Badge>
        );
      case 'LOW_STOCK':
        return (
          <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Stock
          </Badge>
        );
      case 'OUT_OF_STOCK':
        return (
          <Badge variant="secondary" className="bg-red-500 hover:bg-red-600 text-white">
            <TrendingDown className="w-3 h-3 mr-1" />
            Out of Stock
          </Badge>
        );
      case 'NOT_STOCKED':
        return (
          <Badge variant="outline">
            Not Stocked
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };