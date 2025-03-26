import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Package,
  CreditCard,
  Truck,
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  QrCode,
  X
} from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string | null;
  shipping_address: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'credit_card' | 'ideal' | 'bancontact' | 'cash' | null;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  transaction_id: string | null;
  shipping_method: string;
  estimated_delivery: string;
  special_instructions: string | null;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
  qr_code: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  pending: AlertCircle,
  processing: Clock,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [messageModal, setMessageModal] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null
  });
  const [qrModal, setQrModal] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrders();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      fetchAllOrderItems();
    }
  }, [orders]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllOrderItems = async () => {
    try {
      const orderIds = orders.map(order => order.id);
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (error) throw error;

      const itemsByOrder = data.reduce((acc: Record<string, OrderItem[]>, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      setOrderItems(itemsByOrder);
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast.error('Failed to load order items');
    }
  };

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !messageModal.orderId) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Here you would typically send the message to the customer
      toast.success('Message sent to customer');
      setMessageModal({ open: false, orderId: null });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleShowQrCode = (order: Order) => {
    setQrModal({ open: true, order });
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const filteredOrders = orders.filter(order => {
    const searchString = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(searchString) ||
      order.customer_name.toLowerCase().includes(searchString) ||
      order.email.toLowerCase().includes(searchString) ||
      (order.phone?.toLowerCase() || '').includes(searchString)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPaymentMethod = (method: string | null): string => {
    if (!method) return 'Not specified';
    return method.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">
            {searchTerm ? 'No orders found matching your search.' : 'No orders found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredOrders.map((order) => {
            const StatusIcon = statusIcons[order.status];
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleOrder(order.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Order #{order.order_number}
                        </h3>
                        <button
                          onClick={() => handleShowQrCode(order)}
                          className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                          title="Show QR Code"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[order.status]
                          }`}
                        >
                          <StatusIcon className="w-4 h-4 mr-1" />
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            paymentStatusColors[order.payment_status]
                          }`}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Customer</p>
                          <p className="text-sm text-gray-800">{order.customer_name}</p>
                          <p className="text-sm text-gray-600">{order.email}</p>
                          {order.phone && (
                            <p className="text-sm text-gray-600">{order.phone}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Payment</p>
                          <p className="text-sm text-gray-800">
                            {formatPaymentMethod(order.payment_method)}
                          </p>
                          {order.transaction_id && (
                            <p className="text-sm text-gray-600">
                              Trans ID: {order.transaction_id}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Shipping</p>
                          <p className="text-sm text-gray-800">{order.shipping_method}</p>
                          <p className="text-sm text-gray-600">
                            Est. Delivery: {formatDate(order.estimated_delivery)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Total</p>
                          <p className="text-lg font-semibold text-primary">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMessageModal({ open: true, orderId: order.id })}
                        className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as Order['status'])}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Product
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Quantity
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Unit Price
                                  </th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {orderItems[order.id]?.map((item) => (
                                  <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                      {item.product_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                      {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                      {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                                      {formatCurrency(item.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50">
                                <tr>
                                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                                    Subtotal
                                  </td>
                                  <td className="px-6 py-3 text-right text-sm text-gray-800">
                                    {formatCurrency(order.subtotal)}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                                    Tax
                                  </td>
                                  <td className="px-6 py-3 text-right text-sm text-gray-800">
                                    {formatCurrency(order.tax)}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                                    Shipping
                                  </td>
                                  <td className="px-6 py-3 text-right text-sm text-gray-800">
                                    {formatCurrency(order.shipping_fee)}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-800">
                                    Total
                                  </td>
                                  <td className="px-6 py-3 text-right text-sm font-semibold text-primary">
                                    {formatCurrency(order.total_amount)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h4>
                            <p className="text-sm text-gray-600 whitespace-pre-line">
                              {order.shipping_address}
                            </p>
                          </div>
                          {order.special_instructions && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Special Instructions
                              </h4>
                              <p className="text-sm text-gray-600">
                                {order.special_instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message Modal */}
      <Dialog
        open={messageModal.open}
        onClose={() => setMessageModal({ open: false, orderId: null })}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                Send Message to Customer
              </Dialog.Title>
              <button
                onClick={() => setMessageModal({ open: false, orderId: null })}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => setMessageModal({ open: false, orderId: null })}
                  className="px-4 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog
        open={qrModal.open}
        onClose={() => setQrModal({ open: false, order: null })}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <button
              onClick={() => setQrModal({ open: false, order: null })}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center">
              <Dialog.Title className="text-lg font-semibold text-gray-800 mb-4">
                Order #{qrModal.order?.order_number}
              </Dialog.Title>
              
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <QRCodeSVG
                    value={qrModal.order?.qr_code || JSON.stringify({
                      order_number: qrModal.order?.order_number,
                      customer_name: qrModal.order?.customer_name,
                      total_amount: qrModal.order?.total_amount
                    })}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Scan this QR code to view order details
              </p>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default Orders;