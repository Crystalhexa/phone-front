"use client"
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Printer, 
  Package, 
  Barcode as BarcodeIcon, 
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
// types/product.ts
 interface Product {
  id: string;
  name: string;
  description?: string;
  subcategory_id?: string;
  brand_id?: string;
  created_at: string;
  updated_at: string;
  brand?: {
    id: string;
    name: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  variations: ProductVariation[];
}

 interface ProductVariation {
  id: string;
  product_id: string;
  sku: string;
  name?: string;
  cost_price: number;
  wholesale_price?: number;
  retail_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  warranty_period?: number;
  created_at: string;
  updated_at: string;
  barcodes: Barcode[];
  attributes: ProductVariationAttribute[];
}

 interface Barcode {
  id: string;
  variation_id: string;
  code: string;
  type: 'INTERNAL' | 'UPC' | 'EAN';
  is_active: boolean;
  created_at: string;
}

 interface ProductVariationAttribute {
  id: string;
  variation_id: string;
  attribute_id: string;
  attribute_value_id: string;
  attribute: {
    id: string;
    name: string;
  };
  attribute_value: {
    id: string;
    value: string;
  };
}

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct(id as string);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/products/${productId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      setProduct(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVariationSelect = (variationId: string, checked: boolean) => {
    const newSelected = new Set(selectedVariations);
    if (checked) {
      newSelected.add(variationId);
    } else {
      newSelected.delete(variationId);
    }
    setSelectedVariations(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && product) {
      setSelectedVariations(new Set(product.variations.map(v => v.id)));
    } else {
      setSelectedVariations(new Set());
    }
  };

  const generateBarcodeStickers = async () => {
    if (selectedVariations.size === 0) {
      alert('Please select at least one variation to print barcodes');
      return;
    }

    if (!product) return;

    setPrinting(true);

    try {
      const selectedData = product.variations.filter(v => 
        selectedVariations.has(v.id)
      );

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Could not open print window');
      }

      const stickersHtml = generateStickersHTML(selectedData);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Barcode Stickers - ${product.name}</title>
            <meta charset="utf-8">
            <style>
              ${getBarcodeCSS()}
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
          </head>
          <body>
            <div class="print-header">
              <h1>Barcode Stickers</h1>
              <p>Product: ${product.name} | Generated: ${new Date().toLocaleString()}</p>
            </div>
            ${stickersHtml}
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const barcodes = document.querySelectorAll('.barcode-canvas');
                let loadedCount = 0;
                
                barcodes.forEach(canvas => {
                  const code = canvas.dataset.code;
                  if (code) {
                    try {
                      JsBarcode(canvas, code, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true,
                        fontSize: 14,
                        margin: 5,
                        background: "#ffffff",
                        lineColor: "#000000"
                      });
                      loadedCount++;
                    } catch (e) {
                      console.error('Error generating barcode for:', code, e);
                    }
                  }
                });
                
                // Auto print after all barcodes are generated
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 1000);
              });
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating barcode stickers:', error);
      alert('Error generating barcode stickers. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  const generateStickersHTML = (variations: ProductVariation[]) => {
    return `
      <div class="stickers-container">
        ${variations.map((variation, index) => {
          const activeBarcode = variation.barcodes.find(b => b.is_active);
          if (!activeBarcode) return '';

          const attributes = variation.attributes.map(attr => 
            `${attr.attribute.name}: ${attr.attribute_value.value}`
          ).join(' | ');

          return `
            <div class="sticker" data-index="${index}">
              <div class="sticker-header">
                <div class="product-name">${product?.name || ''}</div>
                ${variation.name ? `<div class="variation-name">${variation.name}</div>` : ''}
              </div>
              
              <div class="product-details">
                <div class="sku-line">
                  <span class="label">SKU:</span>
                  <span class="value">${variation.sku}</span>
                </div>
                <div class="price-line">
                  <span class="label">Price:</span>
                  <span class="value">₹${Number(variation.retail_price).toFixed(2)}</span>
                </div>
                ${attributes ? `<div class="attributes">${attributes}</div>` : ''}
              </div>
              
              <div class="barcode-section">
                <canvas class="barcode-canvas" data-code="${activeBarcode.code}"></canvas>
                <div class="barcode-text">${activeBarcode.code}</div>
              </div>
              
              <div class="sticker-footer">
                <div class="stock-info">Stock: ${variation.stock_quantity}</div>
                ${variation.warranty_period ? `<div class="warranty">Warranty: ${variation.warranty_period}M</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  const getBarcodeCSS = () => `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      background: white;
      color: black;
      padding: 10mm;
    }
    
    .print-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    
    .print-header h1 {
      font-size: 24px;
      margin-bottom: 5px;
    }
    
    .print-header p {
      font-size: 12px;
      color: #666;
    }
    
    .stickers-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90mm, 1fr));
      gap: 5mm;
      width: 100%;
    }
    
    .sticker {
      width: 90mm;
      height: 60mm;
      border: 2px solid #000;
      padding: 3mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: white;
      page-break-inside: avoid;
      position: relative;
    }
    
    .sticker-header {
      text-align: center;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2mm;
      margin-bottom: 2mm;
    }
    
    .product-name {
      font-size: 14px;
      font-weight: bold;
      line-height: 1.2;
      margin-bottom: 1mm;
    }
    
    .variation-name {
      font-size: 11px;
      color: #666;
      font-style: italic;
    }
    
    .product-details {
      flex: 1;
      font-size: 10px;
    }
    
    .sku-line, .price-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1mm;
    }
    
    .label {
      font-weight: bold;
    }
    
    .value {
      font-weight: normal;
    }
    
    .attributes {
      font-size: 8px;
      color: #666;
      margin-top: 1mm;
      line-height: 1.2;
    }
    
    .barcode-section {
      text-align: center;
      margin: 2mm 0;
    }
    
    .barcode-canvas {
      max-width: 100%;
      height: auto;
    }
    
    .barcode-text {
      font-size: 10px;
      font-family: 'Courier New', monospace;
      margin-top: 1mm;
    }
    
    .sticker-footer {
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 1mm;
    }
    
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      
      .print-header {
        display: none;
      }
      
      .sticker {
        page-break-inside: avoid;
      }
    }
  `;

  const getStockStatus = (variation: ProductVariation) => {
    if (variation.stock_quantity === 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const };
    } else if (variation.stock_quantity <= variation.low_stock_threshold) {
      return { status: 'Low Stock', variant: 'secondary' as const };
    } else {
      return { status: 'In Stock', variant: 'default' as const };
    }
  };

  const formatAttributes = (attributes: ProductVariation['attributes']) => {
    return attributes.map(attr => 
      `${attr.attribute.name}: ${attr.attribute_value.value}`
    ).join(', ');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading product...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>Product not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Product Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription className="mt-2">
                {product.description && <span>{product.description}</span>}
                {product.brand && <span> • Brand: {product.brand.name}</span>}
                {product.subcategory && <span> • Category: {product.subcategory.name}</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Variations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Variations</CardTitle>
              <CardDescription>
                Manage product variations and generate barcode stickers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => generateBarcodeStickers()}
                disabled={selectedVariations.size === 0 || printing}
                className="flex items-center gap-2"
              >
                {printing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Print Barcodes ({selectedVariations.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {product.variations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No variations found for this product.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedVariations.size === product.variations.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All ({product.variations.length} variations)
                </label>
              </div>
              
              <Separator />
              
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Retail Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Barcode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variations.map((variation) => {
                      const stockStatus = getStockStatus(variation);
                      const activeBarcode = variation.barcodes.find(b => b.is_active);
                      
                      return (
                        <TableRow key={variation.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedVariations.has(variation.id)}
                              onCheckedChange={(checked) => 
                                handleVariationSelect(variation.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {variation.sku}
                          </TableCell>
                          <TableCell>
                            {variation.name || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatAttributes(variation.attributes) || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            ₹{Number(variation.cost_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{Number(variation.retail_price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{variation.stock_quantity}</span>
                              <span className="text-xs text-muted-foreground">
                                Low: {variation.low_stock_threshold}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {activeBarcode ? (
                              <div className="flex items-center gap-2">
                                <BarcodeIcon className="h-4 w-4" />
                                <span className="font-mono text-xs">
                                  {activeBarcode.code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No barcode</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}