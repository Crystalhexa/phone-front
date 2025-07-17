"use client"
import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Plus, Trash2, Package, FileText, CheckCircle, AlertCircle, Scan, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { SearchableDropdown } from '@/components/form/SearchableDropdown';
import { useSupplierData } from '@/components/table/SupplierTable/SupplierData';
import POSBarcodeScanner from '@/components/pos/POSBarcodeScanner';
import { Product } from '@/lib/type/product';

// Validation Schema
const PurchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  product_name: z.string().min(1, 'Product name is required'),
  product_code: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  cost_price: z.number().min(0.01, 'Cost price must be greater than 0'),
  wholesale_price: z.number().optional(),
  retail_price: z.number().min(0.01, 'Retail price must be greater than 0'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
});

const PurchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  items: z.array(PurchaseOrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  expected_delivery_date: z.date().optional()
});

type PurchaseOrderFormData = z.infer<typeof PurchaseOrderSchema>;
type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

// Add Item Dialog Component
const AddItemDialog = ({
  isOpen,
  onClose,
  onAddItem
}: {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: PurchaseOrderItem) => void;
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState<number | undefined>();
  const [retailPrice, setRetailPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [isbarcodeLoading, setIsbarcoeLoading] = useState(false);
  const [barcodeError, setbarcodeError] = useState<Error | null>(null);
  console.log(selectedProduct)

  const handleProductScanned = (product: Product) => {
    if (product) {
      setSelectedProduct(product);
    } else {
      alert('Product not found!');
    }
  };
  const handleBarcodeError = (err: Error) => {
    setbarcodeError(err);
    console.error('Scanner error:', err);
  };

  const handleBarcoeLoadingChange = (loading: boolean) => {
    setIsbarcoeLoading(loading);
  };


  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !costPrice || !retailPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const newItem: PurchaseOrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      cost_price: costPrice,
      wholesale_price: wholesalePrice,
      retail_price: retailPrice,
      notes: notes || undefined
    };

    onAddItem(newItem);

    // Reset form
    setSelectedProduct(undefined);
    setQuantity(1);
    setCostPrice(0);
    setWholesalePrice(undefined);
    setRetailPrice(0);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Add Item to Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Selection</label>
            <div className="flex gap-2">
              <POSBarcodeScanner
                onProductScanned={handleProductScanned}
                onError={handleBarcodeError}
                onLoadingChange={handleBarcoeLoadingChange}
                timeout={300}
                debounceMs={100}
              />
              <div className="mt-4 space-y-2">
                <div className="p-2  rounded">
                  {isbarcodeLoading && <p>Loading product info...</p>}
                  {barcodeError && <p style={{ color: 'red' }}>Error: {barcodeError.message}</p>}
                  {selectedProduct && (
                    <div>
                      <p>Product: {selectedProduct?.name}</p>
                      <p>SKU: {selectedProduct?.sku}</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* Pricing Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Price *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Wholesale Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice || ''}
                onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || undefined)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retail Price *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={retailPrice}
                onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Additional notes for this item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Total Preview */}
          {selectedProduct && quantity && costPrice && (
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Item Total:</span>
                <span className="font-bold text-green-700">
                  ${(costPrice * quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!selectedProduct || !quantity || !costPrice || !retailPrice}
            >
              Add Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function PurchaseOrderForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);


  const {
    data: supplierOptions,
    isLoading: isSearching,
    handleSearch: handleSupplierSearch,
    searchTerm,
    error,
    currentPage,
    pageSize,
    totalPages,
    setCurrentPage,
    handlePageSizeChange,
  } = useSupplierData()

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(PurchaseOrderSchema),
    defaultValues: {
      supplier_id: '',
      items: [],
      notes: '',
      expected_delivery_date: undefined
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const watchedItems = form.watch('items');

  // Calculate totals
  const totalAmount = watchedItems.reduce((sum, item) => {
    return sum + (item.cost_price * item.quantity);
  }, 0);

  const totalItems = watchedItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async (data: PurchaseOrderFormData) => {
    console.log(data)
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Purchase Order Data:', data);
      setSubmitMessage({ type: 'success', message: 'Purchase order created successfully!' });
      form.reset();
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create purchase order'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = (item: PurchaseOrderItem) => {
    append(item);
  };

  const handleRemoveItem = (index: number) => {
    remove(index);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Purchase Order</h1>
          <p className="text-gray-600 mt-2">Place a new order with your supplier</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Package className="w-4 h-4 mr-2" />
          New Order
        </Badge>
      </div>

      {/* Alert Messages */}
      {submitMessage && (
        <Alert className={`mb-6 ${submitMessage.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          {submitMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={submitMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {submitMessage.message}
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <div onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Order Information Section */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center mb-6">
              <FileText className="w-5 h-5 mr-2 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Order Information</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Controller
                name="supplier_id"
                control={form.control}
                render={({ field }) => (
                  <SearchableDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select Supplier"
                    searchPlaceholder="Search supplier..."
                    options={supplierOptions?.data?.suppliers || []} // array of branches: { id, name, ... }
                    disabled={false}
                    emptyMessage="No supplier found"
                    onSearch={handleSupplierSearch} // optional, for remote search
                    searchTerm={searchTerm}
                    isSearching={isSearching}
                  />
                )}
              />

              <FormField
                control={form.control}
                name="expected_delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Expected Delivery Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full h-10 pl-3 text-left font-normal ${!field.value && "text-muted-foreground"
                              }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Order Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for this order..."
                        className="resize-none min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className=" border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Order Items</h2>
              </div>
              <Button
                type="button"
                onClick={() => setIsAddItemOpen(true)}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No items added yet</p>
                <p className="text-sm mt-1">Click "Add Item" to start building your order</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Product</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Quantity</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Cost Price</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Wholesale</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Retail Price</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Total</TableHead>
                      <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id} className="hover:bg-gray-50">
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{field.product_name}</span>
                            <span className="text-sm text-gray-500">{field.product_code}</span>
                            {field.notes && (
                              <span className="text-xs text-gray-400 mt-1">{field.notes}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="px-3 py-1">{field.quantity}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${field.cost_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {field.wholesale_price ? `$${field.wholesale_price.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${field.retail_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          ${(field.cost_price * field.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Order Summary */}
          {fields.length > 0 && (
            <div className=" border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-500 mb-4">Order Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
                  <div className="text-sm text-gray-600">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{fields.length}</div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">${totalAmount.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
              className="px-6"
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || fields.length === 0}
              className="px-6 min-w-[140px]"
            >
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </div>
      </Form>

      {/* Add Item Dialog */}
      <AddItemDialog
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}