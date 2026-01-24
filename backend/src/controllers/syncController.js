/**
 * Mobile Sync Controller
 * Sprint 9: Mobile Order Syncing - Part 1
 * Company: Ummahtechinnovations.com
 * 
 * This controller handles mobile synchronization for orders, products, shops, and routes.
 * Features:
 * - Bulk order upload from mobile devices
 * - Incremental sync with timestamps
 * - Conflict resolution (server wins)
 * - Batch processing (max 50 records per request)
 * - Sync logging and statistics
 */

const db = require('../config/database');

/**
 * POST /api/mobile/sync/orders
 * Upload orders from mobile device in bulk
 * 
 * Request Body:
 * {
 *   salesman_id: number,
 *   device_info: { device_id, os, app_version },
 *   orders: [{ mobile_order_id, shop_id, order_date, items: [], ... }]
 * }
 */
exports.syncOrders = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { salesman_id, device_info, orders } = req.body;
    
    // Validation
    if (!salesman_id || !orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. salesman_id and orders array required.'
      });
    }
    
    // Limit batch size
    if (orders.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Batch size exceeds limit. Maximum 50 orders per request.'
      });
    }
    
    await connection.beginTransaction();
    
    const results = {
      total: orders.length,
      success: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    for (const orderData of orders) {
      try {
        const { mobile_order_id, shop_id, route_id, order_date, total_amount, discount, net_amount, notes, items } = orderData;
        
        // Check if order already exists (by mobile_order_id)
        const [existing] = await connection.query(
          'SELECT id, updated_at, is_synced FROM orders WHERE mobile_order_id = ? AND salesman_id = ?',
          [mobile_order_id, salesman_id]
        );
        
        let orderId;
        
        if (existing.length > 0) {
          // Conflict resolution: Check timestamps
          const existingOrder = existing[0];
          const serverTimestamp = new Date(existingOrder.updated_at).getTime();
          const mobileTimestamp = new Date(order_date).getTime();
          
          if (mobileTimestamp <= serverTimestamp && existingOrder.is_synced) {
            // Server data is newer - log conflict
            await connection.query(
              `INSERT INTO sync_conflicts 
               (salesman_id, entity_type, entity_id, mobile_data, server_data, conflict_type, resolution_strategy) 
               VALUES (?, 'order', ?, ?, ?, 'timestamp', 'server_wins')`,
              [salesman_id, mobile_order_id, JSON.stringify(orderData), JSON.stringify(existingOrder), 'timestamp']
            );
            
            results.conflicts++;
            results.errors.push({
              mobile_order_id,
              error: 'Conflict: Server data is newer'
            });
            continue;
          }
          
          // Update existing order
          await connection.query(
            `UPDATE orders 
             SET shop_id = ?, route_id = ?, order_date = ?, total_amount = ?, discount = ?, net_amount = ?, 
                 notes = ?, is_synced = TRUE, sync_status = 'synced', synced_at = NOW(), last_modified = NOW()
             WHERE id = ?`,
            [shop_id, route_id, order_date, total_amount, discount, net_amount, notes, existingOrder.id]
          );
          
          orderId = existingOrder.id;
          
          // Delete existing items
          await connection.query('DELETE FROM order_details WHERE order_id = ?', [orderId]);
        } else {
          // CRITICAL: Validate stock availability BEFORE creating order
          if (items && items.length > 0) {
            for (const item of items) {
              const [stockCheck] = await connection.query(
                'SELECT product_name, stock_quantity, reserved_stock FROM products WHERE id = ?',
                [item.product_id]
              );
              
              if (stockCheck.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found`);
              }
              
              const product = stockCheck[0];
              const availableStock = product.stock_quantity - parseFloat(product.reserved_stock);
              
              if (availableStock < item.quantity) {
                throw new Error(
                  `Insufficient stock for ${product.product_name}. ` +
                  `Available: ${availableStock}, Required: ${item.quantity}`
                );
              }
            }
          }
          
          // Generate order number
          const orderNumber = await generateOrderNumber(connection);
          
          // Insert new order
          const [result] = await connection.query(
            `INSERT INTO orders 
             (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, 
              status, notes, mobile_order_id, is_synced, sync_status, synced_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, TRUE, 'synced', NOW())`,
            [orderNumber, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, notes, mobile_order_id]
          );
          
          orderId = result.insertId;
        }
        
        // Insert order items
        if (items && items.length > 0) {
          for (const item of items) {
            await connection.query(
              `INSERT INTO order_details 
               (order_id, product_id, quantity, unit_price, total_price, discount, net_price) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [orderId, item.product_id, item.quantity, item.unit_price, item.total_price, item.discount || 0, item.net_price]
            );
          }
          
          // CRITICAL: Reserve stock for this order
          for (const item of items) {
            // Get current stock
            const [stockInfo] = await connection.query(
              'SELECT stock_quantity, reserved_stock, product_name FROM products WHERE id = ?',
              [item.product_id]
            );
            
            if (stockInfo.length > 0) {
              const product = stockInfo[0];
              const availableBefore = product.stock_quantity - parseFloat(product.reserved_stock);
              
              // Reserve the stock
              await connection.query(
                'UPDATE products SET reserved_stock = reserved_stock + ? WHERE id = ?',
                [item.quantity, item.product_id]
              );
              
              // Log stock movement
              await connection.query(
                `INSERT INTO stock_movements (
                  product_id, movement_type, quantity,
                  stock_before, stock_after, reserved_before, reserved_after,
                  available_before, available_after, reference_type, reference_id,
                  reference_number, notes, created_by
                ) VALUES (?, 'RESERVE', ?, ?, ?, ?, ?, ?, ?, 'order', ?, ?, ?, NULL)`,
                [
                  item.product_id,
                  item.quantity,
                  product.stock_quantity,
                  product.stock_quantity,
                  parseFloat(product.reserved_stock),
                  parseFloat(product.reserved_stock) + item.quantity,
                  availableBefore,
                  availableBefore - item.quantity,
                  orderId,
                  mobile_order_id || `Order ${orderId}`,
                  `Reserved for order ${mobile_order_id || orderId} (synced from mobile)`
                ]
              );
            }
          }
          
          // Mark order as having stock reserved
          await connection.query(
            'UPDATE orders SET stock_reserved = TRUE WHERE id = ?',
            [orderId]
          );
        }
        
        results.success++;
      } catch (itemError) {
        results.failed++;
        results.errors.push({
          mobile_order_id: orderData.mobile_order_id,
          error: itemError.message
        });
      }
    }
    
    await connection.commit();
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    await connection.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, sync_duration, device_info, timestamp) 
       VALUES (?, 'order', 'upload', ?, ?, ?, ?, NOW())`,
      [salesman_id, results.failed === 0 ? 'success' : 'partial', results.success, duration, JSON.stringify(device_info)]
    );
    
    // Update sync statistics
    await updateSyncStatistics(connection, salesman_id, 'orders_uploaded', results.success);
    
    res.json({
      success: true,
      message: `Synced ${results.success}/${results.total} orders successfully`,
      results,
      sync_duration_ms: duration
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Sync orders error:', error);
    
    // Log failure
    await connection.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, error_message, timestamp) 
       VALUES (?, 'order', 'upload', 'failed', ?, NOW())`,
      [req.body.salesman_id || null, error.message]
    );
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/mobile/sync/products?last_sync=2025-01-01T00:00:00Z
 * Get products updated after last_sync timestamp (incremental sync)
 */
