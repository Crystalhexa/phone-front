"use client";

import React, { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Package, 
  FileText, 
  Printer, 
  Download,
  CheckCircle,
  AlertCircle,
  Truck,
  ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';

// Validation Schema
const ReceiveNoteItemSchema = z.object({
  product_id: z.string().max(20).optional(),
  ordered_quantity: z.number().min(1),
  received_quantity: z.number().min(0),
  damaged_quantity: z.number().min(0).optional(),
  batch_number: z.string().min(1, 'Batch number is required'),
  expiry_date: z.date().optional(),
  notes: z.string().max(500).optional()
});

const ReceiveNoteSchema = z.object({
  purchase_order_id: z.string().min(1, 'Purchase order is required'),
  received_date: z.date(),
  received_by: z.string().min(1, 'Received by is required'),
  items: z.array(ReceiveNoteItemSchema),
  delivery_note_number: z.string().optional(),
  vehicle_number: z.string().optional(),
  driver_name: z.string().optional(),
  condition_notes: z.string().max(1000).optional(),
  total_boxes: z.number().min(0).optional()
});

type ReceiveNoteFormData = z.infer<typeof ReceiveNoteSchema>;

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    cost_price: number;
    received_quantity?: number;
  }>;
}

interface ReceiveNoteGeneratorProps {
  purchaseOrders: PurchaseOrder[];
  
  loading?: boolean;
}

