import { useEffect, useRef, useCallback, useState } from 'react';
import axios from 'axios';

interface POSBarcodeScannerProps {
  onProductScanned: (product: any) => void;
  onError?: (error: Error) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  timeout?: number;
  minBarcodeLength?: number;
  maxBarcodeLength?: number;
  debounceMs?: number;
  retryAttempts?: number;
  retryDelay?: number;
  barcodeFormats?: BarcodeFormat[];
}

interface BarcodeFormat {
  name: string;
  pattern: RegExp;
  length?: { min: number; max: number };
}

interface ProductResponse {
  data: any;
  status: number;
}

// Pre-defined barcode formats
const BARCODE_FORMATS: Record<string, BarcodeFormat> = {
  UPC_A: {
    name: 'UPC-A',
    pattern: /^\d{12}$/,
    length: { min: 12, max: 12 }
  },
  UPC_E: {
    name: 'UPC-E',
    pattern: /^\d{8}$/,
    length: { min: 8, max: 8 }
  },
  EAN_13: {
    name: 'EAN-13',
    pattern: /^\d{13}$/,
    length: { min: 13, max: 13 }
  },
  EAN_8: {
    name: 'EAN-8',
    pattern: /^\d{8}$/,
    length: { min: 8, max: 8 }
  },
  CODE_128: {
    name: 'CODE-128',
    pattern: /^[A-Za-z0-9\-_.+%/$]*$/,
    length: { min: 1, max: 80 }
  },
  CODE_39: {
    name: 'CODE-39',
    pattern: /^[A-Z0-9\-. $/+%]*$/,
    length: { min: 1, max: 43 }
  }
};

// Create axios instance with optimizations
const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const retryRequest = async (
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && axios.isAxiosError(error)) {
      const isRetryable = 
        error.code === 'ECONNABORTED' ||
        error.code === 'ENOTFOUND' ||
        (error.response?.status && error.response.status >= 500);

      if (isRetryable) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryRequest(fn, retries - 1, delay * 2);
      }
    }
    throw error;
  }
};

// Web Worker for heavy barcode processing
const createBarcodeWorker = () => {
  const workerCode = `
    const BARCODE_FORMATS = ${JSON.stringify(BARCODE_FORMATS)};
    
    self.onmessage = function(e) {
      const { barcode, formats } = e.data;
      
      const result = {
        isValid: false,
        format: null,
        normalized: barcode.trim().toUpperCase()
      };
      
      for (const format of formats) {
        const barcodeFormat = BARCODE_FORMATS[format.name] || format;
        
        if (barcodeFormat.pattern.test(result.normalized)) {
          if (barcodeFormat.length) {
            const len = result.normalized.length;
            if (len >= barcodeFormat.length.min && len <= barcodeFormat.length.max) {
              result.isValid = true;
              result.format = barcodeFormat.name;
              break;
            }
          } else {
            result.isValid = true;
            result.format = barcodeFormat.name;
            break;
          }
        }
      }
      
      self.postMessage(result);
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Custom hook for barcode validation
const useBarcodeValidation = (formats: BarcodeFormat[]) => {
  const workerRef = useRef<Worker | null>(null);
  
  useEffect(() => {
    workerRef.current = createBarcodeWorker();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  const validateBarcode = useCallback((barcode: string): Promise<{
    isValid: boolean;
    format: string | null;
    normalized: string;
  }> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        // Fallback to main thread if worker not available
        const normalized = barcode.trim().toUpperCase();
        for (const format of formats) {
          if (format.pattern.test(normalized)) {
            if (format.length) {
              const len = normalized.length;
              if (len >= format.length.min && len <= format.length.max) {
                resolve({ isValid: true, format: format.name, normalized });
                return;
              }
            } else {
              resolve({ isValid: true, format: format.name, normalized });
              return;
            }
          }
        }
        resolve({ isValid: false, format: null, normalized });
        return;
      }
      
      const handleMessage = (e: MessageEvent) => {
        workerRef.current?.removeEventListener('message', handleMessage);
        resolve(e.data);
      };
      
      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ barcode, formats });
    });
  }, [formats]);
  
  return validateBarcode;
};

export default function POSBarcodeScanner({
  onProductScanned,
  onError,
  onLoadingChange,
  timeout = 300,
  minBarcodeLength = 8,
  maxBarcodeLength = 20,
  debounceMs = 100,
  retryAttempts = 3,
  retryDelay = 1000,
  barcodeFormats = [
    BARCODE_FORMATS.UPC_A,
    BARCODE_FORMATS.UPC_E,
    BARCODE_FORMATS.EAN_13,
    BARCODE_FORMATS.EAN_8,
    BARCODE_FORMATS.CODE_128
  ]
}: POSBarcodeScannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const validateBarcode = useBarcodeValidation(barcodeFormats);

  const barcodeBuffer = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessing = useRef(false);
  const lastProcessedBarcode = useRef('');

  // Communicate loading state to parent
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const processBarcode = useCallback(async (barcode: string) => {
    if (isProcessing.current || barcode === lastProcessedBarcode.current) return;

    if (barcode.length < minBarcodeLength || barcode.length > maxBarcodeLength) return;

    isProcessing.current = true;
    lastProcessedBarcode.current = barcode;
    setIsLoading(true);

    try {
      const validation = await validateBarcode(barcode);
      if (!validation.isValid) {
        throw new Error(`Invalid barcode: ${barcode}`);
      }

      const response = await retryRequest(
        () => apiClient.get<ProductResponse>(`/api/products/${validation.normalized}`),
        retryAttempts,
        retryDelay
      );

      onProductScanned(response.data?.data);
    } catch (error) {
      console.error('Barcode processing failed:', error);
      onError?.(error as Error);
      onProductScanned(null);
    } finally {
      setIsLoading(false);
      isProcessing.current = false;
      setTimeout(() => (lastProcessedBarcode.current = ''), 1000);
    }
  }, [minBarcodeLength, maxBarcodeLength, onProductScanned, onError, retryAttempts, retryDelay, validateBarcode]);

  // Keyboard input logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.altKey || e.metaKey || (e.key.length > 1 && e.key !== 'Enter')) return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = barcodeBuffer.current.trim();
        if (scanned && !isProcessing.current) {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => processBarcode(scanned), debounceMs);
        }
        barcodeBuffer.current = '';
        return;
      }

      if (/^[a-zA-Z0-9\-_.+%/$]$/.test(e.key)) {
        barcodeBuffer.current += e.key;
        if (barcodeBuffer.current.length > maxBarcodeLength) {
          barcodeBuffer.current = barcodeBuffer.current.slice(-maxBarcodeLength);
        }
      }

      timeoutRef.current = setTimeout(() => {
        barcodeBuffer.current = '';
      }, timeout);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [processBarcode, timeout, maxBarcodeLength, debounceMs]);

  return null;
}

export { BARCODE_FORMATS, retryRequest };
export type { BarcodeFormat, POSBarcodeScannerProps };
