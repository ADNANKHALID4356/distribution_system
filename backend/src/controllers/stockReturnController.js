/**
 * Stock Return Controller
 * Handles stock return API endpoints
 */

const StockReturn = require('../models/StockReturn');

// Process a stock return
const processReturn = async (req, res) => {
  try {
    const { delivery_id, return_date, reason, notes, items } = req.body;

    if (!delivery_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'delivery_id and items are required'
      });
    }

    const validItems = items.filter(i => i.quantity_returned > 0);
    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item must have quantity_returned > 0'
      });
    }

    const result = await StockReturn.processReturn(
      { delivery_id, return_date, reason, notes, created_by_name: req.user?.full_name },
      validItems,
      req.user?.id
    );

    res.status(201).json({
      success: true,
      message: 'Stock return processed successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ processReturn error:', error);
    res.status(error.message.includes('Cannot') || error.message.includes('not found') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
};

// Get return by ID
const getReturnById = async (req, res) => {
  try {
    const result = await StockReturn.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Return not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all returns
const getAllReturns = async (req, res) => {
  try {
    const result = await StockReturn.getAll(req.query);
    res.json({ success: true, data: result.returns, pagination: result.pagination });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get returns by delivery
const getReturnsByDelivery = async (req, res) => {
  try {
    const result = await StockReturn.getByDeliveryId(req.params.deliveryId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get return statistics
const getReturnStatistics = async (req, res) => {
  try {
    const result = await StockReturn.getStatistics(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  processReturn,
  getReturnById,
  getAllReturns,
  getReturnsByDelivery,
  getReturnStatistics
};
