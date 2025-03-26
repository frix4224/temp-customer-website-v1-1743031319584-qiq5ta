import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, addDays } from 'date-fns';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  lastWeekOrders: number;
  lastWeekRevenue: number;
  lastWeekActive: number;
}

interface WeeklyData {
  name: string;
  orders: number;
  revenue: number;
}

interface RecentOrder {
  order_number: string;
  items_count: number;
  status: string;
  total_amount: number;
}

interface ServiceRevenue {
  name: string;
  revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    lastWeekOrders: 0,
    lastWeekRevenue: 0,
    lastWeekActive: 0
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topServices, setTopServices] = useState<ServiceRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get current date ranges
      const now = new Date();
      const startOfLastWeek = startOfWeek(now, { weekStartsOn: 1 });
      const weekDays = Array.from({ length: 7 }, (_, i) => 
        format(addDays(startOfLastWeek, i), 'EEE')
      );

      // Fetch total orders and revenue
      const { data: currentStats, error: statsError } = await supabase
        .from('orders')
        .select('id, total_amount, status')
        .order('created_at', { ascending: false });

      if (statsError) throw statsError;

      // Calculate current stats
      const activeOrdersCount = currentStats?.filter(order => 
        ['pending', 'processing'].includes(order.status)
      ).length || 0;

      const totalRevenue = currentStats?.reduce((sum, order) => 
        sum + (order.total_amount || 0), 0
      ) || 0;

      // Fetch last week's stats for comparison
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const { data: lastWeekStats, error: lastWeekError } = await supabase
        .from('orders')
        .select('id, total_amount, status')
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', now.toISOString());

      if (lastWeekError) throw lastWeekError;

      // Calculate weekly data
      const weeklyStats = weekDays.map(day => ({
        name: day,
        orders: Math.floor(Math.random() * 15) + 10, // Simulated data
        revenue: Math.floor(Math.random() * 1000) + 500 // Simulated data
      }));

      // Fetch recent orders
      const { data: recentOrdersData, error: recentError } = await supabase
        .from('orders')
        .select(`
          order_number,
          status,
          total_amount,
          order_items (count)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentError) throw recentError;

      // Fetch top services revenue
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('name, price_starts_at')
        .order('price_starts_at', { ascending: false })
        .limit(3);

      if (servicesError) throw servicesError;

      // Update state with real data
      setStats({
        totalOrders: currentStats?.length || 0,
        totalRevenue,
        activeOrders: activeOrdersCount,
        lastWeekOrders: lastWeekStats?.length || 0,
        lastWeekRevenue: lastWeekStats?.reduce((sum, order) => 
          sum + (order.total_amount || 0), 0
        ) || 0,
        lastWeekActive: lastWeekStats?.filter(order => 
          ['pending', 'processing'].includes(order.status)
        ).length || 0
      });

      setWeeklyData(weeklyStats);

      setRecentOrders(recentOrdersData?.map(order => ({
        order_number: order.order_number,
        items_count: order.order_items?.[0]?.count || 0,
        status: order.status,
        total_amount: order.total_amount
      })) || []);

      setTopServices(servicesData?.map(service => ({
        name: service.name,
        revenue: service.price_starts_at * Math.floor(Math.random() * 100) // Simulated total revenue
      })) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number): string => {
    if (previous === 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.totalOrders}</p>
          <span className={`text-sm ${
            calculateChange(stats.totalOrders, stats.lastWeekOrders).startsWith('+') 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {calculateChange(stats.totalOrders, stats.lastWeekOrders)} from last week
          </span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">
            {formatCurrency(stats.totalRevenue)}
          </p>
          <span className={`text-sm ${
            calculateChange(stats.totalRevenue, stats.lastWeekRevenue).startsWith('+') 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {calculateChange(stats.totalRevenue, stats.lastWeekRevenue)} from last week
          </span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Active Orders</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">{stats.activeOrders}</p>
          <span className={`text-sm ${
            calculateChange(stats.activeOrders, stats.lastWeekActive).startsWith('+') 
              ? 'text-green-500' 
              : 'text-red-500'
          }`}>
            {calculateChange(stats.activeOrders, stats.lastWeekActive)} from last week
          </span>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Customer Satisfaction</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">4.8/5</p>
          <span className="text-sm text-green-500">+2% from last week</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Weekly Performance</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke="#007AFF"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#27AE60"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.order_number} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Order #{order.order_number}</p>
                  <p className="text-sm text-gray-500">
                    {order.items_count} items • {order.status}
                  </p>
                </div>
                <span className="text-[#007AFF] font-medium">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Services</h2>
          <div className="space-y-4">
            {topServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-800">{service.name}</span>
                <span className="text-[#007AFF] font-medium">
                  {formatCurrency(service.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;