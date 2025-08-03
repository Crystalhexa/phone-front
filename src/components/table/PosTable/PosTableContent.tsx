import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { ProductResponse } from '@/types/pos';
import { QuickInfoPopover } from './QuickInfoPopover';

// Lazy load ProductBatchDetailsPopover
const ProductBatchDetailsPopover = React.lazy(() =>
  import('@/components/pos/ProductDetailsPopover')
);

interface PosTableContentProps {
  products: ProductResponse[];
  loading: boolean;
  pagination: any;
}

export const PosTableContent: React.FC<PosTableContentProps> = ({
  products,
  loading,
  pagination,
}) => {
  const router = useRouter();

  const getStockBadge = (product: ProductResponse) => {
    const available = product.availableQuantity || 0;

    if (available === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (available <= 5) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Products ({pagination.total})</span>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Loading...
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Details</TableHead>
                {/* <TableHead>Actions</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium truncate">{product.name}</div>
                      {product.model && (
                        <div className="text-sm text-muted-foreground">Model: {product.model}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{product?.brand || 'No Brand'}</div>
                        <div className="text-xs text-muted-foreground">{product?.code || ''}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.category || 'No Category'}</div>
                      <div className="text-sm text-muted-foreground">{product.subcategory || 'No Subcategory'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {getStockBadge(product)}
                      <div className="text-xs text-gray-500">
                        <div>Available: {product.availableQuantity || 0}</div>
                        <div>Reserved: {product.reservedQuantity || 0}</div>
                        <div>Total: {(product.availableQuantity || 0) + (product.reservedQuantity || 0)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.costPrice || product.retailPrice ? (
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-purple-600">Retail: {formatPrice(product.retailPrice)}</span>
                        </div>
                        {product.wholesalePrice && (
                          <div className="text-xs text-green-600">
                            Wholesale: {formatPrice(product.wholesalePrice)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">No pricing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <QuickInfoPopover product={product} />
                      <Suspense fallback={<div className="w-4 h-4 animate-spin border border-muted border-t-transparent rounded-full" />}>
                        <ProductBatchDetailsPopover product={product} />
                      </Suspense>
                    </div>
                  </TableCell>
                  {/* <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/dashboard/products/all/view/' + product.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {products.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
