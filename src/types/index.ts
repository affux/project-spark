export type UserRole = 'admin' | 'user';

export type OrderStatus = 'pending_payment' | 'paid_by_user' | 'processing' | 'completed' | 'cancelled' | 'postpaid_pending';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storefrontSlug?: string;
  storefrontName?: string;
  isActive: boolean;
  createdAt: string;
  walletBalance: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  stock: number;
  sku: string;
  image: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface StorefrontProduct {
  id: string;
  productId: string;
  userId: string;
  sellingPrice: number;
  customDescription?: string;
  isActive: boolean;
  product: Product;
}

export interface Order {
  id: string;
  storefrontProductId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  quantity: number;
  sellingPrice: number;
  basePrice: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  product: Product;
  user: User;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  paidAmount: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
