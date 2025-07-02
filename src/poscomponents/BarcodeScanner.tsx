"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

// Types for barcode scanning
interface BarcodeResult {
  code: string;
  format: string;
  timestamp: Date;
}

interface BarcodeScannerOptions {
  continuous?: boolean;
  formats?: string[];
  onScan?: (result: BarcodeResult) => void;
  onError?: (error: string) => void;
}

// Custom hook for barcode scanning
export const useBarcodeScanner = (options: BarcodeScannerOptions = {}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startScanning = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);

      // For camera-based scanning using QuaggaJS
      if (videoRef.current) {
        const Quagga = await import('quagga');
        
        await new Promise((resolve, reject) => {
          Quagga.default.init({
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: videoRef.current,
              constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
              }
            },
            decoder: {
              readers: options.formats || [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader"
              ]
            },
            locate: true,
            locator: {
              halfSample: true,
              patchSize: "medium"
            }
          }, (err: any) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(void 0);
          });
        });

        Quagga.default.start();
        
        Quagga.default.onDetected((data: any) => {
          const result: BarcodeResult = {
            code: data.codeResult.code,
            format: data.codeResult.format,
            timestamp: new Date()
          };
          
          setLastScan(result);
          options.onScan?.(result);
          
          if (!options.continuous) {
            stopScanning();
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scanner';
      setError(errorMessage);
      options.onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [options]);

  const stopScanning = useCallback(async () => {
    try {
      const Quagga = await import('quagga');
      Quagga.default.stop();
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isScanning, stopScanning]);

  return {
    isScanning,
    startScanning,
    stopScanning,
    lastScan,
    error,
    videoRef
  };
};

// 3. Barcode Scanner Component
interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  onClose,
  isOpen
}) => {
  const [manualInput, setManualInput] = useState('');
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | 'usb'>('camera');
  
  const { isScanning, startScanning, stopScanning, lastScan, error, videoRef } = useBarcodeScanner({
    continuous: false,
    onScan: (result) => {
      onScan(result.code);
      onClose();
    },
    onError: (err) => {
      console.error('Barcode scan error:', err);
    }
  });

  // USB Scanner Integration (keyboard input simulation)
  useEffect(() => {
    if (!isOpen || scanMode !== 'usb') return;

    let barcodeBuffer = '';
    let lastInputTime = 0;
    const BARCODE_TIMEOUT = 100; // milliseconds

    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // Reset buffer if too much time has passed (indicates manual typing)
      if (currentTime - lastInputTime > BARCODE_TIMEOUT) {
        barcodeBuffer = '';
      }
      
      lastInputTime = currentTime;

      if (event.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          onScan(barcodeBuffer);
          barcodeBuffer = '';
          onClose();
          event.preventDefault();
        }
      } else if (event.key.length === 1) {
        // Only capture single character keys (digits, letters)
        barcodeBuffer += event.key;
        event.preventDefault();
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [isOpen, scanMode, onScan, onClose]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Scan Mode Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setScanMode('camera')}
            className={`px-3 py-1 rounded text-sm ${
              scanMode === 'camera' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Camera
          </button>
          <button
            onClick={() => setScanMode('usb')}
            className={`px-3 py-1 rounded text-sm ${
              scanMode === 'usb' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            USB Scanner
          </button>
          <button
            onClick={() => setScanMode('manual')}
            className={`px-3 py-1 rounded text-sm ${
              scanMode === 'manual' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Manual
          </button>
        </div>

        {/* Camera Scanner */}
        {scanMode === 'camera' && (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded"
                autoPlay
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
                  <button
                    onClick={startScanning}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            {isScanning && (
              <div className="flex justify-center">
                <button
                  onClick={stopScanning}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Stop Scanning
                </button>
              </div>
            )}
          </div>
        )}

        {/* USB Scanner */}
        {scanMode === 'usb' && (
          <div className="text-center space-y-4">
            <div className="text-gray-600">
              <div className="text-4xl mb-2">📟</div>
              <p>USB scanner ready</p>
              <p className="text-sm">Scan any barcode with your USB scanner</p>
            </div>
          </div>
        )}

        {/* Manual Input */}
        {scanMode === 'manual' && (
          <div className="space-y-4">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter barcode manually"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Add to Cart
            </button>
          </div>
        )}

        {lastScan && (
          <div className="mt-4 p-2 bg-green-100 rounded text-sm">
            Last scan: {lastScan.code} ({lastScan.format})
          </div>
        )}
      </div>
    </div>
  );
};
