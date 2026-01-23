/**
 * Order Service
 * Sprint 5: Order Management System
 * 
 * Purpose: Handle order business logic, calculations, and backend sync
 * Used by: Mobile screens for order creation and management
 */

import dbHelper from '../database/dbHelper';
import api from './api';
import { ORDER_STATUS } from '../database/schema';

class OrderService {
  /**
   * Calculate order totals
   */
  calculateOrderTotals(items, discountPercentage = 0) {
    let subtotal = 0;
    
    // Calculate subtotal from items
    items.forEach(item => {
      subtotal += item.total_price;
    });
    
    // Calculate discount
    const discountAmount = (subtotal * discountPercentage) / 100;
    
    // Calculate total
    const totalAmount = subtotal - discountAmount;
    
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_percentage: parseFloat(discountPercentage.toFixed(2)),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      tax_amount: 0, // No tax for now
      total_amount: parseFloat(totalAmount.toFixed(2))
    };
  }

  /**
   * Calculate item total price
   */
  calculateItemTotal(quantity, unitPrice, discountAmount = 0) {
    const total = (quantity * unitPrice) - discountAmount;
    return parseFloat(total.toFixed(2));
  }

  /**
   * Create draft order
   */
  async createDraftOrder(salesmanId, salesmanName, shopId, shopName, routeId, routeName) {
    try {
      const orderData = {
        salesman_id: salesmanId,
        salesman_name: salesmanName,
        shop_id: shopId,
        shop_name: shopName,
        route_id: routeId,
        route_name: routeName,
        order_date: new Date().toISOString(),
        status: ORDER_STATUS.DRAFT,
        subtotal: 0,
        discount_amount: 0,
        discount_percentage: 0,
        tax_amount: 0,
        total_amount: 0,
        notes: ''
      };
      
      const result = await dbHelper.createOrder(orderData);
      console.log('✅ Draft order created:', result.order_number);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add item to order
   */
  async addItemToOrder(orderId, productId, productCode, productName, quantity, unitPrice) {
    try {
      const totalPrice = this.calculateItemTotal(quantity, unitPrice);
      
      const item = {
        product_id: productId,
        product_code: productCode,
        product_name: productName,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        discount_amount: 0
      };
      
      await dbHelper.addOrderDetails(orderId, [item]);
      console.log('✅ Item added to order:', productName);
      
      return item;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update order with items and totals
   */
  async updateOrderWithItems(orderId, items, discountPercentage = 0, notes = '') {
    try {
      // Calculate totals
      const totals = this.calculateOrderTotals(items, discountPercentage);
      
      // Update order totals
      await dbHelper.updateOrderTotals(orderId, totals);
      
      // Update notes if provided
      if (notes) {
        const order = await dbHelper.getOrderById(orderId);
        order.notes = notes;
      }
      
      console.log('✅ Order updated with items and totals');
      return totals;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finalize order (change status from draft to placed)
   */
  async finalizeOrder(orderId, notes = '') {
    try {
      console.log(`\n🔍 [MOBILE ORDER] Finalizing order ID: ${orderId}`);
      await dbHelper.updateOrderStatus(orderId, ORDER_STATUS.PLACED, notes);
      console.log(`✅ [MOBILE ORDER] Order finalized (status: placed)`);
      
      // Get the finalized order details
      const order = await dbHelper.getOrderById(orderId);
      console.log('🔍 [MOBILE ORDER] Finalized order details:', JSON.stringify(order, null, 2));
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get order with details
   */
  async getOrderById(orderId) {
    try {
      const order = await dbHelper.getOrderById(orderId);
      return order;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get orders by shop
   * @param {number} shopId - Shop ID
   * @param {string} status - Order status filter
   * @param {number} salesmanId - Current salesman's ID for filtering (multi-tenancy)
   */
  async getOrdersByShop(shopId, status = null, salesmanId = null) {
    try {
      const orders = await dbHelper.getOrdersByShop(shopId, status, salesmanId);
      return orders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get draft orders
   * @param {number} salesmanId - Current salesman's ID for filtering (multi-tenancy)
   */
  async getDraftOrders(salesmanId = null) {
    try {
      const orders = await dbHelper.getDraftOrders(salesmanId);
      return orders;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete order
   */
  async deleteOrder(orderId) {
    try {
      await dbHelper.deleteOrder(orderId);
      console.log('✅ Order deleted');
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync orders to backend
   * @param {number} salesmanId - Current salesman's ID for filtering (multi-tenancy)
   */
  async syncOrdersToBackend(salesmanId = null) {
    try {
      console.log('\n🔍 [MOBILE SYNC] ========== Starting Order Sync ==========');
      if (salesmanId) {
        console.log(`🔍 [MOBILE SYNC] Filtering by Salesman ID: ${salesmanId}`);
      }
      
      // Get unsynced orders for this salesman only
      const orders = await dbHelper.getUnsyncedOrders(salesmanId);
      console.log(`🔍 [MOBILE SYNC] Found ${orders.length} unsynced orders in SQLite`);
      
      if (orders.length === 0) {
        console.log('✅ [MOBILE SYNC] No orders to sync');
        return { success: true, synced: 0 };
      }
      
      console.log(`📤 [MOBILE SYNC] Syncing ${orders.length} orders to backend...`);
      
      let syncedCount = 0;
      const errors = [];
      
      for (const order of orders) {
        try {
          console.log(`\n🔍 [MOBILE SYNC] Processing Order #${order.order_number}`);
          console.log(`🔍 [MOBILE SYNC] Order ID: ${order.id}, Shop: ${order.shop_id}, Salesman: ${order.salesman_id}`);
          console.log(`🔍 [MOBILE SYNC] Items count: ${order.items?.length || 0}`);
          
          // Prepare order data for backend
          const orderData = {
            salesman_id: order.salesman_id,
            shop_id: order.shop_id,
            route_id: order.route_id,
            order_date: order.order_date,
            status: order.status,
            subtotal: order.subtotal,
            discount_amount: order.discount_amount,
            discount_percentage: order.discount_percentage,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            notes: order.notes,
            items: order.items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              discount_amount: item.discount_amount
            }))
          };
          
          console.log('🔍 [MOBILE SYNC] Order data prepared:', JSON.stringify(orderData, null, 2));
          console.log('🔍 [MOBILE SYNC] Sending POST request to /shared/orders...');
          
          // Send to backend
          const response = await api.post('/shared/orders', orderData);
          
          console.log('🔍 [MOBILE SYNC] Backend response status:', response.status);
          console.log('🔍 [MOBILE SYNC] Backend response data:', JSON.stringify(response.data, null, 2));
          
          if (response.data.success) {
            // Mark as synced
            console.log(`🔍 [MOBILE SYNC] Marking order as synced in SQLite. Backend ID: ${response.data.data.id}`);
            await dbHelper.markOrderSynced(order.id, response.data.data.id);
            syncedCount++;
            console.log(`✅ [MOBILE SYNC] Order ${order.order_number} synced successfully`);
          } else {
            // Backend returned success:false
            errors.push({
              order_number: order.order_number,
              error: 'Backend returned success:false'
            });
          }
        } catch (error) {
          // Sync error - will be retried automatically
          errors.push({
            order_number: order.order_number,
            error: error.message
          });
        }
      }
      
      console.log(`\n✅ [MOBILE SYNC] Synced ${syncedCount}/${orders.length} orders`);
      console.log('🔍 [MOBILE SYNC] ========== Sync Complete ==========\n');
      
      return {
        success: true,
        synced: syncedCount,
        total: orders.length,
        errors: errors
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(salesmanId = null) {
    try {
      const stats = await dbHelper.getOrderStats(salesmanId);
      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Format currency (PKR)
   */
  formatCurrency(amount) {
    return `Rs. ${parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      [ORDER_STATUS.DRAFT]: '#6B7280', // gray
      [ORDER_STATUS.PLACED]: '#3B82F6', // blue
      [ORDER_STATUS.APPROVED]: '#8B5CF6', // purple
      [ORDER_STATUS.FINALIZED]: '#10B981', // green
      [ORDER_STATUS.REJECTED]: '#EF4444', // red
      [ORDER_STATUS.DELIVERED]: '#059669', // dark green
    };
    return colors[status] || '#6B7280';
  }

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      [ORDER_STATUS.DRAFT]: 'Draft',
      [ORDER_STATUS.PLACED]: 'Placed',
      [ORDER_STATUS.APPROVED]: 'Approved',
      [ORDER_STATUS.FINALIZED]: 'Finalized',
      [ORDER_STATUS.REJECTED]: 'Rejected',
      [ORDER_STATUS.DELIVERED]: 'Delivered',
    };
    return labels[status] || status;
  }
}

// Export singleton instance
const orderService = new OrderService();
export default orderService;
