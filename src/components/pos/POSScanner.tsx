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

interface ScannedProduct {
  barcode: string;
  product_id: string;
  name: string;
  model?: string;
  sku?: string;
  brand?: string;
  pricing: {
    cost_price: number;
    wholesale_price?: number;
    selling_price: number;
  };
  inventory: {
    available_quantity: number;
    location?: string;
  };
  max_quantity: number;
  scan_type: 'INDIVIDUAL_ITEM' | 'PRODUCT_LEVEL';
  requires_quantity_input: boolean;
}

interface POSScannerProps {
  onProductScanned: (formData: {
    quantity: number;
    cost_price?: number;
    wholesale_price?: number;
    retail_price?: number;
    batch_number?: string;
    expiry_date?: string;
  }, product: any) => void;
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
      // Mock API call - replace with your actual API endpoint
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: barcode.trim() })
      });

      const result = await response.json();

      if (result.success) {
        const product = result.data as ScannedProduct;

        if (product.requires_quantity_input || product.scan_type === 'PRODUCT_LEVEL') {
          // Show quantity input modal for product-level items
          setScannedProduct(product);
          setQuantity(1);
          setBatchNumber('');
          setExpiryDate('');
          setShowQuantityModal(true);
          
          // Play success sound
          playBeep('success');
        } else {
          // Directly add individual items
          handleAddToCart(product, 1);
          playBeep('success');
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

  const handleAddToCart = (product: ScannedProduct, qty: number) => {

    const formData = {
      barcode: product.barcode,
      quantity: qty,
      cost_price: product.pricing.cost_price,
      wholesale_price: product.pricing.wholesale_price,
      retail_price: product.pricing.selling_price,
      batch_number: batchNumber || undefined,
      expiry_date: expiryDate || undefined,
    };

    // Convert ScannedProduct to your CartItem format
    const cartProduct = {
      id: product.product_id,
      barcode: product.barcode,
      name: product.name,
      model: product.model,
      sku: product.sku,
      brand: product.brand,
      current_prices: {
        cost_price: product.pricing.cost_price,
        wholesale_price: product.pricing.wholesale_price,
        retail_price: product.pricing.selling_price,
      }
    };

    onProductScanned(formData, cartProduct);
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
  onCancel
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

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add to Cart
          </DialogTitle>
          <DialogDescription>
            Specify quantity and details for this product
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium">{product.name}</h4>
            {product.model && (
              <p className="text-sm text-muted-foreground">Model: {product.model}</p>
            )}
            {product.sku && (
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm">Unit Price:</span>
              <span className="font-medium">${product.pricing.selling_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Available:</span>
              <Badge variant="outline">{product.inventory.available_quantity}</Badge>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              ref={quantityInputRef}
              id="quantity"
              type="number"
              min="1"
              max={product.max_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyPress={handleKeyPress}
              className="text-center text-lg font-medium"
            />
            <div className="text-xs text-muted-foreground text-center">
              Max: {product.max_quantity}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="batch">Batch Number</Label>
              <Input
                id="batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Optional"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Line Total:</span>
              <span className="text-xl font-bold text-primary">
                ${total.toFixed(2)}
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