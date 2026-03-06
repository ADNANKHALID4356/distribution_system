import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    total_orders: 0,
    total_products: 0,
    active_products: 0,
    total_shops: 0,
    active_shops: 0,
    total_salesmen: 0,
    active_salesmen: 0,
    total_warehouses: 0,
    active_warehouses: 0,
    pending_deliveries: 0,
    total_deliveries: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    total_stock_quantity: 0,
    total_inventory_value: 0,
    total_warehouse_stock: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 DashboardPage: Starting fetch...');
      const response = await dashboardService.getDashboardStats();
      console.log('📊 DashboardPage: Got response:', JSON.stringify(response, null, 2));
      
      if (response && response.success && response.data) {
        const newStats = {
          total_orders: Number(response.data.total_orders) || 0,
          total_products: Number(response.data.total_products) || 0,
          active_products: Number(response.data.active_products) || 0,
          total_shops: Number(response.data.total_shops) || 0,
          active_shops: Number(response.data.active_shops) || 0,
          total_salesmen: Number(response.data.total_salesmen) || 0,
          active_salesmen: Number(response.data.active_salesmen) || 0,
          total_warehouses: Number(response.data.total_warehouses) || 0,
          active_warehouses: Number(response.data.active_warehouses) || 0,
          pending_deliveries: Number(response.data.pending_deliveries) || 0,
          total_deliveries: Number(response.data.total_deliveries) || 0,
          low_stock_products: Number(response.data.low_stock_products) || 0,
          out_of_stock_products: Number(response.data.out_of_stock_products) || 0,
          total_stock_quantity: Number(response.data.total_stock_quantity) || 0,
          total_inventory_value: Number(response.data.total_inventory_value) || 0,
          total_warehouse_stock: Number(response.data.total_warehouse_stock) || 0
        };
        console.log('📊 DashboardPage: Setting stats to:', newStats);
        setStats(newStats);
        setLastRefresh(new Date());
      } else {
        console.error('📊 DashboardPage: Invalid response structure:', response);
      }
    } catch (error) {
      console.error('📊 DashboardPage: Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  // Refresh data when navigating back to this page
  useEffect(() => {
    fetchDashboardStats();
  }, [location.key, fetchDashboardStats]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Utility functions (commented out - not currently used but kept for future use)
  // const formatNumber = (num) => {
  //   if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  //   if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  //   return num.toLocaleString();
  // };

  // const formatCurrency = (num) => {
  //   return '₨ ' + parseFloat(num || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  // };

  // Use ACTIVE counts to match what users see on management pages (which filter by is_active=true by default)
  const statsCards = [
    { name: 'Total Products', value: stats.active_products || stats.total_products, icon: TruckIcon, gradient: 'from-emerald-400 to-emerald-600', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-200', link: '/products' },
    { name: 'Total Orders', value: stats.total_orders, icon: ShoppingBagIcon, gradient: 'from-violet-400 to-violet-600', bgLight: 'bg-violet-50', borderColor: 'border-violet-200', link: '/orders' },
    { name: 'Total Deliveries', value: stats.total_deliveries || 0, icon: ClipboardDocumentListIcon, gradient: 'from-orange-400 to-orange-600', bgLight: 'bg-orange-50', borderColor: 'border-orange-200', link: '/deliveries' },
    { name: 'Total Shops', value: stats.active_shops || stats.total_shops, icon: HomeIcon, gradient: 'from-amber-400 to-amber-600', bgLight: 'bg-amber-50', borderColor: 'border-amber-200', link: '/shops' },
    { name: 'Total Salesmen', value: stats.active_salesmen || stats.total_salesmen, icon: UserGroupIcon, gradient: 'from-indigo-400 to-indigo-600', bgLight: 'bg-indigo-50', borderColor: 'border-indigo-200', link: '/salesmen' },
    { name: 'Total Warehouses', value: stats.active_warehouses || stats.total_warehouses, icon: CubeIcon, gradient: 'from-teal-400 to-teal-600', bgLight: 'bg-teal-50', borderColor: 'border-teal-200', link: '/warehouses' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
                <TruckIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Distribution Management System</h1>
                <p className="text-xs text-primary-600 font-medium tracking-wide">Ummahtechinnovations.com</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDashboardStats}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                title={`Last refresh: ${lastRefresh.toLocaleTimeString()}`}
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 text-primary-600 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{user?.full_name}</p>
                  <p className="text-xs text-primary-600 font-medium">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 transition-all duration-200"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 rounded-2xl shadow-2xl shadow-primary-200 p-8 mb-10">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">👋</span>
              <h2 className="text-3xl font-bold text-white">
                Welcome back, {user?.full_name}!
              </h2>
            </div>
            <p className="text-primary-100 text-lg">
              You're logged in as <span className="font-bold text-white bg-white/20 px-3 py-1 rounded-full text-sm">{user?.role}</span>
            </p>
            <p className="text-primary-200 text-sm mt-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Dashboard auto-refreshes every 30 seconds
            </p>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Dashboard Overview</h3>
            <p className="text-sm text-gray-500">Click on any card to explore details</p>
          </div>
          <div className="text-xs text-gray-400 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {loading ? (
            <div className="col-span-4 text-center py-16">
              <div className="inline-flex items-center gap-3 text-gray-500">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-primary-500" />
                <span className="text-lg">Loading statistics...</span>
              </div>
            </div>
          ) : (
            statsCards.map((stat, index) => (
              <div 
                key={stat.name} 
                className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl p-6 cursor-pointer border ${stat.borderColor} overflow-hidden transition-all duration-300 hover:-translate-y-1`}
                onClick={() => navigate(stat.link)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                      <svg className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                <Cog6ToothIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
                <p className="text-xs text-gray-500">Shortcuts to frequently used features</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/routes')}
                className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl hover:from-green-100 hover:to-emerald-100 hover:border-green-400 hover:shadow-lg hover:shadow-green-100 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <MapPinIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-800 text-lg">Manage Routes</span>
                  <p className="text-xs text-gray-500">Configure delivery routes</p>
                </div>
              </button>
              <button 
                onClick={() => navigate('/stock-returns')}
                className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl hover:from-amber-100 hover:to-yellow-100 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-800 text-lg">Stock Returns</span>
                  <p className="text-xs text-gray-500">Process delivery returns</p>
                </div>
              </button>
              <button 
                onClick={() => navigate('/daily-collections')}
                className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl hover:from-teal-100 hover:to-cyan-100 hover:border-teal-400 hover:shadow-lg hover:shadow-teal-100 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-800 text-lg">Daily Collections</span>
                  <p className="text-xs text-gray-500">Track daily received amounts</p>
                </div>
              </button>
              <button 
                onClick={() => navigate('/routes/consolidated-bill')}
                className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DocumentTextIcon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-gray-800 text-lg">Consolidated Bill</span>
                  <p className="text-xs text-gray-500">Route-wise billing report</p>
                </div>
              </button>
              {(user?.role === 'Admin' || user?.role_name === 'Admin') && (
                <button 
                  onClick={() => navigate('/settings/company')}
                  className="group flex items-center justify-center px-6 py-5 bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-gray-200 rounded-2xl hover:from-slate-100 hover:to-gray-100 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-gray-500 rounded-xl flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Cog6ToothIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-gray-800 text-lg">Settings</span>
                    <p className="text-xs text-gray-500">System configuration</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>


      </main>
    </div>
  );
};

export default DashboardPage;
