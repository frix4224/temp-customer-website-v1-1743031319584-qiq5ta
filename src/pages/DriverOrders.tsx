import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfToday, addDays, subDays, addMonths, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Calendar as CalendarIcon,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: boolean;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  shipping_address: string;
  status: string;
  estimated_delivery: string;
  created_at: string;
  last_status_update: string;
  type: 'pickup' | 'delivery';
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: AlertCircle,
  processing: Clock,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle
};

const DriverOrders = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Record<string, Order[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    setupRealtimeSubscriptions();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      // First get all active drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', true)
        .order('name');

      if (driversError) throw driversError;

      // Then fetch orders for each driver for the selected date
      const driverOrders: Record<string, Order[]> = {};
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();
      
      for (const driver of (driversData || [])) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('assigned_driver_id', driver.id)
          .eq('status', 'processing')
          .gte('estimated_delivery', dayStart)
          .lte('estimated_delivery', dayEnd)
          .order('estimated_delivery');

        if (orderError) throw orderError;
        driverOrders[driver.id] = orderData || [];
      }

      setDrivers(driversData || []);
      setOrders(driverOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load driver orders');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const ordersSubscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  };

  const formatDateTime = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const generateCalendarDays = () => {
    const days = [];
    const today = startOfToday();
    const maxDate = addMonths(today, 3); // Allow viewing up to 3 months ahead
    
    for (let i = 0; i < 42; i++) {
      const day = addDays(today, i);
      if (day <= maxDate) {
        days.push(day);
      }
    }
    
    return days;
  };

  const filteredDrivers = drivers.filter(driver => {
    if (!searchTerm) return true;
    
    const searchString = searchTerm.toLowerCase();
    const hasMatchingOrders = orders[driver.id]?.some(order =>
      order.order_number.toLowerCase().includes(searchString) ||
      order.customer_name.toLowerCase().includes(searchString) ||
      order.shipping_address.toLowerCase().includes(searchString)
    );
    
    return driver.name.toLowerCase().includes(searchString) ||
           driver.vehicle_number.toLowerCase().includes(searchString) ||
           hasMatchingOrders;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Driver Orders</h1>
          <div className="relative">
            <div 
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
            >
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <span className="font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </span>
            </div>

            {isCalendarOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 min-w-[300px]">
                <div className="grid grid-cols-7 gap-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 mb-1">
                      {day}
                    </div>
                  ))}
                  {generateCalendarDays().map((day) => (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        setSelectedDate(day);
                        setIsCalendarOpen(false);
                      }}
                      className={`
                        p-2 text-center rounded-lg transition-colors hover:bg-gray-50
                        ${format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : ''}
                      `}
                    >
                      <span className="text-sm">
                        {format(day, 'd')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousDay}
              className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers and orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-600">Loading driver orders...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">
            {searchTerm ? 'No drivers or orders found matching your search.' : 'No active drivers found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredDrivers.map((driver) => {
            const driverOrders = orders[driver.id] || [];
            
            return (
              <div key={driver.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-gray-500" />
                        {driver.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {driver.vehicle_type} - {driver.vehicle_number}
                      </p>
                    </div>
                  </div>

                  {driverOrders.length === 0 ? (
                    <p className="text-gray-500">No orders scheduled for {format(selectedDate, 'MMMM d, yyyy')}</p>
                  ) : (
                    <div className="space-y-4">
                      {driverOrders.map((order) => {
                        const StatusIcon = statusIcons[order.status];
                        return (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-500" />
                                <span className="font-medium text-gray-800">
                                  Order #{order.order_number}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {order.type}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  statusColors[order.status]
                                }`}>
                                  <StatusIcon className="w-4 h-4 mr-1" />
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-600">{order.customer_name}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {order.shipping_address}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Scheduled: {formatDateTime(order.estimated_delivery)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">Last Update</p>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(order.last_status_update)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriverOrders;