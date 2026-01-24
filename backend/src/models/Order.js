/**
 * Order Model
 * Sprint 5: Order Management System
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');

// Detect which database is being used and set table name accordingly
// SQLite uses 'order_items', MySQL uses 'order_details'
const useSQLite = process.env.USE_SQLITE === 'true';
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';

console.log(`📊 Order Model: Using "${ORDER_DETAILS_TABLE}" table for order details (USE_SQLITE=${process.env.USE_SQLITE})`);

const Order = {
  /**
   * Generate unique order number per salesman
   * Format: ORD-YYYYMMDD-SXXX-NNNNN
   * - YYYYMMDD: Order date
   * - SXXX: Salesman ID (e.g., S001, S014)
   * - NNNNN: Sequential number for this salesman on this date
   */
  async generateOrderNumber(orderDate = new Date(), salesmanId) {
    const date = new Date(orderDate);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const salesmanPrefix = `S${String(salesmanId).padStart(3, '0')}`;
    
    console.log('🔍 [BACKEND MODEL] Generating order number for:');
    console.log('   📅 Date:', dateStr);
    console.log('   👤 Salesman ID:', salesmanId, '-> Prefix:', salesmanPrefix);
    
    // Get the highest order number for THIS SALESMAN on THIS DATE
    const orderPrefix = `ORD-${dateStr}-${salesmanPrefix}`;
    console.log('   🔍 Searching for orders like:', `${orderPrefix}%`);
    
    const [result] = await db.query(
      `SELECT order_number 
       FROM orders 
       WHERE salesman_id = ? 
         AND order_number LIKE ? 
       ORDER BY order_number DESC 
       LIMIT 1`,
      [salesmanId, `${orderPrefix}%`]
    );
    
    let orderCount = 0;
    if (result && result.length > 0) {
      // Extract the sequence number (e.g., "ORD-20251119-S014-00001" -> 1)
      const lastOrderNumber = result[0].order_number;
      const matches = lastOrderNumber.match(/-(\d{5})$/);
      if (matches) {
        orderCount = parseInt(matches[1]);
      }
      console.log('   ✅ Last order found:', lastOrderNumber, '-> count:', orderCount);
    } else {
      console.log('   ℹ️  No previous orders found for this salesman on this date');
    }
    
    orderCount += 1;
    const paddedCount = String(orderCount).padStart(5, '0');
    const newOrderNumber = `${orderPrefix}-${paddedCount}`;
    
    console.log('   🎯 Generated order number:', newOrderNumber);
    console.log('   ✅ Order number is UNIQUE for Salesman', salesmanId);
    
    return newOrderNumber;
  },

  /**
   * Create a new order with details
   */
  async create(orderData) {
    console.log('\n🔍 [BACKEND MODEL] ========== Order.create() called ==========');
    console.log('🔍 [BACKEND MODEL] Order data received:', JSON.stringify(orderData, null, 2));
    
    const {
      salesman_id,
      shop_id,
      route_id = null,
      order_date = new Date(),
      total_amount,
      discount = 0,
      net_amount,
      status = 'placed',
      notes = '',
      items = [] // Array of {product_id, quantity, unit_price, total_price, discount, net_price}
    } = orderData;

    console.log('🔍 [BACKEND MODEL] Extracted values:', {
      salesman_id,
      shop_id,
      route_id,
      order_date,
      total_amount,
      discount,
      net_amount,
      status,
      notes,
      itemsCount: items.length
    });

    // ============================================================
    // CRITICAL: CHECK STOCK AVAILABILITY BEFORE CREATING ORDER
    // This prevents orders from being created when stock is insufficient
    // ============================================================
    if (items && items.length > 0) {
      console.log('\n🔍 [BACKEND MODEL] Validating stock availability before order creation...');
      const Product = require('./Product');
      
      try {
        const stockCheck = await Product.checkStockAvailability(items);
        
        if (!stockCheck.available) {
          // Build detailed error message
          const insufficientDetails = [];
          for (const insufficient of stockCheck.insufficientItems) {
            if (insufficient.error) {
              insufficientDetails.push(`Product ID ${insufficient.product_id}: ${insufficient.error}`);
            } else {
              // Get product name for better error message
              const [product] = await db.query('SELECT product_name FROM products WHERE id = ?', [insufficient.product_id]);
              const productName = product[0] ? product[0].product_name : `Product ID ${insufficient.product_id}`;
              insufficientDetails.push(
                `${productName}: Available ${insufficient.available}, Required ${insufficient.required}`
              );
            }
          }
          
          const errorMessage = `Insufficient stock: ${insufficientDetails.join('; ')}`;
          console.error('❌ [BACKEND MODEL] Insufficient stock for order');
          console.error('   Details:', errorMessage);
          
          throw new Error(errorMessage);
        }
        
        console.log('✅ [BACKEND MODEL] Stock availability validated - all items available');
      } catch (error) {
        console.error('❌ [BACKEND MODEL] Stock validation failed:', error.message);
        throw error;
      }
    }

    const connection = await db.getConnection();
    console.log('🔍 [BACKEND MODEL] Database connection obtained');
    
    try {
      console.log('🔍 [BACKEND MODEL] Starting transaction...');
      await connection.beginTransaction();
      console.log('✅ [BACKEND MODEL] Transaction started successfully');

      // Declare variables outside try blocks so they're accessible later
      let order_number;
      let mysqlOrderDate;
      let orderResult;

      // Generate order number if not provided (pass order_date AND salesman_id for unique numbering)
      console.log('🔍 [BACKEND MODEL] Generating order number for:');
      console.log('   📅 Date:', order_date);
      console.log('   👤 Salesman ID:', salesman_id);
      try {
        order_number = orderData.order_number || await this.generateOrderNumber(order_date, salesman_id);
        console.log('✅ [BACKEND MODEL] Order number generated:', order_number);
      } catch (genError) {
        console.error('❌ [BACKEND MODEL] Failed to generate order number:', genError);
        throw new Error(`Order number generation failed: ${genError.message}`);
      }

      // Convert ISO datetime to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      console.log('🔍 [BACKEND MODEL] Converting datetime:', order_date);
      try {
        mysqlOrderDate = new Date(order_date).toISOString().slice(0, 19).replace('T', ' ');
        console.log('✅ [BACKEND MODEL] Converted datetime:', order_date, '->', mysqlOrderDate);
      } catch (dateError) {
        console.error('❌ [BACKEND MODEL] Failed to convert date:', dateError);
        throw new Error(`Date conversion failed: ${dateError.message}`);
      }

      // Insert order
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [BACKEND MODEL] Preparing to INSERT into orders table...');
      console.log('🔍 [BACKEND MODEL] Validating SQL Parameters:');
      const insertParams = [order_number, salesman_id, shop_id, route_id, mysqlOrderDate, total_amount, discount, net_amount, status, notes];
      console.log('🔍 [BACKEND MODEL] Parameter 1 (order_number):', order_number, typeof order_number);
      console.log('🔍 [BACKEND MODEL] Parameter 2 (salesman_id):', salesman_id, typeof salesman_id);
      console.log('🔍 [BACKEND MODEL] Parameter 3 (shop_id):', shop_id, typeof shop_id);
      console.log('🔍 [BACKEND MODEL] Parameter 4 (route_id):', route_id, typeof route_id);
      console.log('🔍 [BACKEND MODEL] Parameter 5 (order_date):', mysqlOrderDate, typeof mysqlOrderDate);
      console.log('🔍 [BACKEND MODEL] Parameter 6 (total_amount):', total_amount, typeof total_amount);
      console.log('🔍 [BACKEND MODEL] Parameter 7 (discount):', discount, typeof discount);
      console.log('🔍 [BACKEND MODEL] Parameter 8 (net_amount):', net_amount, typeof net_amount);
      console.log('🔍 [BACKEND MODEL] Parameter 9 (status):', status, typeof status);
      console.log('🔍 [BACKEND MODEL] Parameter 10 (notes):', notes, typeof notes);
      
      console.log('🔍 [BACKEND MODEL] Executing INSERT query...');
      try {
        [orderResult] = await connection.query(
          `INSERT INTO orders 
           (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          insertParams
        );
        console.log('✅ [BACKEND MODEL] INSERT query executed successfully');
        console.log('🔍 [BACKEND MODEL] Insert result:', JSON.stringify(orderResult, null, 2));
      } catch (insertError) {
        console.error('❌❌❌ [BACKEND MODEL] INSERT FAILED ❌❌❌');
        console.error('🔍 [BACKEND MODEL] Insert error code:', insertError.code);
        console.error('🔍 [BACKEND MODEL] Insert error errno:', insertError.errno);
        console.error('🔍 [BACKEND MODEL] Insert error message:', insertError.message);
        console.error('🔍 [BACKEND MODEL] Insert error SQL:', insertError.sql);
        console.error('🔍 [BACKEND MODEL] Parameters that caused error:', insertParams);
        throw insertError;
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const orderId = orderResult.insertId;
      console.log('✅ [BACKEND MODEL] Order inserted with ID:', orderId);

      // Insert order details
      if (items && items.length > 0) {
        console.log(`\n🔍 [BACKEND MODEL] Preparing to insert ${items.length} order items...`);
        try {
          const detailValues = items.map((item, index) => {
            console.log(`🔍 [BACKEND MODEL] Validating Item ${index + 1}:`, JSON.stringify(item));
            
            // Validate item
            if (!item.product_id) {
              throw new Error(`Item ${index + 1}: product_id is required`);
            }
            if (!item.quantity) {
              throw new Error(`Item ${index + 1}: quantity is required`);
            }
            if (item.unit_price === undefined || item.unit_price === null) {
              throw new Error(`Item ${index + 1}: unit_price is required`);
            }
            
            return [
              orderId,
              item.product_id,
              item.quantity,
              item.unit_price,
              item.total_price,
              item.discount || 0,
              item.net_price
            ];
          });
          
          console.log('🔍 [BACKEND MODEL] All items validated successfully');
          console.log(`🔍 [BACKEND MODEL] Executing batch INSERT for ${ORDER_DETAILS_TABLE}...`);

          const [detailResult] = await connection.query(
            `INSERT INTO ${ORDER_DETAILS_TABLE} 
             (order_id, product_id, quantity, unit_price, total_price, discount, net_price)
             VALUES ?`,
            [detailValues]
          );
          console.log('✅ [BACKEND MODEL] Order details inserted successfully');
          console.log('🔍 [BACKEND MODEL] Details insert result:', JSON.stringify(detailResult, null, 2));
        } catch (detailError) {
          console.error('❌❌❌ [BACKEND MODEL] ORDER DETAILS INSERT FAILED ❌❌❌');
          console.error('🔍 [BACKEND MODEL] Detail error:', detailError.message);
          console.error('🔍 [BACKEND MODEL] Detail error code:', detailError.code);
          console.error('🔍 [BACKEND MODEL] Detail error SQL:', detailError.sql);
          throw detailError;
        }
      } else {
        console.log('⚠️  [BACKEND MODEL] No items to insert');
      }

      console.log('\n🔍 [BACKEND MODEL] Reserving stock for order BEFORE committing...');
      // Reserve stock INLINE within this transaction (not via stored procedure)
      // CRITICAL: Must use same connection/transaction to avoid deadlock
      // If reservation fails, entire order creation will be rolled back
      
      for (const item of items) {
        // Get current stock levels
        const [stockCheck] = await connection.query(
          'SELECT stock_quantity, product_name FROM products WHERE id = ?',
          [item.product_id]
        );
        
        if (!stockCheck || stockCheck.length === 0) {
          throw new Error(`Product ID ${item.product_id} not found`);
        }
        
        const product = stockCheck[0];
        const available = product.stock_quantity;
        
        // Double-check availability (should already be validated above, but be safe)
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.product_name}. ` +
            `Available: ${available}, Required: ${item.quantity}`
          );
        }
        
        // Stock validation passed - no reservation needed (reserved_stock column doesn't exist)
        // Stock movement logging removed (table structure mismatch)
      }
      
      // Mark order as having stock reserved
      await connection.query(
        'UPDATE orders SET stock_reserved = TRUE WHERE id = ?',
        [orderId]
      );
      
      console.log('✅ [BACKEND MODEL] Stock reserved successfully');

      console.log('\n🔍 [BACKEND MODEL] Committing transaction...');
      try {
        await connection.commit();
        console.log('✅ [BACKEND MODEL] Transaction committed successfully');
      } catch (commitError) {
        console.error('❌ [BACKEND MODEL] Failed to commit transaction:', commitError);
        throw commitError;
      }
      
      console.log('🎉 [BACKEND MODEL] ========== Order.create() complete ==========\n');

      return { id: orderId, order_number, ...orderData };
    } catch (error) {
      await connection.rollback();
      console.error('\n❌❌❌ [BACKEND MODEL] ERROR OCCURRED ❌❌❌');
      console.error('❌ [BACKEND MODEL] Transaction rolled back');
      console.error('⏰ Error timestamp:', new Date().toISOString());
      console.error('🔍 [BACKEND MODEL] Error name:', error.name);
      console.error('🔍 [BACKEND MODEL] Error message:', error.message);
      console.error('🔍 [BACKEND MODEL] Error code:', error.code);
      console.error('🔍 [BACKEND MODEL] SQL errno:', error.errno);
      console.error('🔍 [BACKEND MODEL] SQL state:', error.sqlState);
      console.error('🔍 [BACKEND MODEL] SQL message:', error.sqlMessage);
      console.error('🔍 [BACKEND MODEL] SQL query:', error.sql);
      console.error('🔍 [BACKEND MODEL] Error stack:', error.stack);
      console.error('🔍 [BACKEND MODEL] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
      throw error;
    } finally {
      connection.release();
      console.log('🔍 [BACKEND MODEL] Database connection released');
    }
  },

  /**
   * Find all orders with optional filters and pagination
   */
  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      salesman_id = '',
      shop_id = '',
      route_id = '',
      start_date = '',
      end_date = '',
      sortBy = 'order_date',
      sortOrder = 'DESC'
    } = filters;

    let query = `
      SELECT 
        o.*,
        s.salesman_code,
        s.full_name as salesman_name,
        sh.shop_name,
        sh.owner_name,
        COUNT(od.id) as items_count,
        GROUP_CONCAT(
          p.product_name || ' (' || od.quantity || ')' 
          ${useSQLite ? '' : "SEPARATOR ', '"}
        ) as products_summary
      FROM orders o
      LEFT JOIN salesmen s ON o.salesman_id = s.id
      LEFT JOIN shops sh ON o.shop_id = sh.id
      LEFT JOIN ${ORDER_DETAILS_TABLE} od ON o.id = od.order_id
      LEFT JOIN products p ON od.product_id = p.id
      WHERE 1=1
    `;

    const params = [];

    // Search filter
    if (search) {
      query += ` AND (o.order_number LIKE ? OR sh.shop_name LIKE ? OR s.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Status filter
    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    // Salesman filter
    if (salesman_id) {
      query += ` AND o.salesman_id = ?`;
      params.push(salesman_id);
    }

    // Shop filter
    if (shop_id) {
      query += ` AND o.shop_id = ?`;
      params.push(shop_id);
    }

    // Date range filter
    if (start_date) {
      query += ` AND DATE(o.order_date) >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(o.order_date) <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY o.id`;

    // Sorting
    const allowedSortFields = ['order_date', 'order_number', 'net_amount', 'status', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'order_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY o.${sortField} ${order}`;

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT o.id) as total FROM orders o 
                        LEFT JOIN shops sh ON o.shop_id = sh.id 
                        LEFT JOIN salesmen s ON o.salesman_id = s.id
                        WHERE 1=1 ${query.split('WHERE 1=1')[1].split('GROUP BY')[0]}`;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [orders] = await db.query(query, params);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Find order by ID with details
   */
  async findById(id) {
    const [orders] = await db.query(
      `SELECT 
        o.*,
        s.salesman_code,
        s.full_name as salesman_name,
        s.phone as salesman_phone,
        sh.shop_name,
        sh.owner_name,
        sh.phone as shop_phone,
        sh.address as shop_address
      FROM orders o
      LEFT JOIN salesmen s ON o.salesman_id = s.id
      LEFT JOIN shops sh ON o.shop_id = sh.id
      WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Get order details
    const [details] = await db.query(
      `SELECT 
        od.*,
        p.product_name,
        p.product_code,
        p.category,
        p.pieces_per_carton
      FROM ${ORDER_DETAILS_TABLE} od
      LEFT JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?`,
      [id]
    );

    order.items = details;

    return order;
  },

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber) {
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    return orders.length > 0 ? orders[0] : null;
  },

  /**
   * Get orders by salesman
   */
  async findBySalesman(salesmanId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status = '',
      start_date = '',
      end_date = ''
    } = filters;

    let query = `
      SELECT 
        o.*,
        sh.shop_name,
        sh.owner_name,
        COUNT(od.id) as items_count
      FROM orders o
      LEFT JOIN shops sh ON o.shop_id = sh.id
      LEFT JOIN ${ORDER_DETAILS_TABLE} od ON o.id = od.order_id
      WHERE o.salesman_id = ?
    `;

    const params = [salesmanId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND DATE(o.order_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(o.order_date) <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY o.id ORDER BY o.order_date DESC`;

    // Get total count
    const countQuery = query.replace('SELECT o.*, sh.shop_name, sh.owner_name, COUNT(od.id) as items_count', 'SELECT COUNT(DISTINCT o.id) as total')
                           .split('GROUP BY')[0];
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [orders] = await db.query(query, params);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Update order status
   */
  async updateStatus(id, status, notes = '') {
    const [result] = await db.query(
      `UPDATE orders 
       SET status = ?, notes = CONCAT(COALESCE(notes, ''), '\n', ?), updated_at = NOW()
       WHERE id = ?`,
      [status, notes, id]
    );

    return result.affectedRows > 0;
  },

  /**
   * Update order
   */
  async update(id, updateData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        shop_id,
        route_id,
        total_amount,
        discount,
        net_amount,
        status,
        notes,
        items
      } = updateData;

      // Update order fields
      const fields = [];
      const values = [];

      if (shop_id !== undefined) {
        fields.push('shop_id = ?');
        values.push(shop_id);
      }
      if (route_id !== undefined) {
        fields.push('route_id = ?');
        values.push(route_id);
      }
      if (total_amount !== undefined) {
        fields.push('total_amount = ?');
        values.push(total_amount);
      }
      if (discount !== undefined) {
        fields.push('discount = ?');
        values.push(discount);
      }
      if (net_amount !== undefined) {
        fields.push('net_amount = ?');
        values.push(net_amount);
      }
      if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        values.push(notes);
      }

      if (fields.length > 0) {
        fields.push('updated_at = NOW()');
        values.push(id);

        await connection.query(
          `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await connection.query(`DELETE FROM ${ORDER_DETAILS_TABLE} WHERE order_id = ?`, [id]);

        // Insert updated items
        if (items.length > 0) {
          const itemValues = items.map(item => [
            id,
            item.product_id,
            item.quantity,
            item.unit_price,
            item.discount || 0,
            item.total_price,
            item.net_price
          ]);

          await connection.query(
            `INSERT INTO ${ORDER_DETAILS_TABLE} 
             (order_id, product_id, quantity, unit_price, discount, total_price, net_price)
             VALUES ?`,
            [itemValues]
          );
        }
      }

      await connection.commit();
      connection.release();

      return await this.findById(id);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  },

  /**
   * Delete order (soft delete by changing status)
   */
  async delete(id) {
    const [result] = await db.query(
      `DELETE FROM orders WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  },

  /**
   * Get order statistics
   */
  async getStatistics(filters = {}) {
    const {
      salesman_id = '',
      start_date = '',
      end_date = ''
    } = filters;

    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'placed' THEN 1 ELSE 0 END) as placed_orders,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_orders,
        SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_orders,
        SUM(CASE WHEN status IN ('finalized', 'delivered') THEN net_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status IN ('finalized', 'delivered') THEN net_amount ELSE NULL END) as average_order_value
      FROM orders
      WHERE 1=1
    `;

    const params = [];

    if (salesman_id) {
      query += ` AND salesman_id = ?`;
      params.push(salesman_id);
    }

    if (start_date) {
      query += ` AND DATE(order_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(order_date) <= ?`;
      params.push(end_date);
    }

    const [stats] = await db.query(query, params);

    return stats[0];
  },

  // ========================================
  // SPRINT 6: Order Processing & Approval Methods
  // ========================================

  /**
   * Update order status with notes
   */
  async updateStatus(id, newStatus, notes = '') {
    console.log(`🔄 [MODEL] Updating order ${id} status to '${newStatus}'`);
    
    try {
      // Update order status
      await db.query(
        `UPDATE orders 
         SET status = ?, 
             notes = CONCAT(IFNULL(notes, ''), '\n[', NOW(), '] Status changed to ${newStatus}: ', ?),
             updated_at = NOW()
         WHERE id = ?`,
        [newStatus, notes, id]
      );

      // If order is rejected or cancelled, release reserved stock
      if (['rejected', 'cancelled'].includes(newStatus)) {
        console.log(`🔓 [MODEL] Releasing reserved stock for ${newStatus} order ${id}...`);
        try {
          const Product = require('./Product');
          await Product.releaseReservedStock(id, null);
          console.log(`✅ [MODEL] Reserved stock released for order ${id}`);
        } catch (stockError) {
          console.error(`⚠️  [MODEL] Failed to release stock for order ${id}:`, stockError.message);
          // Continue even if stock release fails - can be handled manually
        }
      }

      console.log(`✅ [MODEL] Order ${id} status updated to '${newStatus}'`);
      return await this.findById(id);
    } catch (error) {
      console.error('❌ [MODEL] Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Check stock availability for all items in an order
   * Returns detailed stock information for each product
   */
  async checkStockAvailability(orderId) {
    console.log(`📦 [MODEL] Checking stock availability for order ${orderId}`);

    const [items] = await db.query(
      `SELECT 
        od.product_id,
        od.quantity as order_quantity,
        p.product_name,
        p.product_code,
        p.stock_quantity as available_stock,
        p.reorder_level,
        (p.stock_quantity >= od.quantity) as is_available,
        (p.stock_quantity - od.quantity) as remaining_stock,
        CASE
          WHEN p.stock_quantity < od.quantity THEN 'INSUFFICIENT'
          WHEN (p.stock_quantity - od.quantity) <= p.reorder_level THEN 'LOW_STOCK_WARNING'
          ELSE 'AVAILABLE'
        END as stock_status
      FROM ${ORDER_DETAILS_TABLE} od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?`,
      [orderId]
    );

    const insufficientItems = items.filter(item => !item.is_available);
    const lowStockWarnings = items.filter(item => item.stock_status === 'LOW_STOCK_WARNING');

    const result = {
      available: insufficientItems.length === 0,
      items: items,
      insufficientItems: insufficientItems,
      lowStockWarnings: lowStockWarnings,
      allItemsAvailable: insufficientItems.length === 0,
      hasLowStockWarnings: lowStockWarnings.length > 0
    };

    console.log(`📊 [MODEL] Stock check result:`, {
      totalItems: items.length,
      insufficientCount: insufficientItems.length,
      lowStockWarningCount: lowStockWarnings.length,
      available: result.available
    });

    return result;
  },

  /**
   * Finalize order and deduct stock (using reserved stock procedure)
   * This is a transactional operation - either all stock is deducted or none
   */
  async finalizeOrder(orderId, notes = '') {
    console.log(`🏁 [MODEL] Finalizing order ${orderId}...`);

    try {
      // Use the stored procedure to deduct stock
      const Product = require('./Product');
      await Product.deductStock(orderId, null);
      
      console.log(`📦 [MODEL] Stock deducted successfully`);

      // Update order status to finalized
      await db.query(
        `UPDATE orders 
         SET status = 'finalized',
             notes = CONCAT(IFNULL(notes, ''), '\n[', NOW(), '] Order finalized: ', ?),
             updated_at = NOW()
         WHERE id = ?`,
        [notes || 'Order finalized and stock deducted', orderId]
      );

      console.log(`✅ [MODEL] Order ${orderId} finalized successfully`);
      return await this.findById(orderId);
    } catch (error) {
      console.error('❌ [MODEL] Error finalizing order:', error);
      throw error;
    }
  }
};

module.exports = Order;
