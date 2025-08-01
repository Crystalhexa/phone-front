import LabelPrinter from "@/components/barcode/LabelPrinter";

export default function Page() {

  const newProduct = {
    shopName: 'KRE',
    productName: 'Apple i phone',
    price: '15000.00',
    barcodeValue: 'ITEM-20250730-7',
  };

  const quantityAdded = 5;
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Inventory Added</h1>
      <LabelPrinter labelData={newProduct} quantity={quantityAdded} />
    </div>
    
  );
};
