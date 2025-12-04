
export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Route {
  id: string;
  name: string;
  driverId: string;
}

export interface DeliveryItem {
  productId: string;
  quantity: number;
}

export interface DeliverySchedule {
  seg?: DeliveryItem[];
  ter?: DeliveryItem[];
  qua?: DeliveryItem[];
  qui?: DeliveryItem[];
  sex?: DeliveryItem[];
  sab?: DeliveryItem[];
  dom?: DeliveryItem[];
}

export interface PaymentTransaction {
  id: string;
  date: string;
  amount: number;
  method: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  nif?: string;
  driverId: string; // The driver who owns this client
  routeId?: string; // The specific zone/route
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'ACTIVE' | 'INACTIVE';
  
  // Payment & Logistics
  paymentMethod?: string; // Legacy/Fallback
  paymentFrequency: 'Diário' | 'Semanal' | 'Mensal' | 'Personalizado';
  paymentCustomDays?: number; // If frequency is Personalizado (e.g., 15 days)
  currentBalance: number; // This can be manually set or auto-calculated
  lastPaymentDate?: string; // Date of the last zero-out
  paymentHistory?: PaymentTransaction[];
  
  // Custom Pricing per Product (Key: ProductID, Value: Price)
  customPrices?: Record<string, number>; 

  leaveReceipt: boolean; // "Precisa deixar papel (Talão)?"
  acceptsReturns: boolean; // "Aceita Devolução de Sobras?"

  // Exceptions
  skippedDates?: string[]; // Array of 'YYYY-MM-DD' where delivery was skipped

  // Delivery Schedule
  deliverySchedule?: DeliverySchedule;

  notes?: string;
  deliveryObs?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number; // Current stock/production placeholder
  targetQuantity: number;
  unit: string;
  price: number;
  category: string;
  supportsEmpelo?: boolean; // Defines if product can be counted in Empelos (30 units)
}

export interface DailyProductionRecord {
  produced: number;
  delivered: number;
  sold: number;
  leftovers: number;
}

export interface ProductionData {
  [date: string]: {
    [productId: string]: DailyProductionRecord;
  }
}
