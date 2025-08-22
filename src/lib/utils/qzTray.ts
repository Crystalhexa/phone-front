
interface QZTrayConfig {
  host?: string;
  port?: number;
  secure?: boolean;
}

interface PrintJob {
  printer: string;
  data: string[];
  options?: {
    encoding?: string;
    margins?: number;
  };
}

class QZTrayService {
  private qz: any = null;
  private config: QZTrayConfig;
  private isConnected: boolean = false;

  constructor(config: QZTrayConfig = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 8181,
      secure: config.secure || false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('QZ Tray can only be initialized on the client side');
    }

    // Load QZ Tray library dynamically
    if (!window.qz) {
      await this.loadQZScript();
    }

    this.qz = window.qz;
    
    // Set up connection configuration
    this.qz.websocket.configure({
      uris: [`${this.config.secure ? 'wss' : 'ws'}://${this.config.host}:${this.config.port}`],
      retries: 5,
      delay: 1000
    });

    // Set up security (for signed certificates)
    await this.setupSecurity();
  }

  private async loadQZScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QZ Tray script'));
      document.head.appendChild(script);
    });
  }

  private async setupSecurity(): Promise<void> {
    // For development - you should replace with your actual certificate
    this.qz.security.setCertificatePromise((resolve: any) => {
      // For production, load your certificate here
      // For demo purposes, using the default certificate
      resolve();
    });

    // Set up private key promise
    this.qz.security.setSignatureAlgorithm("SHA1"); // Since 2.1
    this.qz.security.setSignaturePromise((toSign: string) => {
      // For production, sign with your private key
      // For demo purposes, returning unsigned
      return Promise.resolve(toSign);
    });
  }

  async connect(): Promise<void> {
    if (!this.qz) {
      await this.initialize();
    }

    try {
      await this.qz.websocket.connect();
      this.isConnected = true;
      console.log('Connected to QZ Tray');
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      throw new Error('Could not connect to QZ Tray. Make sure it\'s running.');
    }
  }

  async disconnect(): Promise<void> {
    if (this.qz && this.isConnected) {
      await this.qz.websocket.disconnect();
      this.isConnected = false;
      console.log('Disconnected from QZ Tray');
    }
  }

  async getPrinters(): Promise<string[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const printers = await this.qz.printers.find();
      return printers;
    } catch (error) {
      console.error('Failed to get printers:', error);
      throw error;
    }
  }

  async getDefaultPrinter(): Promise<string> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const printer = await this.qz.printers.getDefault();
      return printer;
    } catch (error) {
      console.error('Failed to get default printer:', error);
      throw error;
    }
  }

  async printReceipt(job: PrintJob): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const config = this.qz.configs.create(job.printer, {
        encoding: job.options?.encoding || 'UTF-8',
        margins: job.options?.margins || 0
      });

      await this.qz.print(config, job.data);
      console.log('Print job sent successfully');
    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  }

  isQZConnected(): boolean {
    return this.isConnected && this.qz?.websocket?.isActive();
  }
}

// ESC/POS Command Builder
export class ESCPOSBuilder {
  private commands: string[] = [];

  // Initialize printer
  init(): ESCPOSBuilder {
    this.commands.push('\x1B\x40'); // ESC @
    return this;
  }

  // Text formatting
  text(content: string): ESCPOSBuilder {
    this.commands.push(content);
    return this;
  }

  line(content: string = ''): ESCPOSBuilder {
    this.commands.push(content + '\n');
    return this;
  }

  bold(enable: boolean = true): ESCPOSBuilder {
    this.commands.push(enable ? '\x1B\x45\x01' : '\x1B\x45\x00'); // ESC E
    return this;
  }

  underline(enable: boolean = true): ESCPOSBuilder {
    this.commands.push(enable ? '\x1B\x2D\x01' : '\x1B\x2D\x00'); // ESC -
    return this;
  }

  fontSize(size: 'normal' | 'double' | 'large'): ESCPOSBuilder {
    switch (size) {
      case 'normal':
        this.commands.push('\x1D\x21\x00'); // GS !
        break;
      case 'double':
        this.commands.push('\x1D\x21\x11'); // GS ! - double height and width
        break;
      case 'large':
        this.commands.push('\x1D\x21\x22'); // GS ! - large
        break;
    }
    return this;
  }

