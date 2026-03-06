import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import stockReturnService from '../../services/stockReturnService';
import deliveryService from '../../services/deliveryService';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const StockReturnsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'process'
  const [returns, setReturns] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Process return state
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // View details state
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedReturn, setExpandedReturn] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;

      const [returnsRes, statsRes] = await Promise.all([
        stockReturnService.getAllReturns(params),
        stockReturnService.getStatistics(params),
      ]);
      setReturns(returnsRes.data || []);
      setStatistics(statsRes.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  const fetchDeliveries = useCallback(async () => {
    setLoadingDeliveries(true);
    try {
      const response = await deliveryService.getAllDeliveries({ status: 'delivered' });
      setDeliveries(response.data || []);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  useEffect(() => {
    if (activeTab === 'process') {
      fetchDeliveries();
    }
  }, [activeTab, fetchDeliveries]);

  const handleDeliverySelect = async (deliveryId) => {
    setSelectedDeliveryId(deliveryId);
    setSelectedDelivery(null);
    setReturnItems([]);

    if (!deliveryId) return;

    try {
      const response = await deliveryService.getDeliveryById(deliveryId);
      const delivery = response.data;
      setSelectedDelivery(delivery);

      // Pre-populate return items with 0 quantities
      const items = (delivery.items || []).map(item => ({
        delivery_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        quantity_delivered: item.quantity_delivered || item.quantity_ordered,
        quantity_already_returned: item.quantity_returned || 0,
        max_returnable: (item.quantity_delivered || item.quantity_ordered) - (item.quantity_returned || 0),
        unit_price: item.unit_price,
        return_quantity: 0,
        reason: '',
      }));
      setReturnItems(items);
    } catch (err) {
      setError('Failed to load delivery details');
    }
  };

  const updateReturnQuantity = (index, value) => {
    const qty = parseInt(value) || 0;
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        return_quantity: Math.min(Math.max(0, qty), updated[index].max_returnable),
      };
      return updated;
    });
  };

  const updateReturnItemReason = (index, reason) => {
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], reason };
      return updated;
    });
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);

    if (itemsToReturn.length === 0) {
      setError('Please specify at least one item to return');
      return;
    }

    if (!returnReason) {
      setError('Please provide a return reason');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const returnData = {
        delivery_id: parseInt(selectedDeliveryId),
        reason: returnReason,
        notes: returnNotes,
        items: itemsToReturn.map(item => ({
          delivery_item_id: item.delivery_item_id,
          product_id: item.product_id,
          return_quantity: item.return_quantity,
          reason: item.reason || returnReason,
        })),
      };

      await stockReturnService.processReturn(returnData);
      setSuccess('Stock return processed successfully!');
      setActiveTab('list');
      setSelectedDeliveryId('');
      setSelectedDelivery(null);
      setReturnItems([]);
      setReturnReason('');
      setReturnNotes('');
      fetchReturns();
    } catch (err) {
      setError(err.message || 'Failed to process return');
    } finally {
      setProcessing(false);
    }
  };

  const viewReturnDetails = async (returnId) => {
    try {
      const response = await stockReturnService.getReturnById(returnId);
      setSelectedReturn(response.data);
      setShowDetailModal(true);
    } catch (err) {
      setError('Failed to load return details');
    }
  };

  const formatCurrency = (num) => '₨ ' + parseFloat(num || 0).toLocaleString();
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PK') : '-';

  const filteredReturns = returns.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.return_number || '').toLowerCase().includes(term) ||
      (r.shop_name || '').toLowerCase().includes(term) ||
      (r.challan_number || '').toLowerCase().includes(term)
    );
  });

  const totalReturnValue = returnItems.reduce(
    (sum, item) => sum + item.return_quantity * parseFloat(item.unit_price || 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Stock Returns</h1>
                <p className="text-sm text-gray-500">Process and track stock returns from deliveries</p>
              </div>
            </div>
            <button onClick={fetchReturns} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Returns</p>
              <p className="text-2xl font-bold text-gray-800">{statistics.total_returns || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Items Returned</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.total_items_returned || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Return Value</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.total_return_value)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Unique Products</p>
              <p className="text-2xl font-bold text-blue-600">{statistics.unique_products_returned || 0}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'list'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Return History
          </button>
          <button
            onClick={() => setActiveTab('process')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'process'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Process Return
          </button>
        </div>

        {/* List Tab */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by return number, shop name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Returns Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-2" />
                  <p className="text-gray-500">Loading returns...</p>
                </div>
              ) : filteredReturns.length === 0 ? (
                <div className="text-center py-16">
                  <ArrowUturnLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No stock returns found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Return #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Challan #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Shop</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReturns.map((ret) => (
                      <React.Fragment key={ret.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedReturn(expandedReturn === ret.id ? null : ret.id)}>
                          <td className="px-4 py-3 font-medium text-primary-600">{ret.return_number}</td>
                          <td className="px-4 py-3 text-gray-600">{ret.challan_number || '-'}</td>
                          <td className="px-4 py-3 text-gray-800">{ret.shop_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(ret.return_date)}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{ret.total_items || 0}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(ret.total_return_value)}</td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{ret.reason || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); viewReturnDetails(ret.id); }}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              {expandedReturn === ret.id ? (
                                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedReturn === ret.id && ret.items && (
                          <tr>
                            <td colSpan="8" className="px-4 py-3 bg-gray-50">
                              <div className="text-sm">
                                <p className="font-medium text-gray-700 mb-2">Returned Items:</p>
                                <div className="space-y-1">
                                  {ret.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg">
                                      <span className="text-gray-700">{item.product_name} ({item.product_code})</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-gray-500">Qty: {item.return_quantity}</span>
                                        <span className="text-red-600 font-medium">{formatCurrency(item.return_value)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Process Tab */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            {/* Select Delivery */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Select Delivery</h3>
              <select
                value={selectedDeliveryId}
                onChange={(e) => handleDeliverySelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                disabled={loadingDeliveries}
              >
                <option value="">-- Select a delivered challan --</option>
                {deliveries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.challan_number} - {d.shop_name} ({formatDate(d.delivery_date)}) - {formatCurrency(d.grand_total || d.total_amount)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Delivery Info */}
            {selectedDelivery && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Delivery: {selectedDelivery.challan_number}</h3>
                    <p className="text-sm text-gray-500">
                      Shop: {selectedDelivery.shop_name} | Date: {formatDate(selectedDelivery.delivery_date)}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {selectedDelivery.status}
                  </span>
                </div>

                {/* Return Items */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Delivered</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Already Returned</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Max Returnable</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Return Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Return Value</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Item Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {returnItems.map((item, index) => (
                        <tr key={index} className={item.return_quantity > 0 ? 'bg-orange-50' : ''}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-gray-800">{item.product_name}</span>
                            <span className="text-xs text-gray-500 ml-1">({item.product_code})</span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity_delivered}</td>
                          <td className="px-3 py-2 text-right text-orange-600">{item.quantity_already_returned}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{item.max_returnable}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={item.max_returnable}
                              value={item.return_quantity}
                              onChange={(e) => updateReturnQuantity(index, e.target.value)}
                              className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-primary-500"
                              disabled={item.max_returnable <= 0}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-red-600">
                            {formatCurrency(item.return_quantity * parseFloat(item.unit_price || 0))}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => updateReturnItemReason(index, e.target.value)}
                              placeholder="Optional"
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="6" className="px-3 py-3 text-right font-bold text-gray-700">Total Return Value:</td>
                        <td className="px-3 py-3 text-right font-bold text-red-600 text-lg">{formatCurrency(totalReturnValue)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Return Reason & Notes */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason *</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select reason</option>
                      <option value="damaged">Damaged Goods</option>
                      <option value="expired">Expired Products</option>
                      <option value="wrong_product">Wrong Product</option>
                      <option value="excess_quantity">Excess Quantity</option>
                      <option value="quality_issue">Quality Issue</option>
                      <option value="shop_closed">Shop Closed</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleProcessReturn}
                    disabled={processing || returnItems.filter(i => i.return_quantity > 0).length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all flex items-center gap-2"
                  >
                    {processing ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowUturnLeftIcon className="h-5 w-5" />
                    )}
                    {processing ? 'Processing...' : 'Process Return'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Return Details: {selectedReturn.return_number}</h3>
                  <p className="text-sm text-gray-500">Challan: {selectedReturn.challan_number} | Shop: {selectedReturn.shop_name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XCircleIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-500">Return Date</p>
                    <p className="font-medium">{formatDate(selectedReturn.return_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="font-medium capitalize">{selectedReturn.reason?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="font-medium">{selectedReturn.total_items}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Value</p>
                    <p className="font-bold text-red-600">{formatCurrency(selectedReturn.total_return_value)}</p>
                  </div>
                </div>

                <h4 className="font-semibold text-gray-700 mb-3">Returned Items</h4>
                <div className="space-y-2">
                  {(selectedReturn.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-800">{item.product_name}</span>
                        <span className="text-sm text-gray-500 ml-2">({item.product_code})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Qty: {item.return_quantity}</span>
                        <span className="text-gray-600">@ {formatCurrency(item.unit_price)}</span>
                        <span className="font-medium text-red-600">{formatCurrency(item.return_value)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedReturn.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-700">{selectedReturn.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockReturnsPage;
