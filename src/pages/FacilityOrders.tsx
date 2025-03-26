import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { Package, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Building2, Truck, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Driver {
  id: string;
  name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: boolean;
}

interface Facility {
  id: string;
  facility_name: string;
  facility_code: number;
  address_line_1: string;
  city: string;
  zipcode: string;
  opening_hour: string;
  close_hour: string;
  status: boolean;
  drivers?: Driver[];
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
  assigned_driver?: Driver;
}

const FacilityOrders = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [orders, setOrders] = useState<Record<string, Order[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    fetchData();
    setupRealtimeSubscriptions();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      // Fetch facilities with their assigned drivers
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select(`
          *,
          facility_drivers (
            drivers (
              id,
              name,
              vehicle_type,
              vehicle_number,
              status
            )
          )
        `)
        .eq('status', true);

      if (facilitiesError) throw facilitiesError;

      // Process facilities data
      const processedFacilities = facilitiesData?.map(facility => ({
        ...facility,
        drivers: facility.facility_drivers?.map(fd => fd.drivers).filter(d => d.status) || []
      })) || [];

      // Fetch orders for the selected date for each facility
      const facilityOrders: Record<string, Order[]> = {};
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      
      for (const facility of processedFacilities) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            drivers!orders_assigned_driver_id_fkey (
              id,
              name,
              vehicle_type,
              vehicle_number,
              status
            )
          `)
          .gte('estimated_delivery', dayStart.toISOString())
          .lt('estimated_delivery', dayEnd.toISOString())
          .eq('status', 'processing');

        if (orderError) throw orderError;
        
        facilityOrders[facility.id] = orderData?.map(order => ({
          ...order,
          assigned_driver: order.drivers
        })) || [];
      }

      setFacilities(processedFacilities);
      setOrders(facilityOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load facility orders');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const ordersSubscription = supabase
      .channel('facility_orders_changes')
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatDateTime = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return 'Not set';
    return format(new Date(`2000-01-01T${timeString}`), 'HH:mm');
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const generateCalendarDays = () => {
    const days = [];
    const start = subDays(selectedDate, 3);
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      days.push(day);
    }
    
    return days;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Facility Orders</h1>
        <div className="text-gray-600">Loading facility orders...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Facility Orders</h1>
        
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

      <div className="space-y-6">
        {facilities.map(facility => {
          const facilityOrders = orders[facility.id] || [];

          return (
            <div key={facility.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-gray-500" />
                      {facility.facility_name} (#{facility.facility_code})
                    </h2>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {[facility.address_line_1, facility.city, facility.zipcode].filter(Boolean).join(', ')}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Hours: {formatTime(facility.opening_hour)} - {formatTime(facility.close_hour)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">Assigned Drivers</p>
                    <div className="mt-1 space-y-1">
                      {facility.drivers && facility.drivers.length > 0 ? (
                        facility.drivers.map(driver => (
                          <p key={driver.id} className="text-sm text-gray-600 flex items-center justify-end gap-2">
                            <Truck className="w-4 h-4" />
                            {driver.name} ({driver.vehicle_type})
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No drivers assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {facilityOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No orders scheduled for {format(selectedDate, 'MMMM d, yyyy')}</p>
                ) : (
                  <div className="space-y-4">
                    {facilityOrders.map(order => (
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
                            {getStatusIcon(order.status)}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {order.shipping_address}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Scheduled: {formatDateTime(order.estimated_delivery)}
                            </p>
                            {order.assigned_driver && (
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Assigned to: {order.assigned_driver.name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">Last Update</p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(order.last_status_update)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FacilityOrders;