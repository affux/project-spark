// CSV Export utility functions

export const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle strings with commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatOrdersForExport = (orders: {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  product?: { name: string } | null;
  dropshipper?: { name: string } | null;
  quantity: number;
  selling_price: number;
  base_price: number;
  status: string;
  created_at: string;
}[]) => {
  return orders.map(order => ({
    'Order Number': order.order_number,
    'Customer': order.customer_name,
    'Email': order.customer_email,
    'Address': order.customer_address,
    'Product': order.product?.name || 'N/A',
    'Dropshipper': order.dropshipper?.name || 'N/A',
    'Quantity': order.quantity,
    'Selling Price': order.selling_price.toFixed(2),
    'Base Price': order.base_price.toFixed(2),
    'Profit': ((order.selling_price - order.base_price) * order.quantity).toFixed(2),
    'Status': order.status.replace(/_/g, ' '),
    'Date': new Date(order.created_at).toLocaleDateString(),
  }));
};

export const formatProductsForExport = (products: {
  name: string;
  sku: string;
  category: string | null;
  base_price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
}[]) => {
  return products.map(product => ({
    'Name': product.name,
    'SKU': product.sku,
    'Category': product.category || 'Uncategorized',
    'Base Price': product.base_price.toFixed(2),
    'Stock': product.stock,
    'Status': product.is_active ? 'Active' : 'Inactive',
    'Created': new Date(product.created_at).toLocaleDateString(),
  }));
};

export const formatTransactionsForExport = (transactions: {
  user_name?: string;
  user_email?: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}[]) => {
  return transactions.map(tx => ({
    'Date': new Date(tx.created_at).toLocaleString(),
    'Dropshipper': tx.user_name || 'Unknown',
    'Email': tx.user_email || 'N/A',
    'Type': tx.type.replace(/_/g, ' '),
    'Amount': tx.amount.toFixed(2),
    'Description': tx.description || '-',
  }));
};

export const formatDropshippersForExport = (dropshippers: {
  name: string;
  email: string;
  storefront_name: string | null;
  storefront_slug: string | null;
  wallet_balance: number;
  is_active: boolean;
  created_at: string;
}[]) => {
  return dropshippers.map(dropshipper => ({
    'Name': dropshipper.name,
    'Email': dropshipper.email,
    'Storefront': dropshipper.storefront_name || 'N/A',
    'Slug': dropshipper.storefront_slug || 'N/A',
    'Wallet Balance': dropshipper.wallet_balance.toFixed(2),
    'Status': dropshipper.is_active ? 'Active' : 'Inactive',
    'Joined': new Date(dropshipper.created_at).toLocaleDateString(),
  }));
};