exports.getProducts = async (req, res) => {
  try {
    const { last_sync } = req.query;
    const salesman_id = req.user?.id || req.query.salesman_id; // From auth middleware
    
    const startTime = Date.now();
    
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    
    if (last_sync) {
      query += ' AND updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const [products] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    if (salesman_id) {
      await db.query(
        `INSERT INTO sync_logs 
         (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
         VALUES (?, 'product', 'download', 'success', ?, ?, NOW())`,
        [salesman_id, products.length, duration]
      );
      
      await updateSyncStatistics(null, salesman_id, 'products_downloaded', products.length);
    }
    
    res.json({
      success: true,
      products,
      count: products.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/shops?last_sync=2025-01-01T00:00:00Z&salesman_id=1
 * Get shops assigned to salesman, updated after last_sync
 */
exports.getShops = async (req, res) => {
  try {
    const { last_sync, salesman_id } = req.query;
    
    if (!salesman_id) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id is required'
      });
    }
    
    const startTime = Date.now();
    
    let query = `
      SELECT s.* 
      FROM shops s
      INNER JOIN shop_assignments sa ON s.id = sa.shop_id
      WHERE sa.salesman_id = ? AND s.status = 'active'
    `;
    const params = [salesman_id];
    
    if (last_sync) {
      query += ' AND s.updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY s.updated_at DESC';
    
    const [shops] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
       VALUES (?, 'shop', 'download', 'success', ?, ?, NOW())`,
      [salesman_id, shops.length, duration]
    );
    
    await updateSyncStatistics(null, salesman_id, 'shops_downloaded', shops.length);
    
    res.json({
      success: true,
      shops,
      count: shops.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shops',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/routes?last_sync=2025-01-01T00:00:00Z&salesman_id=1
 * Get routes assigned to salesman, updated after last_sync
 */
exports.getRoutes = async (req, res) => {
  try {
    const { last_sync, salesman_id } = req.query;
    
    if (!salesman_id) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id is required'
      });
    }
    
    const startTime = Date.now();
    
    let query = `
      SELECT r.* 
      FROM routes r
      INNER JOIN route_assignments ra ON r.id = ra.route_id
      WHERE ra.salesman_id = ? AND r.status = 'active'
    `;
    const params = [salesman_id];
    
    if (last_sync) {
      query += ' AND r.updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY r.updated_at DESC';
    
    const [routes] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
       VALUES (?, 'route', 'download', 'success', ?, ?, NOW())`,
      [salesman_id, routes.length, duration]
    );
    
    await updateSyncStatistics(null, salesman_id, 'routes_downloaded', routes.length);
    
    res.json({
      success: true,
      routes,
      count: routes.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
};

/**
 * POST /api/mobile/sync/status
 * Log sync status from mobile device
 * 
 * Request Body:
 * {
 *   salesman_id: number,
 *   entity_type: 'order' | 'product' | 'shop' | 'route',
 *   action: 'upload' | 'download',
 *   status: 'success' | 'failed',
 *   records_count: number,
 *   error_message: string,
 *   device_info: object
 * }
 */
exports.logSyncStatus = async (req, res) => {
  try {
    const { salesman_id, entity_type, action, status, records_count, error_message, device_info, sync_duration } = req.body;
    
    if (!salesman_id || !entity_type || !action || !status) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id, entity_type, action, and status are required'
      });
    }
    
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, error_message, sync_duration, device_info, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [salesman_id, entity_type, action, status, records_count || 0, error_message, sync_duration, JSON.stringify(device_info)]
    );
    
    // Update statistics
    if (status === 'success') {
      await updateSyncStatistics(null, salesman_id, 'successful_syncs', 1);
    } else {
      await updateSyncStatistics(null, salesman_id, 'failed_syncs', 1);
    }
    
    res.json({
      success: true,
      message: 'Sync status logged successfully'
    });
    
  } catch (error) {
    console.error('Log sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log sync status',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/statistics/:salesman_id
 * Get sync statistics for a salesman
 */
exports.getSyncStatistics = async (req, res) => {
  try {
    const { salesman_id } = req.params;
    const { days = 7 } = req.query;
    
    const [stats] = await db.query(
      `SELECT * FROM sync_statistics 
       WHERE salesman_id = ? 
       AND sync_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY sync_date DESC`,
      [salesman_id, days]
    );
    
    // Get recent sync logs
    const [recentLogs] = await db.query(
      `SELECT * FROM sync_logs 
       WHERE salesman_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 20`,
      [salesman_id]
    );
    
    res.json({
      success: true,
      statistics: stats,
      recent_logs: recentLogs
    });
    
  } catch (error) {
    console.error('Get sync statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync statistics',
      error: error.message
    });
  }
};

/**
 * Helper: Generate unique order number
 */
async function generateOrderNumber(connection) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const [result] = await connection.query(
    "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1",
    [`ORD-${dateStr}-%`]
  );
  
  let sequence = 1;
  if (result.length > 0) {
    const lastNumber = result[0].order_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `ORD-${dateStr}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Helper: Update sync statistics
 */
async function updateSyncStatistics(connection, salesman_id, field, increment) {
  const conn = connection || db;
  
  await conn.query(
    `INSERT INTO sync_statistics (salesman_id, sync_date, ${field}, total_syncs, last_sync_at)
     VALUES (?, CURDATE(), ?, 1, NOW())
     ON DUPLICATE KEY UPDATE 
       ${field} = ${field} + ?,
       total_syncs = total_syncs + 1,
       last_sync_at = NOW()`,
    [salesman_id, increment, increment]
  );
}
