import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Info,
  Calendar,
  Settings,
  Barcode,
  Hash
} from 'lucide-react';
import { ProductResponse } from '@/types/pos';

interface QuickInfoPopoverProps {
  product: ProductResponse;
}

export const QuickInfoPopover: React.FC<QuickInfoPopoverProps> = ({ product }:any) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="sm" className="p-1 h-auto">
        <Info className="w-4 h-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80" side="left" align="start">
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          Quick Info
        </h4>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Created:</span>
            <span className="text-muted-foreground">
              {new Date(product.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Updated:</span>
            <span className="text-muted-foreground">
              {new Date(product.updated_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Warranty:</span>
            <span className="text-muted-foreground">
              {product.warranty_period ? `${product.warranty_period} months` : 'None'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Barcode className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium min-w-0">Barcodes:</span>
            <span className="text-muted-foreground">
              {product?.barcodes?.length>0 ? product.barcodes[0] : 'No barcodes available'}
            </span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-medium block">SKU:</span>
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 block break-all">
                {product.sku}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);