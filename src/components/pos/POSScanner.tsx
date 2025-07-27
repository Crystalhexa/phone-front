"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Search, Scan, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Updated interface based on API response
interface ScannedProduct {
  barcode_id?: string;
  barcode: string;
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL';
  product_id: string;
  name: string;
  model?: string;
  sku: string;
  brand?: {
    name: string;
    code: string;
  };
  category?: {
    category: string;
    subcategory: string;
  };
  pricing: {
    cost_price: number;
    wholesale_price?: number;
    retail_price: number;
    selling_price: number;
  };
  inventory: {
    available_quantity: number;
    is_low_stock: boolean;
  };
  item_details?: {
    item_id: string;
    status: string;
    condition: string;
    warranty_expiry?: string;
    location_branch: string;
    purchased_at: string;
    supplier_name?: string;
  };
  batch_info?: Array<{
    batch_id: string;
    batch_number: string;
    quantity: number;
    cost_price: number;
    wholesale_price?: number;
    retail_price: number;
    expiry_date?: string;
    received_date?: string;
  }>;
  requires_quantity_input: boolean;
  max_quantity?: number;
  warranty_period?: number;
}

interface POSScannerProps {
  onProductScanned: (formData: any, product: ScannedProduct) => void;
  isCartOpen?: boolean;
  compact?: boolean;
  className?: string;
}

