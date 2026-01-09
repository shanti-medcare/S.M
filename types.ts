
export interface Medicine {
  id: string;
  name: string;
  category: string;
  price?: number;
  description: string;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

export interface User {
  phone: string;
  password: string;
  createdAt: number;
}

export interface Order {
  id: string;
  timestamp: number;
  type: 'prescription' | 'cart';
  items?: CartItem[];
  imageUrl?: string;
  deliveryAddress: string;
  location?: {
    lat: number;
    lng: number;
  };
  distance: string;
  deliveryCharge: number;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
}

export enum Page {
  HOME = 'home',
  SEARCH = 'search',
  UPLOAD = 'upload',
  CART = 'cart',
  CALL = 'call',
  ADMIN = 'admin',
  HISTORY = 'history'
}

export const MIN_ORDER_AMOUNT = 250;
