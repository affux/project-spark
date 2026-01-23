import { User, Product, StorefrontProduct, Order, DashboardStats } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@dropship.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    walletBalance: 0,
  },
  {
    id: '2',
    email: 'john@reseller.com',
    name: 'John Smith',
    role: 'user',
    storefrontSlug: 'johns-store',
    storefrontName: "John's Premium Store",
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    walletBalance: 1250.00,
  },
  {
    id: '3',
    email: 'sarah@reseller.com',
    name: 'Sarah Johnson',
    role: 'user',
    storefrontSlug: 'sarahs-boutique',
    storefrontName: "Sarah's Boutique",
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    walletBalance: 850.00,
  },
  {
    id: '4',
    email: 'mike@reseller.com',
    name: 'Mike Williams',
    role: 'user',
    storefrontSlug: 'mikes-deals',
    storefrontName: "Mike's Best Deals",
    isActive: false,
    createdAt: '2024-02-15T00:00:00Z',
    walletBalance: 0,
  },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
    basePrice: 89.99,
    stock: 150,
    sku: 'WH-001',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    category: 'Electronics',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Smart Fitness Watch',
    description: 'Track your health and fitness with this advanced smartwatch featuring heart rate monitoring.',
    basePrice: 149.99,
    stock: 75,
    sku: 'SW-002',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    category: 'Electronics',
    isActive: true,
    createdAt: '2024-01-05T00:00:00Z',
  },
  {
    id: '3',
    name: 'Leather Laptop Bag',
    description: 'Genuine leather laptop bag with multiple compartments and padded protection.',
    basePrice: 79.99,
    stock: 200,
    sku: 'LB-003',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    category: 'Accessories',
    isActive: true,
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: '4',
    name: 'Organic Coffee Blend',
    description: 'Premium organic coffee beans sourced from sustainable farms.',
    basePrice: 24.99,
    stock: 500,
    sku: 'CB-004',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
    category: 'Food & Beverage',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '5',
    name: 'Minimalist Desk Lamp',
    description: 'Modern LED desk lamp with adjustable brightness and color temperature.',
    basePrice: 45.99,
    stock: 120,
    sku: 'DL-005',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
    category: 'Home & Office',
    isActive: true,
    createdAt: '2024-01-20T00:00:00Z',
  },
  {
    id: '6',
    name: 'Yoga Mat Pro',
    description: 'Extra thick, non-slip yoga mat perfect for all types of exercises.',
    basePrice: 34.99,
    stock: 300,
    sku: 'YM-006',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    category: 'Sports & Fitness',
    isActive: true,
    createdAt: '2024-01-25T00:00:00Z',
  },
];

export const mockStorefrontProducts: StorefrontProduct[] = [
  {
    id: '1',
    productId: '1',
    userId: '2',
    sellingPrice: 129.99,
    isActive: true,
    product: mockProducts[0],
  },
  {
    id: '2',
    productId: '2',
    userId: '2',
    sellingPrice: 199.99,
    customDescription: 'Limited edition smartwatch with exclusive band colors!',
    isActive: true,
    product: mockProducts[1],
  },
  {
    id: '3',
    productId: '3',
    userId: '2',
    sellingPrice: 119.99,
    isActive: true,
    product: mockProducts[2],
  },
  {
    id: '4',
    productId: '4',
    userId: '3',
    sellingPrice: 39.99,
    isActive: true,
    product: mockProducts[3],
  },
  {
    id: '5',
    productId: '5',
    userId: '3',
    sellingPrice: 69.99,
    customDescription: 'Perfect for your home office setup!',
    isActive: true,
    product: mockProducts[4],
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    storefrontProductId: '1',
    userId: '2',
    customerName: 'Alice Brown',
    customerEmail: 'alice@customer.com',
    customerPhone: '+1 234 567 8901',
    customerAddress: '123 Main St, New York, NY 10001',
    quantity: 1,
    sellingPrice: 129.99,
    basePrice: 89.99,
    status: 'completed',
    createdAt: '2024-03-01T10:00:00Z',
    paidAt: '2024-03-01T12:00:00Z',
    completedAt: '2024-03-03T14:00:00Z',
    product: mockProducts[0],
    user: mockUsers[1],
  },
  {
    id: 'ORD-002',
    storefrontProductId: '2',
    userId: '2',
    customerName: 'Bob Wilson',
    customerEmail: 'bob@customer.com',
    customerPhone: '+1 234 567 8902',
    customerAddress: '456 Oak Ave, Los Angeles, CA 90001',
    quantity: 2,
    sellingPrice: 199.99,
    basePrice: 149.99,
    status: 'paid_by_user',
    createdAt: '2024-03-10T09:00:00Z',
    paidAt: '2024-03-10T11:00:00Z',
    product: mockProducts[1],
    user: mockUsers[1],
  },
  {
    id: 'ORD-003',
    storefrontProductId: '4',
    userId: '3',
    customerName: 'Carol Davis',
    customerEmail: 'carol@customer.com',
    customerPhone: '+1 234 567 8903',
    customerAddress: '789 Pine Rd, Chicago, IL 60601',
    quantity: 3,
    sellingPrice: 39.99,
    basePrice: 24.99,
    status: 'pending_payment',
    createdAt: '2024-03-15T14:00:00Z',
    product: mockProducts[3],
    user: mockUsers[2],
  },
  {
    id: 'ORD-004',
    storefrontProductId: '5',
    userId: '3',
    customerName: 'David Lee',
    customerEmail: 'david@customer.com',
    customerPhone: '+1 234 567 8904',
    customerAddress: '321 Elm St, Houston, TX 77001',
    quantity: 1,
    sellingPrice: 69.99,
    basePrice: 45.99,
    status: 'processing',
    createdAt: '2024-03-18T16:00:00Z',
    paidAt: '2024-03-18T18:00:00Z',
    product: mockProducts[4],
    user: mockUsers[2],
  },
  {
    id: 'ORD-005',
    storefrontProductId: '3',
    userId: '2',
    customerName: 'Eva Martinez',
    customerEmail: 'eva@customer.com',
    customerPhone: '+1 234 567 8905',
    customerAddress: '654 Maple Dr, Phoenix, AZ 85001',
    quantity: 1,
    sellingPrice: 119.99,
    basePrice: 79.99,
    status: 'pending_payment',
    createdAt: '2024-03-20T11:00:00Z',
    product: mockProducts[2],
    user: mockUsers[1],
  },
];

export const getAdminStats = (): DashboardStats => {
  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter(o => o.status === 'pending_payment').length;
  const completedOrders = mockOrders.filter(o => o.status === 'completed').length;
  const totalRevenue = mockOrders
    .filter(o => o.status === 'completed' || o.status === 'paid_by_user' || o.status === 'processing')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);
  const pendingPayments = mockOrders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);
  const paidAmount = totalRevenue;

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    pendingPayments,
    paidAmount,
  };
};

export const getUserStats = (userId: string): DashboardStats => {
  const userOrders = mockOrders.filter(o => o.userId === userId);
  const totalOrders = userOrders.length;
  const pendingOrders = userOrders.filter(o => o.status === 'pending_payment').length;
  const completedOrders = userOrders.filter(o => o.status === 'completed').length;
  const totalRevenue = userOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + ((o.sellingPrice - o.basePrice) * o.quantity), 0);
  const pendingPayments = userOrders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);
  const paidAmount = userOrders
    .filter(o => o.status !== 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    pendingPayments,
    paidAmount,
  };
};