export const POSScanner: React.FC<POSScannerProps> = ({
  onProductScanned,
  isCartOpen = false,
  compact = false,
  className = ""
}) => {
  const [scanInput, setScanInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus scanner input when component mounts or cart opens
  useEffect(() => {
    if (inputRef.current && isCartOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCartOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 to focus scanner
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear scanner
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setScanInput('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    setIsScanning(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode.trim() })
      });

      const result = await response.json();

      if (result.success) {
        const product = result.data as ScannedProduct;
        console.log('Scanned product data:', product);

        // For individual items, add directly to cart without quantity modal
        if (product.scan_type === 'INDIVIDUAL_ITEM') {
          handleDirectAddToCart(product);
          playBeep('success');
          
          toast.success(`${product.name} added to cart`, {
            description: `Individual Item - ${product.item_details?.condition || 'N/A'} condition`,
            icon: "📱",
          });
        } 
        // For product level items, show quantity modal if requires quantity input
        else if (product.requires_quantity_input || product.scan_type === 'PRODUCT_LEVEL') {
          setScannedProduct(product);
          setQuantity(1);
          setBatchNumber(product.batch_info?.[0]?.batch_number || '');
          setExpiryDate(product.batch_info?.[0]?.expiry_date || '');
          setShowQuantityModal(true);
          playBeep('success');
          
          toast.success(`${product.name} scanned - enter quantity`, {
            description: `Product Level - ${product.batch_info?.length || 0} batches available`,
            icon: "📦",
          });
        } 
        // Fallback for other cases
        else {
          handleDirectAddToCart(product);
          playBeep('success');
          
          toast.success(`${product.name} added to cart`, {
            description: `${product.scan_type} - ${product.brand?.name || 'No Brand'}`,
            icon: "📱",
          });
        }

      } else {
        toast.error(result.message || 'Product not found');
        playBeep('error');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan barcode. Please try again.');
      playBeep('error');
    } finally {
      setIsScanning(false);
      setScanInput('');
    }
  };

  const handleDirectAddToCart = (product: ScannedProduct) => {
    // Pass the product directly to the cart component
    // The cart will handle grouping logic for individual items
    const formData = {
      barcode: product.barcode,
      barcode_id: product.barcode_id,
      quantity: 1, // Individual items always have quantity 1
      scan_type: product.scan_type,
    };

    onProductScanned(formData, product);
    
    // Refocus scanner input after adding to cart
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleAddToCart = (product: ScannedProduct, qty: number) => {
    const formData = {
      barcode: product.barcode,
      barcode_id: product.barcode_id,
      quantity: qty,
      scan_type: product.scan_type,
      cost_price: product.pricing.cost_price,
      wholesale_price: product.pricing.wholesale_price,
      retail_price: product.pricing.retail_price,
      selling_price: product.pricing.selling_price,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    onProductScanned(formData, product);
    setShowQuantityModal(false);
    setScannedProduct(null);
    
    // Refocus scanner input after adding to cart
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const playBeep = (type: 'success' | 'error') => {
    // Create audio context for beep sounds
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = type === 'success' ? 800 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Fallback for browsers that don't support Web Audio API
      console.log(`${type} beep`);
    }
  };

  const handleInputChange = (value: string) => {
    setScanInput(value);
    
    // Clear existing timeout
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Auto-scan after 100ms of no input (simulates barcode scanner behavior)
    if (value.length > 3) {
      scanTimeoutRef.current = setTimeout(() => {
        handleBarcodeScan(value);
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      handleBarcodeScan(scanInput);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            value={scanInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scan barcode or press F2..."
            className="pl-10 pr-12 font-mono"
            disabled={isScanning}
          />
          {isScanning && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Quantity Modal */}
        <QuantityModal
          product={scannedProduct}
          isOpen={showQuantityModal}
          quantity={quantity}
          setQuantity={setQuantity}
          batchNumber={batchNumber}
          setBatchNumber={setBatchNumber}
          expiryDate={expiryDate}
          setExpiryDate={setExpiryDate}
          onConfirm={() => scannedProduct && handleAddToCart(scannedProduct, quantity)}
          onCancel={() => {
            setShowQuantityModal(false);
            setScannedProduct(null);
            inputRef.current?.focus();
          }}
          formatCurrency={formatCurrency}
        />
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scan className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Barcode Scanner</h3>
        <Badge variant="outline" className="text-xs">F2</Badge>
      </div>
      
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            value={scanInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scan barcode here..."
            className="pl-10 pr-12 font-mono text-lg"
            disabled={isScanning}
          />
          {isScanning ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Scan className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          )}
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Scanner ready - Press F2 to focus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Supports both individual items and bulk products</span>
          </div>
        </div>
      </div>

      {/* Quantity Modal */}
      <QuantityModal
        product={scannedProduct}
        isOpen={showQuantityModal}
        quantity={quantity}
        setQuantity={setQuantity}
        batchNumber={batchNumber}
        setBatchNumber={setBatchNumber}
        expiryDate={expiryDate}
        setExpiryDate={setExpiryDate}
        onConfirm={() => scannedProduct && handleAddToCart(scannedProduct, quantity)}
        onCancel={() => {
          setShowQuantityModal(false);
          setScannedProduct(null);
          inputRef.current?.focus();
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

interface QuantityModalProps {
  product: ScannedProduct | null;
  isOpen: boolean;
  quantity: number;
  setQuantity: (qty: number) => void;
  batchNumber: string;
  setBatchNumber: (batch: string) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  formatCurrency: (amount: number) => string;
}

const QuantityModal: React.FC<QuantityModalProps> = ({
  product,
  isOpen,
  quantity,
  setQuantity,
  batchNumber,
  setBatchNumber,
  expiryDate,
  setExpiryDate,
  onConfirm,
  onCancel,
  formatCurrency
}) => {
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && quantityInputRef.current) {
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  if (!product) return null;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const total = quantity * product.pricing.selling_price;
  const maxQuantity = product.max_quantity || product.inventory.available_quantity || 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Select Quantity & Batch
          </DialogTitle>
          <DialogDescription>
            Configure quantity and batch details for this product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium">{product.name}</h4>
            {product.model && (
              <p className="text-sm text-muted-foreground">Model: {product.model}</p>
            )}
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            {product.brand && (
              <p className="text-sm text-muted-foreground">Brand: {product.brand.name}</p>
            )}
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Cost Price:</span>
                <span>{formatCurrency(product.pricing.cost_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Retail Price:</span>
                <span>{formatCurrency(product.pricing.retail_price)}</span>
              </div>
              <div className="flex justify-between font-medium col-span-2">
                <span>Selling Price:</span>
                <span>{formatCurrency(product.pricing.selling_price)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm">Available:</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{product.inventory.available_quantity}</Badge>
                {product.inventory.is_low_stock && (
                  <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                )}
              </div>
            </div>

            {product.batch_info && product.batch_info.length > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <p className="font-medium mb-1">Available Batches:</p>
                {product.batch_info.map((batch, index) => (
                  <div key={batch.batch_id} className="mt-1">
                    <p>• {batch.batch_number} (Qty: {batch.quantity})</p>
                    {batch.expiry_date && (
                      <p className="ml-2 text-xs">Expires: {new Date(batch.expiry_date).toLocaleDateString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              ref={quantityInputRef}
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))}
              onKeyPress={handleKeyPress}
              className="text-center text-lg font-medium"
            />
            <div className="text-xs text-muted-foreground text-center">
              Max: {maxQuantity}
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Line Total:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel (Esc)
            </Button>
            <Button onClick={onConfirm} className="flex-1">
              Add to Cart (Enter)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};