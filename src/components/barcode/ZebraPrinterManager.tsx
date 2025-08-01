"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    Printer,
    Wifi,
    CheckCircle,
    XCircle,
    Loader2,
    TestTube,
    AlertTriangle,
    Search,
    RefreshCw,
    Zap
} from 'lucide-react';

interface BarcodeData {
    code: string;
    productName: string;
    price: number;
    currency?: string;
    status?: string;
    batchNumber?: string;
    expiryDate?: string;
}

interface DiscoveredPrinter {
    ip: string;
    port: number;
    status: string;
    model?: string;
    responseTime?: number;
}

interface ZebraPrinterManagerProps {
    barcodes: BarcodeData[];
    onPrintSuccess?: () => void;
    onPrintError?: (error: string) => void;
}

const ZebraPrinterManager: React.FC<ZebraPrinterManagerProps> = ({
    barcodes,
    onPrintSuccess,
    onPrintError
}) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [isGettingStatus, setIsGettingStatus] = useState(false);

    const [printerIP, setPrinterIP] = useState('192.168.1.100');
    const [printerPort, setPrinterPort] = useState(9100);
    const [labelSize, setLabelSize] = useState<'2x1' | '4x2' | '4x6'>('2x1');
    const [testType, setTestType] = useState<'basic' | 'barcode' | 'configuration'>('basic');

    const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
    const [printerStatus, setPrinterStatus] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Auto-clear messages
    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Connect to printer
    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            const response = await fetch('/api/zebra-printer/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: printerIP, port: printerPort })
            });

            const result = await response.json();

            if (result.success) {
                setIsConnected(true);
                setSuccess(`Connected to printer at ${printerIP}:${printerPort}`);
                // Get initial status
                await getPrinterStatus();
            } else {
                setError(result.message);
                onPrintError?.(result.message);
            }
        } catch (err) {
            const errorMessage = 'Failed to connect to printer';
            setError(errorMessage);
            onPrintError?.(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect from printer
    const handleDisconnect = () => {
        setIsConnected(false);
        setPrinterStatus(null);
        setSuccess('Disconnected from printer');
    };

    // Discover printers on network
    const handleDiscoverPrinters = async () => {
        setIsDiscovering(true);
        setError(null);

        try {
            const ipRange = printerIP.split('.').slice(0, 3).join('.');
            const response = await fetch(`/api/zebra-printer/discover?ipRange=${ipRange}&timeout=2000`);
            const result = await response.json();

            if (result.success) {
                setDiscoveredPrinters(result.data.printers);
                setSuccess(`Found ${result.data.printers.length} printer(s)`);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to discover printers');
        } finally {
            setIsDiscovering(false);
        }
    };

    // Get printer status
    const getPrinterStatus = async () => {
        if (!isConnected) return;

        setIsGettingStatus(true);
        try {
            const response = await fetch('/api/zebra-printer/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: printerIP, port: printerPort })
            });

            const result = await response.json();
            if (result.success) {
                setPrinterStatus(result.data);
            }
        } catch (err) {
            console.error('Failed to get printer status:', err);
        } finally {
            setIsGettingStatus(false);
        }
    };

    // Test print
    const handleTestPrint = async () => {
        setIsTesting(true);
        setError(null);

        try {
            const response = await fetch('/api/zebra-printer/test-print', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: printerIP,
                    port: printerPort,
                    testType
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess('Test print sent successfully!');
            } else {
                setError(result.message);
                onPrintError?.(result.message);
            }
        } catch (err) {
            const errorMessage = 'Test print failed';
            setError(errorMessage);
            onPrintError?.(errorMessage);
        } finally {
            setIsTesting(false);
        }
    };

    // Print barcodes
    const handlePrint = async () => {
        if (barcodes.length === 0) return;

        setIsPrinting(true);
        setError(null);

        try {
            const response = await fetch('/api/zebra-printer/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: printerIP,
                    port: printerPort,
                    barcodes,
                    labelSize
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(`Successfully printed ${barcodes.length} barcode(s)!`);
                onPrintSuccess?.();
            } else {
                setError(result.message);
                onPrintError?.(result.message);
            }
        } catch (err) {
            const errorMessage = 'Print failed';
            setError(errorMessage);
            onPrintError?.(errorMessage);
        } finally {
            setIsPrinting(false);
        }
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

            {/* Connection Status Card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Printer className="h-4 w-4" />
                        Zebra Printer Connection
                        {isConnected ? (
                            <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline">
                                <XCircle className="h-3 w-3 mr-1" />
                                Disconnected
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Connection Settings */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Printer IP Address</Label>
                            <Input
                                value={printerIP}
                                onChange={(e) => setPrinterIP(e.target.value)}
                                placeholder="192.168.1.100"
                                className="h-8"
                                disabled={isConnected}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Port</Label>
                            <Input
                                type="number"
                                value={printerPort}
                                onChange={(e) => setPrinterPort(parseInt(e.target.value) || 9100)}
                                placeholder="9100"
                                className="h-8"
                                disabled={isConnected}
                            />
                        </div>
                    </div>

                    {/* Print Settings */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Label Size</Label>
                            <Select value={labelSize} onValueChange={(value: '2x1' | '4x2' | '4x6') => setLabelSize(value)}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2x1">2" × 1" (Standard)</SelectItem>
                                    <SelectItem value="4x2">4" × 2" (Large)</SelectItem>
                                    <SelectItem value="4x6">4" × 6" (Shipping)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs">Test Print Type</Label>
                            <Select value={testType} onValueChange={(value: 'basic' | 'barcode' | 'configuration') => setTestType(value)}>
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="basic">Basic Test</SelectItem>
                                    <SelectItem value="barcode">Barcode Test</SelectItem>
                                    <SelectItem value="configuration">Configuration</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Printer Discovery */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleDiscoverPrinters}
                            disabled={isDiscovering}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            {isDiscovering ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                                <Search className="h-3 w-3 mr-1" />
                            )}
                            {isDiscovering ? 'Scanning...' : 'Discover Printers'}
                        </Button>

                        {discoveredPrinters.length > 0 && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        View Found ({discoveredPrinters.length})
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Discovered Printers</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-2">
                                        {discoveredPrinters.map((printer, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 border rounded">
                                                <div>
                                                    <div className="font-medium">{printer.ip}:{printer.port}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {printer.model} • {printer.responseTime}ms
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setPrinterIP(printer.ip);
                                                        setPrinterPort(printer.port);
                                                    }}
                                                >
                                                    Select
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    <Separator />

                    {/* Connection Actions */}
                    <div className="flex gap-2">
                        {!isConnected ? (
                            <Button
                                onClick={handleConnect}
                                disabled={isConnecting}
                                size="sm"
                                className="flex-1"
                            >
                                {isConnecting ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                    <Wifi className="h-3 w-3 mr-1" />
                                )}
                                {isConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={handleDisconnect}
                                    variant="outline"
                                    size="sm"
                                >
                                    Disconnect
                                </Button>
                                <Button
                                    onClick={handleTestPrint}
                                    disabled={isTesting}
                                    variant="outline"
                                    size="sm"
                                >
                                    {isTesting ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <TestTube className="h-3 w-3 mr-1" />
                                    )}
                                    Test Print
                                </Button>
                                <Button
                                    onClick={getPrinterStatus}
                                    disabled={isGettingStatus}
                                    variant="outline"
                                    size="sm"
                                >
                                    {isGettingStatus ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    Status
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Printer Status Display */}
                    {printerStatus && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-xs font-medium mb-2">Printer Status</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Model: {printerStatus.model}</div>
                                <div>Status: {printerStatus.printerStatus}</div>
                                <div>Firmware: {printerStatus.firmware}</div>
                                <div>Media: {printerStatus.mediaType}</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Print Actions Card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4" />
                        Print Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Button
                            onClick={handlePrint}
                            disabled={!isConnected || isPrinting || barcodes.length === 0}
                            className="flex-1"
                        >
                            {isPrinting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Printer className="h-4 w-4 mr-2" />
                            )}
                            {isPrinting ? 'Printing...' : `Print ${barcodes.length} Barcode(s)`}
                        </Button>

                        {/* ZPL Preview Dialog */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={barcodes.length === 0}>
                                    Preview ZPL
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>ZPL Command Preview</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">
                                        ZPL commands that will be sent to the printer (Label Size: {labelSize}):
                                    </div>
                                    <pre className=" p-4 rounded text-xs overflow-auto max-h-96 font-mono">
                                        {generatePreviewZPL(barcodes, labelSize)}
                                    </pre>
                                    <div className="text-xs text-muted-foreground">
                                        Total barcodes: {barcodes.length} • Estimated print time: {Math.ceil(barcodes.length * 2)} seconds
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Barcode Summary */}
                    {barcodes.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs font-medium mb-2">Ready to Print</div>
                            <div className="text-xs text-blue-700">
                                {barcodes.length} barcode(s) • Label size: {labelSize} •
                                Total estimated labels: {barcodes.length}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Helper function to generate ZPL preview
function generatePreviewZPL(barcodes: BarcodeData[], labelSize: string): string {
    if (barcodes.length === 0) return '';

    let zplCommands = '';

    barcodes.slice(0, 3).forEach((barcode, index) => { // Show first 3 for preview
        const { code, productName, price, currency = 'LKR', status = '' } = barcode;

        let zpl = '';
        switch (labelSize) {
            case '2x1':
                zpl = `^XA
^CF0,18
^FO10,10^FD${productName.substring(0, 25)}^FS
^FO10,35^BY2,3,35^BC^FD${code}^FS
^FO10,75^CF0,12^FD${code}^FS
^FO10,90^CF0,10^FD${status}^FS
^FO140,90^CF0,12^FD${currency} ${price.toFixed(2)}^FS
^XZ`;
                break;
            case '4x2':
                zpl = `^XA
^CF0,25
^FO20,20^FD${productName.substring(0, 35)}^FS
^FO20,60^BY3,3,50^BC^FD${code}^FS
^FO20,130^CF0,18^FD${code}^FS
^FO20,155^CF0,15^FD${status}^FS
^FO250,155^CF0,18^FD${currency} ${price.toFixed(2)}^FS
^XZ`;
                break;
            case '4x6':
                zpl = `^XA
^CF0,30
^FO30,30^FD${productName.substring(0, 30)}^FS
^FO30,80^BY4,3,80^BC^FD${code}^FS
^FO30,180^CF0,25^FD${code}^FS
^FO30,220^CF0,20^FD${status}^FS
^FO250,220^CF0,25^FD${currency} ${price.toFixed(2)}^FS
^XZ`;
                break;
        }

        zplCommands += zpl;
        if (index < Math.min(barcodes.length - 1, 2)) {
            zplCommands += '\n\n';
        }
    });

    if (barcodes.length > 3) {
        zplCommands += `\n\n... and ${barcodes.length - 3} more barcode(s)`;
    }

    return zplCommands;
}

export default ZebraPrinterManager;