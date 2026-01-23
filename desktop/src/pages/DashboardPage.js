import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import {
  HomeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_orders: 0,
    total_products: 0,
    total_shops: 0,
    total_salesmen: 0,
    total_warehouses: 0,
    pending_deliveries: 0,
    total_invoices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await dashboardService.getDashboardStats();
      if (response.success) {
        setStats({
          total_orders: response.data.total_orders || 0,
          total_products: response.data.total_products || 0,
          total_shops: response.data.total_shops || 0,
          total_salesmen: response.data.total_salesmen || 0,
          total_warehouses: response.data.total_warehouses || 0,
          pending_deliveries: response.data.pending_deliveries || 0,
          total_invoices: response.data.total_invoices || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statsCards = [
    { name: 'Total Products', value: stats.total_products, icon: TruckIcon, color: 'bg-green-500', link: '/products' },
    { name: 'Total Orders', value: stats.total_orders, icon: ShoppingBagIcon, color: 'bg-purple-500', link: '/orders' },
    { name: 'Total Invoices', value: stats.total_invoices, icon: DocumentTextIcon, color: 'bg-cyan-500', link: '/invoices' },
    { name: 'Pending Deliveries', value: stats.pending_deliveries, icon: ClipboardDocumentListIcon, color: 'bg-orange-500', link: '/deliveries' },
    { name: 'Total Shops', value: stats.total_shops, icon: HomeIcon, color: 'bg-yellow-500', link: '/shops' },
    { name: 'Total Salesmen', value: stats.total_salesmen, icon: UserGroupIcon, color: 'bg-indigo-500', link: '/salesmen' },
    { name: 'Total Warehouses', value: stats.total_warehouses, icon: CubeIcon, color: 'bg-teal-500', link: '/warehouses' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Distribution Management System</h1>
              <p className="text-sm text-primary-600 font-semibold">Ummahtechinnovations.com</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {user?.full_name}! 👋
          </h2>
          <p className="text-primary-100">
            You're logged in as <span className="font-semibold">{user?.role}</span>. Here's your dashboard overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">Loading statistics...</p>
            </div>
          ) : (
            statsCards.map((stat) => (
              <div 
                key={stat.name} 
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(stat.link)}
              >
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="text-gray-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <button 
                onClick={() => navigate('/products')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TruckIcon className="h-6 w-6 text-primary-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Products</span>
              </button>
              <button 
                onClick={() => navigate('/routes')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-green-50 transition-colors"
              >
                <MapPinIcon className="h-6 w-6 text-green-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Routes</span>
              </button>
              <button 
                onClick={() => navigate('/shops')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <BuildingStorefrontIcon className="h-6 w-6 text-purple-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Shops</span>
              </button>
              <button 
                onClick={() => navigate('/salesmen')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <UserGroupIcon className="h-6 w-6 text-blue-600 mr-3" />
                <span className="font-medium text-gray-900">Manage Salesmen</span>
              </button>
              <button 
                onClick={() => navigate('/orders')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <ShoppingBagIcon className="h-6 w-6 text-orange-600 mr-3" />
                <span className="font-medium text-gray-900">Order Management</span>
              </button>
              <button 
                onClick={() => navigate('/invoices')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-3" />
                <span className="font-medium text-gray-900">Invoices & Bills</span>
              </button>
              <button 
                onClick={() => navigate('/warehouses')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-teal-50 transition-colors"
              >
                <CubeIcon className="h-6 w-6 text-teal-600 mr-3" />
                <span className="font-medium text-gray-900">Warehouses</span>
              </button>
              <button 
                onClick={() => navigate('/deliveries')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-cyan-50 transition-colors"
              >
                <ClipboardDocumentListIcon className="h-6 w-6 text-cyan-600 mr-3" />
                <span className="font-medium text-gray-900">Deliveries</span>
              </button>
              <button 
                onClick={() => navigate('/ledger')}
                className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                <DocumentTextIcon className="h-6 w-6 text-yellow-600 mr-3" />
                <span className="font-medium text-gray-900">Shop Ledger</span>
              </button>
              {(user?.role === 'Admin') && (
                <button 
                  onClick={() => navigate('/settings/company')}
                  className="flex items-center justify-center px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Cog6ToothIcon className="h-6 w-6 text-gray-600 mr-3" />
                  <span className="font-medium text-gray-900">Settings</span>
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
