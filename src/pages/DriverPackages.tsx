import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfToday, addDays, subDays, addMonths } from 'date-fns';
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CreditCard,
  UserPlus
} from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: boolean;
}

interface DriverPackage {
  id: string;
  driver_id: string | null;
  facility_id: string;
  package_date: string;
  start_time: string;
  end_time: string;
  total_orders: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  route_overview: any;
  created_at: string;
  driver?: Driver;
  facility: {
    facility_name: string;
    facility_code: number;
  };
}

interface PackageOrder {
  id: string;
  order_number: string;
  customer_name: string;
  shipping_address: string;
  estimated_delivery: string;
  sequence_number: number;
  status: 'pending' | 'picked_up' | 'delivered' | 'failed';
  type: 'pickup' | 'delivery';
  payment_method: string;
  payment_status: string;
  total_amount: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  picked_up: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: AlertCircle,
  assigned: Clock,
  in_progress: Truck,
  completed: CheckCircle,
  cancelled: XCircle,
  picked_up: Package,
  delivered: CheckCircle,
  failed: XCircle
};

const DriverPackages = () => {
  const [packages, setPackages] = useState<DriverPackage[]>([]);
  const [orders, setOrders] = useState<Record<string, PackageOrder[]>>({});
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    fetchData();
    fetchAvailableDrivers();
    setupRealtimeSubscriptions();
  }, [selectedDate]);

  const fetchAvailableDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', true)
        .order('name');

      if (error) throw error;
      setAvailableDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to load available drivers');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch driver packages for the selected date
      const { data: packagesData, error: packagesError } = await supabase
        .from('driver_packages')
        .select(`
          *,
          drivers (
            id,
            name,
            vehicle_type,
            vehicle_number,
            status
          ),
          facilities (
            facility_name,
            facility_code
          )
        `)
        .eq('package_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      const processedPackages = packagesData?.map(pkg => ({
        ...pkg,
        driver: pkg.drivers,
        facility: pkg.facilities
      })) || [];

      setPackages(processedPackages);

      // Fetch orders for each package
      const packageOrders: Record<string, PackageOrder[]> = {};
      
      for (const pkg of processedPackages) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('package_orders')
          .select(`
            id,
            sequence_number,
            status,
            orders (
              order_number,
              customer_name,
              shipping_address,
              estimated_delivery,
              type,
              payment_method,
              payment_status,
              total_amount
            )
          `)
          .eq('package_id', pkg.id)
          .order('sequence_number');

        if (ordersError) throw ordersError;

        packageOrders[pkg.id] = ordersData?.map(order => ({
          id: order.id,
          sequence_number: order.sequence_number,
          status: order.status,
          ...order.orders
        })) || [];
      }

      setOrders(packageOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load driver packages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDriver = async (packageId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('driver_packages')
        .update({
          driver_id: driverId,
          status: 'assigned'
        })
        .eq('id', packageId);

      if (error) throw error;

      // Update orders with the assigned driver
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ assigned_driver_id: driverId })
        .in('id', (orders[packageId] || []).map(order => order.id));

      if (ordersError) throw ordersError;

      toast.success('Driver assigned successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error('Failed to assign driver');
    }
  };

  const setupRealtimeSubscriptions = () => {
    const packagesSubscription = supabase
      .channel('driver_packages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_packages'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const ordersSubscription = supabase
      .channel('package_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_orders'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      packagesSubscription.unsubscribe();
      ordersSubscription.unsubscribe();
    };
  };

  const togglePackage = (packageId: string) => {
    setExpandedPackages(prev => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  const formatTime = (timeString: string): string => {
    return format(new Date(`2000-01-01T${timeString}`), 'HH:mm');
  };

  const formatDateTime = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Driver Packages</h1>
        <div className="text-gray-600">Loading driver packages...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Driver Packages</h1>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousDay}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <span className="font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </span>
            </button>

            {isCalendarOpen && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 min-w-[280px]">
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
                      className={`p-2 text-center rounded-lg hover:bg-gray-50 transition-colors ${
                        format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'hover:bg-gray-50'
                      }`}
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

          <button
            onClick={handleNextDay}
            className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <p className="text-gray-600">No packages scheduled for {format(selectedDate, 'MMMM d, yyyy')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {packages.map(pkg => {
            const packageOrders = orders[pkg.id] || [];
            const isExpanded = expandedPackages.has(pkg.id);
            const StatusIcon = statusIcons[pkg.status];
            
            return (
              <div key={pkg.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePackage(pkg.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-gray-500" />
                            <h3 className="text-lg font-semibold text-gray-800">
                              {pkg.facility.facility_name} (#{pkg.facility.facility_code})
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[pkg.status]
                            }`}>
                              <StatusIcon className="w-4 h-4 mr-1" />
                              {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {formatTime(pkg.start_time)} - {formatTime(pkg.end_time)}
                            </p>
                            {pkg.driver ? (
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                {pkg.driver.name} ({pkg.driver.vehicle_type} - {pkg.driver.vehicle_number})
                              </p>
                            ) : (
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-gray-400" />
                                <select
                                  onChange={(e) => handleAssignDriver(pkg.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary py-1 pl-2 pr-8"
                                  value=""
                                >
                                  <option value="" disabled>Assign Driver</option>
                                  {availableDrivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                      {driver.name} ({driver.vehicle_type})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">Total Orders</p>
                      <p className="text-2xl font-semibold text-primary">{packageOrders.length}</p>
                    </div>
                  </div>

                  {isExpanded && packageOrders.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {packageOrders.map((order) => {
                        const OrderStatusIcon = statusIcons[order.status];
                        return (
                          <div
                            key={order.id}
                            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">
                                  #{order.sequence_number}. Order {order.order_number}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  statusColors[order.status]
                                }`}>
                                  <OrderStatusIcon className="w-3 h-3 mr-1" />
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  {order.type}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                                  <div className="flex items-start gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 mt-1" />
                                    <span>{order.shipping_address}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      Scheduled: {formatDateTime(order.estimated_delivery)}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 text-right">
                                  <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                                    <CreditCard className="w-4 h-4" />
                                    <span>{order.payment_method}</span>
                                  </div>
                                  <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
                                    <DollarSign className="w-4 h-4" />
                                    <span>{formatCurrency(order.total_amount)}</span>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                    order.payment_status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {order.payment_status}
                                  </span>
                                </div>
                              </div>
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

export default DriverPackages;