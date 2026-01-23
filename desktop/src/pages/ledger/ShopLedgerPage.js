/**
 * Shop Ledger Page
 * Shop Ledger Management System
 * Display complete ledger for a specific shop with all transactions
 * Company: Ummahtechinnovations.com
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ledgerService from '../../services/ledgerService';
import shopService from '../../services/shopService';

const ShopLedgerPage = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [shop, setShop] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  // Filters
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    transaction_type: ''
  });

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(''); // 'receive' or 'pay'
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  // Load data on mount and when filters change
  useEffect(() => {
    if (shopId) {
      loadShopDetails();
      loadLedger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, currentPage, filters]);

  const loadShopDetails = async () => {
    try {
      const response = await shopService.getShopById(shopId);
      if (response.success) {
        setShop(response.data);
      }
    } catch (err) {
      console.error('Error loading shop details:', err);
    }
  };

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: currentPage,
        limit: limit,
        ...filters
      };

      const response = await ledgerService.getShopLedger(shopId, params);
      
      if (response.success && response.data) {
        // Backend returns {shop, entries, pagination}
        const { entries = [], pagination = {} } = response.data;
        setLedger(entries);
        setTotalPages(pagination.totalPages || 1);
        setTotalRecords(pagination.total || 0);
      }
    } catch (err) {
      console.error('Error loading ledger:', err);
      setError('Failed to load ledger. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
    setCurrentPage(1);
  };

  const handlePrintStatement = async () => {
    try {
      window.print();
    } catch (err) {
      setError('Failed to print statement. Please try again.');
    }
  };

  // Payment Modal Functions
  const handleOpenPaymentModal = (type) => {
    setPaymentType(type);
    setShowPaymentModal(true);
    setPaymentData({
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentType('');
    setPaymentData({
      amount: '',
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      const amount = parseFloat(paymentData.amount);
      
      if (!amount || amount <= 0) {
        setError('Please enter a valid amount greater than zero');
        setLoading(false);
        return;
      }

      const payload = {
        shop_id: parseInt(shopId),
        amount: amount,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes,
        transaction_type: paymentType // 'receive' or 'pay'
      };

      const response = await ledgerService.recordPayment(payload);
      
      if (response.success) {
        const action = paymentType === 'receive' ? 'received from' : 'paid to';
        setSuccess(`Payment of Rs ${amount.toFixed(2)} ${action} shop recorded successfully`);
        handleClosePaymentModal();
        loadLedger();
        loadShopDetails();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    const icons = {
      'invoice': '📄',
      'payment': '💰',
      'adjustment': '✏️',
      'opening_balance': '🔵'
    };
    return icons[type] || '📝';
  };

  const getTransactionColor = (type) => {
    const colors = {
      'invoice': 'text-red-600',
      'payment': 'text-green-600',
      'adjustment': 'text-blue-600',
      'opening_balance': 'text-gray-600'
    };
    return colors[type] || 'text-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/ledger')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            ← Back to Ledger
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Shop Ledger</h1>
          {shop && (
            <p className="text-gray-600 mt-1">
              {shop.shop_name} ({shop.shop_code}) - {shop.owner_name}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrintStatement}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            🖨️ Print Statement
          </button>
          <button
            onClick={() => handleOpenPaymentModal('receive')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            💰 Receive from Shop
          </button>
          <button
            onClick={() => handleOpenPaymentModal('pay')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            💸 Pay to Shop
          </button>
          <button
            onClick={handlePrintStatement}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            🖨️ Print Ledger
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="float-right">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
          <button onClick={() => setSuccess('')} className="float-right">×</button>
        </div>
      )}

      {/* Shop Balance Card */}
      {shop && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm opacity-80 mb-1">Current Balance</div>
              <div className="text-2xl font-bold">
                {ledgerService.formatCurrency(shop.current_balance)}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-1">Credit Limit</div>
              <div className="text-2xl font-bold">
                {ledgerService.formatCurrency(shop.credit_limit)}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-1">Available Credit</div>
              <div className="text-2xl font-bold">
                {ledgerService.formatCurrency(shop.credit_limit - shop.current_balance)}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-80 mb-1">Credit Utilization</div>
              <div className="text-2xl font-bold">
                {((shop.current_balance / shop.credit_limit) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <select
              name="transaction_type"
              value={filters.transaction_type}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="invoice">Invoice</option>
              <option value="payment">Payment</option>
              <option value="adjustment">Adjustment</option>
              <option value="opening_balance">Opening Balance</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ start_date: '', end_date: '', transaction_type: '' });
                setCurrentPage(1);
              }}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Loading ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ledgerService.formatDate(entry.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTransactionColor(entry.transaction_type)}`}>
                        {getTransactionIcon(entry.transaction_type)} {ledgerService.getTransactionTypeLabel(entry.transaction_type)}
                      </span>
                      {entry.is_manual === 1 && (
                        <span className="ml-2 text-xs text-orange-600">(Manual)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.reference_number || `${entry.reference_type}-${entry.reference_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.description}
                      {entry.notes && (
                        <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      {entry.debit_amount > 0 ? ledgerService.formatCurrency(entry.debit_amount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                      {entry.credit_amount > 0 ? ledgerService.formatCurrency(entry.credit_amount) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                      {ledgerService.formatCurrency(entry.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * limit, totalRecords)}</span> of{' '}
                  <span className="font-medium">{totalRecords}</span> transactions
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Simple Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {paymentType === 'receive' ? '💰 Receive from Shop' : '💸 Pay to Shop'}
              </h2>
              <button
                onClick={handleClosePaymentModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Shop</div>
              <div className="font-semibold">{shop?.shop_name}</div>
              <div className="text-sm text-gray-600 mt-2">Current Balance</div>
              <div className="text-xl font-bold text-blue-600">
                Rs {parseFloat(shop?.current_balance || 0).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="cash">💵 Cash</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="cheque">📝 Cheque</option>
                  <option value="online">💳 Online Payment</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Cheque #, Transaction ID, etc."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              {paymentData.amount && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">New Balance After Transaction</div>
                  <div className="text-xl font-bold text-blue-600">
                    Rs {(
                      parseFloat(shop?.current_balance || 0) - parseFloat(paymentData.amount || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2 rounded-lg text-white transition ${
                    paymentType === 'receive'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Processing...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopLedgerPage;
