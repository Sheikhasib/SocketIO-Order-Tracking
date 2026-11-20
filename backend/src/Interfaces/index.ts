export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderInput {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items?: OrderItem[];
  specialNotes?: string;
  paymentMethod?: string;
}

export interface Totals {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  totalAmount: number;
}