  // Alignment
  align(alignment: 'left' | 'center' | 'right'): ESCPOSBuilder {
    switch (alignment) {
      case 'left':
        this.commands.push('\x1B\x61\x00'); // ESC a
        break;
      case 'center':
        this.commands.push('\x1B\x61\x01');
        break;
      case 'right':
        this.commands.push('\x1B\x61\x02');
        break;
    }
    return this;
  }

  // Spacing
  lineSpacing(dots: number): ESCPOSBuilder {
    this.commands.push('\x1B\x33' + String.fromCharCode(dots)); // ESC 3
    return this;
  }

  feed(lines: number = 1): ESCPOSBuilder {
    for (let i = 0; i < lines; i++) {
      this.commands.push('\n');
    }
    return this;
  }

  // Separator line
  separator(char: string = '-', length: number = 32): ESCPOSBuilder {
    this.commands.push(char.repeat(length) + '\n');
    return this;
  }

  // QR Code
  qrCode(data: string, size: number = 6): ESCPOSBuilder {
    // QR Code commands for ESC/POS
    this.commands.push('\x1D\x28\x6B\x04\x00\x31\x41\x32\x00'); // QR Code model
    this.commands.push('\x1D\x28\x6B\x03\x00\x31\x43' + String.fromCharCode(size)); // Size
    this.commands.push('\x1D\x28\x6B\x03\x00\x31\x45\x30'); // Error correction
    
    const dataLength = data.length + 3;
    const pl = dataLength % 256;
    const ph = Math.floor(dataLength / 256);
    
    this.commands.push('\x1D\x28\x6B' + String.fromCharCode(pl, ph) + '\x31\x50\x30' + data);
    this.commands.push('\x1D\x28\x6B\x03\x00\x31\x51\x30'); // Print QR
    return this;
  }

  // Cut paper
  cut(partial: boolean = false): ESCPOSBuilder {
    this.commands.push(partial ? '\x1B\x69' : '\x1D\x56\x00'); // Partial or full cut
    return this;
  }

  // Cash drawer
  openDrawer(): ESCPOSBuilder {
    this.commands.push('\x1B\x70\x00\x19\xFA'); // ESC p
    return this;
  }

  // Build final command string
  build(): string[] {
    return [this.commands.join('')];
  }

  // Clear commands
  clear(): ESCPOSBuilder {
    this.commands = [];
    return this;
  }
}

// Export singleton instance
export const qzTray = new QZTrayService();
export { QZTrayService };

// Type declarations for global qz object
declare global {
  interface Window {
    qz: any;
  }
}

// Example usage functions
export const createReceiptCommands = (receiptData: {
  storeName: string;
  address: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  paymentMethod: string;
  receiptNumber: string;
}): string[] => {
  const builder = new ESCPOSBuilder();
  
  return builder
    .init()
    .align('center')
    .fontSize('large')
    .bold(true)
    .line(receiptData.storeName)
    .bold(false)
    .fontSize('normal')
    .line(receiptData.address)
    .feed(1)
    .separator('=')
    .align('left')
    .line(`Receipt #: ${receiptData.receiptNumber}`)
    .line(`Date: ${new Date().toLocaleString()}`)
    .separator('-')
    .bold(true)
    .line('ITEMS:')
    .bold(false)
    .build()
    .concat(
      receiptData.items.flatMap(item => 
        new ESCPOSBuilder()
          .line(`${item.name}`)
          .line(`  ${item.qty} x $${item.price.toFixed(2)} = $${(item.qty * item.price).toFixed(2)}`)
          .build()
      )
    )
    .concat(
      new ESCPOSBuilder()
        .separator('-')
        .bold(true)
        .fontSize('double')
        .align('right')
        .line(`TOTAL: $${receiptData.total.toFixed(2)}`)
        .fontSize('normal')
        .bold(false)
        .align('left')
        .line(`Payment: ${receiptData.paymentMethod}`)
        .feed(2)
        .align('center')
        .line('Thank you for your business!')
        .feed(3)
        .cut()
        .build()
    );
};