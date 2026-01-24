// Delivery Controller
// Purpose: Handle delivery challan API requests

const Delivery = require('../models/Delivery');

/**
 * GET /api/desktop/deliveries
 * Get all deliveries with filters
 */
exports.getAllDeliveries = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      warehouse_id: req.query.warehouse_id,
      route_id: req.query.route_id,
      shop_id: req.query.shop_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      driver_name: req.query.driver_name,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await Delivery.getAll(filters);

    res.json({
      success: true,
      data: result.deliveries,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Error in getAllDeliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/deliveries/with-items
 * Get all deliveries with items for load sheet generation
 */
exports.getAllDeliveriesWithItems = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      warehouse_id: req.query.warehouse_id,
      route_id: req.query.route_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit
    };

    const deliveries = await Delivery.getAllWithItems(filters);

    res.json({
      success: true,
      data: deliveries
    });
  } catch (error) {
    console.error('❌ Error in getAllDeliveriesWithItems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries with items',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/deliveries/:id
 * Get delivery by ID with items
 */
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.getById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('❌ Error in getDeliveryById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/deliveries
 * Create new delivery challan
 */
exports.createDelivery = async (req, res) => {
  try {
    const { delivery, items } = req.body;
    const userId = req.user?.id;

    console.log('\n🔵 ========== CREATE DELIVERY REQUEST ==========');
    console.log('📦 Delivery Data:', JSON.stringify(delivery, null, 2));
    console.log('📦 Items Data:', JSON.stringify(items, null, 2));
    console.log('👤 User ID:', userId);

    // Validation
    if (!delivery.warehouse_id) {
      console.log('❌ Validation failed: No warehouse_id');
      return res.status(400).json({
        success: false,
        message: 'Warehouse is required'
      });
    }

    if (!delivery.delivery_date) {
      console.log('❌ Validation failed: No delivery_date');
      return res.status(400).json({
        success: false,
        message: 'Delivery date is required'
      });
    }

    if (!items || items.length === 0) {
      console.log('❌ Validation failed: No items');
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    console.log('✅ Validation passed, creating delivery...');
    const newDelivery = await Delivery.create(delivery, items, userId);
    console.log('✅ Delivery created:', newDelivery.challan_number);
    console.log('🔵 ========== CREATE DELIVERY COMPLETE ==========\n');

    res.status(201).json({
      success: true,
      message: 'Delivery challan created successfully',
      data: newDelivery
    });
  } catch (error) {
    console.error('❌ Error in createDelivery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery',
      error: error.message
    });
  }
};

/**
 * PUT /api/desktop/deliveries/:id/status
 * Update delivery status
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status, received_by, actual_delivery_time, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'in_transit', 'delivered', 'returned', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = {
      received_by,
      actual_delivery_time,
      remarks
    };

    const delivery = await Delivery.updateStatus(req.params.id, status, updateData);

    res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      data: delivery
    });
  } catch (error) {
    console.error('❌ Error in updateDeliveryStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/deliveries/statistics
 * Get delivery statistics
 */
exports.getDeliveryStatistics = async (req, res) => {
  try {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const stats = await Delivery.getStatistics(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error in getDeliveryStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * DELETE /api/desktop/deliveries/:id
 * Delete delivery (only if pending)
 */
exports.deleteDelivery = async (req, res) => {
  try {
    await Delivery.delete(req.params.id);

    res.json({
      success: true,
      message: 'Delivery deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteDelivery:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/desktop/deliveries/by-invoice/:invoiceId
 * Get deliveries for an invoice WITH ITEMS (for partial challan tracking)
 */
exports.getDeliveriesByInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.invoiceId;
    console.log('📋 Fetching deliveries with items for invoice:', invoiceId);

    const filters = {
      invoice_id: invoiceId,
      limit: 100 // Get all deliveries for this invoice
    };

    // Use getAllWithItems to include delivery_items
    const result = await Delivery.getAllWithItems(filters);

    console.log('✅ Found', result.length, 'deliveries for invoice', invoiceId);
    result.forEach((delivery, index) => {
      console.log(`   Delivery ${index + 1}:`, delivery.challan_number, '- Items:', delivery.items?.length || 0);
    });

    res.json({
      success: true,
      data: result // This is already an array from getAllWithItems
    });
  } catch (error) {
    console.error('❌ Error in getDeliveriesByInvoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/deliveries/by-order/:orderId
 * Get deliveries for an order
 */
exports.getDeliveriesByOrder = async (req, res) => {
  try {
    const filters = {
      order_id: req.params.orderId
    };

    const result = await Delivery.getAll(filters);

    res.json({
      success: true,
      data: result.deliveries
    });
  } catch (error) {
    console.error('❌ Error in getDeliveriesByOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deliveries',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/deliveries/bulk-delete
 * Bulk delete deliveries with admin override option
 * Body: { delivery_ids: [], force: boolean }
 */
exports.bulkDeleteDeliveries = async (req, res) => {
  try {
    const { delivery_ids, force } = req.body;
    const userId = req.user?.id;

    if (!delivery_ids || !Array.isArray(delivery_ids) || delivery_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of delivery IDs to delete'
      });
    }

    console.log('📋 Bulk delete request:', {
      delivery_ids,
      count: delivery_ids.length,
      force: force || false,
      userId
    });

    const result = await Delivery.bulkDelete(delivery_ids, userId, force || false);

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} delivery/deliveries`,
      data: result
    });
  } catch (error) {
    console.error('❌ Error in bulkDeleteDeliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete deliveries',
      error: error.message
    });
  }
};
