export interface Product {
  sku: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  quantity: number;
  providerName: string;
  providerSku: string;
  providerUrl: string;
  available: boolean;
}
