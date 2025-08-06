"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Printer, 
  Wifi,
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface BarcodeData {
  code: string;
  productName: string;
  price: number;
  currency?: string;
  status?: string;
}

interface WebSocketPrinterProps {
  barcodes: BarcodeData[];
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
}

const WebSocketPrinter: React.FC<WebSocketPrinterProps> = ({
  barcodes,
  onPrintSuccess,
  onPrintError
}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detectedDevices, setDetectedDevices] = useState<any[]>([]);

  const connectionIdRef = useRef<string>('');

  // Connect to local WebSocket bridge
  const connectToBridge = () => {
    try {
      const websocket = new WebSocket('ws://localhost:8765');
      
      websocket.onopen = () => {
        setWs(websocket);
        setIsConnected(true);
        setSuccess('Connected to local printer bridge');
        
        // Auto-detect printers
        websocket.send(JSON.stringify({
          type: 'detect',
          config: { type: 'all' }
        }));
      };

      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      websocket.onclose = () => {
        setWs(null);
        setIsConnected(false);
        setPrinterConnected(false);
        setError('Disconnected from printer bridge');
      };

      websocket.onerror = () => {
        setError('Failed to connect to local printer bridge. Make sure the bridge is running.');
      };

    } catch (err) {
      setError('WebSocket connection failed');
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'devices':
        setDetectedDevices(data.devices);
        break;
      case 'connected':
        connectionIdRef.current = data.connectionId;
        setPrinterConnected(true);
        setSuccess('Connected to printer');
        break;
      case 'printed':
        setSuccess('Print completed successfully');
        onPrintSuccess?.();
        break;
      case 'error':
        setError(data.message);
        onPrintError?.(data.message);
        break;
    }
  };

  const connectToPrinter = (device: any) => {
    if (!ws) return;

    const connectionId = Date.now().toString();
    const config = {
      type: device.type,
      port: device.path,
      vendorId: device.vendorId,
      productId: device.productId
    };

    ws.send(JSON.stringify({
      type: 'connect',
      connectionId,
      config
    }));
  };

  const handlePrint = () => {
    if (!ws || !printerConnected) return;

    setIsPrinting(true);
    setError(null);

    // Generate ZPL for all barcodes
    const allZPL = barcodes.map(barcode => {
      const { code, productName, price, currency = 'LKR', status = '' } = barcode;
      return `
^XA
^CF0,20
^FO10,10^FD${productName.substring(0, 25)}^FS
^FO10,40^BY2,3,40^BCN,40,Y,N,N^FD${code}^FS
^FO10,90^CF0,15^FD${code}^FS
^FO10,110^CF0,12^FD${status}^FS
^FO150,110^CF0,12^FD${currency} ${price.toFixed(2)}^FS
^XZ
      `.trim();
    }).join('\n');

    ws.send(JSON.stringify({
      type: 'print',
      connectionId: connectionIdRef.current,
      zpl: allZPL
    }));

    setIsPrinting(false);
  };

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Connection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4" />
            Local Printer Bridge
            <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
              {isConnected ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {isConnected ? 'Bridge Connected' : 'Bridge Disconnected'}
            </Badge>
            {printerConnected && (
              <Badge className="bg-blue-100 text-blue-800">
                Printer Ready
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div>
              <Button onClick={connectToBridge} className="w-full">
                <Wifi className="h-4 w-4 mr-2" />
                Connect to Local Bridge
              </Button>
              <div className="text-xs text-muted-foreground mt-2">
                Make sure the local printer bridge is running on port 8765
              </div>
            </div>
          ) : (
            <div>
              {/* Detected Devices */}
              {detectedDevices.length > 0 && !printerConnected && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Available Printers:</div>
                  {detectedDevices.map((device, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">
                          {device.type.toUpperCase()}: {device.path || `${device.vendorId}:${device.productId}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {device.manufacturer || 'USB Device'}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => connectToPrinter(device)}>
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Print Button */}
              <Button 
                onClick={handlePrint}
                disabled={!printerConnected || isPrinting || barcodes.length === 0}
                className="w-full"
              >
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                {isPrinting ? 'Printing...' : `Print ${barcodes.length} Barcode(s)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Setup Required:</strong>
          <br />1. Download and run the local printer bridge on your computer
          <br />2. Install: npm install ws serialport usb
          <br />3. Run: node local-printer-bridge.js
          <br />4. Connect your Zebra printer to this computer
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default WebSocketPrinter;