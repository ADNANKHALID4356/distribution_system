import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import shopService from '../../services/shopService';
import routeService from '../../services/routeService';

const ShopListingPage = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [shopsResponse, routesResponse] = await Promise.all([
        shopService.getAllShops({ limit: 100 }),
        routeService.getActiveRoutes()
      ]);
      setShops(shopsResponse.data);
      setRoutes(routesResponse.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        search: searchTerm,
        route_id: filterRoute,
        city: filterCity,
        is_active: filterStatus
      };
      const response = await shopService.getAllShops(params);
      setShops(response.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to search shops');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, shopName) => {
    try {
      // First attempt: Try normal delete
      const confirmDelete = window.confirm(`Are you sure you want to delete shop "${shopName}"?`);
      if (!confirmDelete) return;

      setLoading(true);
      await shopService.deleteShop(id, false);
      
      // Success - shop deleted
      alert(`✓ Shop "${shopName}" deleted successfully`);
      fetchInitialData();
      
    } catch (err) {
      // Check if error is due to dependencies
      if (err.dependencies) {
        const { orders, invoices, deliveries } = err.dependencies;
        const dependencyMsg = [];
        if (orders > 0) dependencyMsg.push(`${orders} order(s)`);
        if (invoices > 0) dependencyMsg.push(`${invoices} invoice(s)`);
        if (deliveries > 0) dependencyMsg.push(`${deliveries} delivery(ies)`);
        
        // Show admin override confirmation
        const forceDelete = window.confirm(
          `⚠️ WARNING: Shop "${shopName}" has existing data:\n\n` +
          `${dependencyMsg.join(', ')}\n\n` +
          `🔴 ADMIN OVERRIDE REQUIRED:\n` +
          `Clicking OK will permanently delete:\n` +
          `- The shop\n` +
          `- All related orders\n` +
          `- All related invoices\n` +
          `- All related deliveries\n\n` +
          `This action CANNOT be undone!\n\n` +
          `Do you want to proceed with force deletion?`
        );
        
        if (forceDelete) {
          try {
            setLoading(true);
            const result = await shopService.deleteShop(id, true);
            
            alert(
              `✓ Shop "${shopName}" deleted successfully (Admin Override)\n\n` +
              `Deleted:\n` +
              `- ${result.deleted?.orders || 0} order(s)\n` +
              `- ${result.deleted?.invoices || 0} invoice(s)\n` +
              `- ${result.deleted?.deliveries || 0} delivery(ies)`
            );
            
            fetchInitialData();
          } catch (forceErr) {
            setError(forceErr.message || 'Failed to force delete shop');
            console.error('Force delete error:', forceErr);
          } finally {
            setLoading(false);
          }
        }
      } else {
        // Other error
        setError(err.message || 'Failed to delete shop');
        console.error('Delete error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.route_name : '-';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCreditStatusColor = (currentBalance, creditLimit) => {
    const usagePercent = (currentBalance / creditLimit) * 100;
    if (usagePercent >= 90) return 'text-red-600';
    if (usagePercent >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Shop Management</h1>
          <button
            onClick={() => navigate('/shops/add')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Shop</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search shop name, owner, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Routes</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.route_name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by city..."
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleSearch}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shop Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Shop Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit Limit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-4 text-center text-gray-500">
                    Loading shops...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-4 text-center text-gray-500">
                    No shops found. Click "Add Shop" to create one.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {shop.shop_code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {shop.shop_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.owner_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {shop.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getRouteName(shop.route_id)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {formatCurrency(shop.credit_limit)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${getCreditStatusColor(shop.current_balance, shop.credit_limit)}`}>
                      {formatCurrency(shop.current_balance)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        shop.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {shop.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/ledger/shop/${shop.id}`)}
                        className="text-purple-600 hover:text-purple-900 font-semibold"
                        title="View complete transaction history"
                      >
                        📖 Ledger
                      </button>
                      <button
                        onClick={() => navigate(`/shops/edit/${shop.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(shop.id, shop.shop_name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShopListingPage;