export default function ReceiveNoteGenerator({
  purchaseOrders,
 
  loading = false
}: ReceiveNoteGeneratorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<ReceiveNoteFormData>({
    resolver: zodResolver(ReceiveNoteSchema),
    defaultValues: {
      purchase_order_id: '',
      received_date: new Date(),
      received_by: '',
      items: [],
      delivery_note_number: '',
      vehicle_number: '',
      driver_name: '',
      condition_notes: '',
      total_boxes: 0
    }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const watchedItems = form.watch('items');
  const watchedPOId = form.watch('purchase_order_id');

  // Handle purchase order selection
  const handlePOSelection = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      const items = po.items.map(item => ({
        product_id: item.product_id,
        ordered_quantity: item.quantity,
        received_quantity: item.quantity,
        damaged_quantity: 0,
        batch_number: '',
        expiry_date: undefined,
        notes: ''
      }));
      replace(items);
    }
  };

  // Calculate totals
  const totalOrdered = watchedItems.reduce((sum, item) => sum + item.ordered_quantity, 0);
  const totalReceived = watchedItems.reduce((sum, item) => sum + item.received_quantity, 0);
  const totalDamaged = watchedItems.reduce((sum, item) => sum + (item.damaged_quantity || 0), 0);
  const receivedPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;

  const handleSubmit = async (data: ReceiveNoteFormData) => {
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      
      setSubmitMessage({ type: 'success', message: 'Receive note created successfully!' });
      setShowPreview(true);
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create receive note' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const generateReceiveNoteNumber = () => {
    const date = new Date();
    const dateStr = format(date, 'yyyyMMdd');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RN${dateStr}${randomStr}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goods Receive Note</h1>
          <p className="text-gray-600 mt-1">Record received items from purchase orders</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Truck className="w-4 h-4 mr-2" />
          Receiving
        </Badge>
      </div>

      {submitMessage && (
        <Alert className={submitMessage.type === 'success' ? 'border-green-500' : 'border-red-500'}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Purchase Order Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Purchase Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="purchase_order_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Order *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handlePOSelection(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a purchase order" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {purchaseOrders?.map((po) => (
                              <SelectItem key={po.id} value={po.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{po.order_number}</span>
                                  <span className="text-sm text-gray-500">
                                    {po.supplier_name} • ${po.total_amount.toFixed(2)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPO && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium mb-2">Order Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Order Number:</span>
                          <p className="font-medium">{selectedPO.order_number}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Supplier:</span>
                          <p className="font-medium">{selectedPO.supplier_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <p className="font-medium">${selectedPO.total_amount.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge variant="outline">{selectedPO.status}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="received_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Received Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={`w-full pl-3 text-left font-normal ${
                                    !field.value && "text-muted-foreground"
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
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="received_by"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Received By *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter receiver name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="delivery_note_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Note Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter delivery note number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicle_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter vehicle number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driver_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter driver name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="total_boxes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Boxes/Packages</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="condition_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes about the condition of received goods..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Items Section */}
              {fields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Received Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {fields.map((field, index) => {
                        const product = selectedPO?.items.find(item => item.product_id === field.product_id);
                        return (
                          <div key={field.id} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium">
                                {product?.product_name || `Product ${index + 1}`}
                              </h4>
                              <Badge variant="outline">
                                {watchedItems[index]?.received_quantity || 0} / {watchedItems[index]?.ordered_quantity || 0}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Ordered Quantity</label>
                                <Input
                                  type="number"
                                  value={watchedItems[index]?.ordered_quantity || 0}
                                  disabled
                                  className="bg-gray-100"
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name={`items.${index}.received_quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Received Quantity *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.damaged_quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Damaged Quantity</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.batch_number`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Batch Number *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter batch number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.expiry_date`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Expiry Date</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={`w-full pl-3 text-left font-normal ${
                                              !field.value && "text-muted-foreground"
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
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.notes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Notes</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Notes for this item..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Item Status */}
                            <div className="mt-4 p-3 bg-white rounded-lg border">
                              <div className="flex justify-between items-center text-sm">
                                <span>Status:</span>
                                <span className={`font-medium ${
                                  watchedItems[index]?.received_quantity === watchedItems[index]?.ordered_quantity
                                    ? 'text-green-600'
                                    : watchedItems[index]?.received_quantity > 0
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}>
                                  {watchedItems[index]?.received_quantity === watchedItems[index]?.ordered_quantity
                                    ? 'Fully Received'
                                    : watchedItems[index]?.received_quantity > 0
                                    ? 'Partially Received'
                                    : 'Not Received'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  Reset Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || loading || !selectedPO}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? 'Creating...' : 'Create Receive Note'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardCheck className="w-5 h-5 mr-2" />
                Receiving Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Ordered:</span>
                  <span className="font-medium">{totalOrdered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Received:</span>
                  <span className="font-medium text-green-600">{totalReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Damaged:</span>
                  <span className="font-medium text-red-600">{totalDamaged}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Received Percentage:</span>
                  <span className={`font-medium ${
                    receivedPercentage === 100 ? 'text-green-600' : 
                    receivedPercentage > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {receivedPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!selectedPO}
              >
                <FileText className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handlePrint}
                disabled={!showPreview}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Note
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={!showPreview}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && selectedPO && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Receive Note Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-6 p-8 bg-white">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">GOODS RECEIVE NOTE</h1>
                <p className="text-sm text-gray-600 mt-1">
                  RN#{generateReceiveNoteNumber()}
                </p>
              </div>

              {/* Company Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">Company Details</h3>
                  <p className="text-sm text-gray-600">
                    Your Company Name<br />
                    Address Line 1<br />
                    Address Line 2<br />
                    Phone: (555) 123-4567
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Supplier Details</h3>
                  <p className="text-sm text-gray-600">
                    {selectedPO.supplier_name}<br />
                    PO: {selectedPO.order_number}<br />
                    Date: {format(form.watch('received_date'), 'PPP')}
                  </p>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded">
                <div>
                  <span className="text-sm font-medium">Received By:</span>
                  <p className="text-sm">{form.watch('received_by') || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Vehicle:</span>
                  <p className="text-sm">{form.watch('vehicle_number') || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Driver:</span>
                  <p className="text-sm">{form.watch('driver_name') || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold mb-3">Received Items</h3>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Product</th>
                      <th className="border border-gray-300 p-2 text-center">Ordered</th>
                      <th className="border border-gray-300 p-2 text-center">Received</th>
                      <th className="border border-gray-300 p-2 text-center">Damaged</th>
                      <th className="border border-gray-300 p-2 text-center">Batch</th>
                      <th className="border border-gray-300 p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchedItems.map((item, index) => {
                      const product = selectedPO.items.find(p => p.product_id === item.product_id);
                      return (
                        <tr key={index}>
                          <td className="border border-gray-300 p-2">{product?.product_name || 'Unknown'}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.ordered_quantity}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.received_quantity}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.damaged_quantity || 0}</td>
                          <td className="border border-gray-300 p-2 text-center">{item.batch_number || 'N/A'}</td>
                          <td className="border border-gray-300 p-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.received_quantity === item.ordered_quantity
                                ? 'bg-green-100 text-green-800'
                                : item.received_quantity > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.received_quantity === item.ordered_quantity
                                ? 'Complete'
                                : item.received_quantity > 0
                                ? 'Partial'
                                : 'Missing'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Items Ordered:</span>
                      <span>{totalOrdered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Items Received:</span>
                      <span className="text-green-600">{totalReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Items Damaged:</span>
                      <span className="text-red-600">{totalDamaged}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Completion Rate:</span>
                      <span>{receivedPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">
                    {form.watch('condition_notes') || 'No additional notes'}
                  </p>
                </div>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-2 gap-8 mt-8">
                <div>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm text-center">Receiver Signature</p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-2">
                    <p className="text-sm text-center">Manager Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}