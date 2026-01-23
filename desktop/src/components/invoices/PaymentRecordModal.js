/**
 * Payment Record Modal
 * Sprint 7: Invoice & Bill Management
 * Record payment for an invoice
 */

import React, { useState } from 'react';
import invoiceService from '../../services/invoiceService';

const PaymentRecordModal = ({ invoice, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [paymentData, setPaymentData] = useState({
    payment_amount: invoice.balance_amount || 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: '',
    cheque_number: '',
    cheque_date: '',
    notes: '',
    received_by: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const amount = parseFloat(paymentData.payment_amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    if (amount > invoice.balance_amount) {
      setError(`Payment amount cannot exceed balance amount of ${invoiceService.formatCurrency(invoice.balance_amount)}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        payment_amount: amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number || null,
        bank_name: paymentData.bank_name || null,
        cheque_number: paymentData.cheque_number || null,
        cheque_date: paymentData.cheque_date || null,
        notes: paymentData.notes || null,
        received_by: paymentData.received_by || null
      };

      console.log('Recording payment:', payload);

      const response = await invoiceService.recordPayment(invoice.id, payload);

      if (response.success) {
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const showBankFields = paymentData.payment_method === 'bank_transfer';
  const showChequeFields = paymentData.payment_method === 'cheque';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Record Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Invoice Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="font-semibold text-gray-800">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Shop Name</p>
                <p className="font-semibold text-gray-800">{invoice.shop_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Invoice Amount</p>
                <p className="font-semibold text-gray-800">{invoiceService.formatCurrency(invoice.net_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="font-semibold text-green-600">{invoiceService.formatCurrency(invoice.paid_amount)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-xl font-bold text-red-600">{invoiceService.formatCurrency(invoice.balance_amount)}</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount * <span className="text-xs text-gray-500">(Max: {invoiceService.formatCurrency(invoice.balance_amount)})</span>
                </label>
                <input
                  type="number"
                  name="payment_amount"
                  value={paymentData.payment_amount}
                  onChange={handleInputChange}
                  min="0.01"
                  max={invoice.balance_amount}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  name="payment_method"
                  value={paymentData.payment_method}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={paymentData.payment_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  name="reference_number"
                  value={paymentData.reference_number}
                  onChange={handleInputChange}
                  placeholder="Transaction reference"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Bank Transfer Fields */}
              {showBankFields && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={paymentData.bank_name}
                    onChange={handleInputChange}
                    placeholder="Enter bank name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Cheque Fields */}
              {showChequeFields && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={paymentData.bank_name}
                      onChange={handleInputChange}
                      placeholder="Enter bank name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      name="cheque_number"
                      value={paymentData.cheque_number}
                      onChange={handleInputChange}
                      placeholder="Enter cheque number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Date
                    </label>
                    <input
                      type="date"
                      name="cheque_date"
                      value={paymentData.cheque_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By
                </label>
                <input
                  type="text"
                  name="received_by"
                  value={paymentData.received_by}
                  onChange={handleInputChange}
                  placeholder="Name of person receiving payment"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={paymentData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any additional notes about this payment..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* New Balance Preview */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">New Balance After Payment:</span>
                <span className="text-xl font-bold text-blue-600">
                  {invoiceService.formatCurrency(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0))}
                </span>
              </div>
              {(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0)) <= 0 && (
                <p className="text-sm text-green-600 mt-2">✓ Invoice will be marked as PAID</p>
              )}
              {(invoice.balance_amount - parseFloat(paymentData.payment_amount || 0)) > 0 && parseFloat(paymentData.payment_amount || 0) > 0 && (
                <p className="text-sm text-yellow-600 mt-2">⚠ Invoice will be marked as PARTIAL payment</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentRecordModal;
