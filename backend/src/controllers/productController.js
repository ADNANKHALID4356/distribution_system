/**
 * Product Controller
 * Handles all business logic for product operations
 */

const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/desktop/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, brand, company_name, stock_level, is_active } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      category,
      brand,
      company_name,
      stock_level, // New: in_stock, low_stock, out_of_stock
      is_active: is_active !== undefined ? is_active === 'true' : null
    };
    
    const result = await Product.findAll(options);
    
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/desktop/products/:id
// @access  Private
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/desktop/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const {
      product_code,
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      description,
      is_active
    } = req.body;
    
    // Validation
    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    if (!unit_price || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }
    
    // Generate product code if not provided
    let finalProductCode = product_code;
    if (!finalProductCode) {
      finalProductCode = await Product.generateProductCode();
    } else {
      // Check if product code already exists
      const exists = await Product.productCodeExists(finalProductCode);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Product code already exists'
        });
      }
    }
    
    // Check if barcode already exists
    if (barcode) {
      const barcodeProduct = await Product.findByBarcode(barcode);
      if (barcodeProduct) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists for another product'
        });
      }
    }
    
    const productData = {
      product_code: finalProductCode,
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      description,
      is_active,
      created_by: req.user.id
    };
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/desktop/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const {
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      description,
      is_active
    } = req.body;
    
    // Validation
    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    if (!unit_price || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }
    
    // Check if barcode already exists for another product
    if (barcode && barcode !== existingProduct.barcode) {
      const barcodeProduct = await Product.findByBarcode(barcode);
      if (barcodeProduct && barcodeProduct.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists for another product'
        });
      }
    }
    
    const productData = {
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      description,
      is_active
    };
    
    const product = await Product.update(id, productData);
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Add stock endpoint that does not require full product fields
exports.addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { add_quantity } = req.body;

    if (add_quantity === undefined || add_quantity === null || Number.isNaN(Number(add_quantity))) {
      return res.status(400).json({
        success: false,
        message: 'add_quantity is required and must be a number'
      });
    }

    const delta = parseFloat(add_quantity);
    if (delta <= 0) {
      return res.status(400).json({
        success: false,
        message: 'add_quantity must be greater than 0'
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const newStock = (existingProduct.stock_quantity || 0) + delta;

    const updatedProduct = await Product.updateStock(id, newStock);
    res.json({
      success: true,
      message: 'Product stock updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding stock',
      error: error.message
    });
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/desktop/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await Product.softDelete(id);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// @desc    Get active products
// @route   GET /api/shared/products/active
// @access  Private
exports.getActiveProducts = async (req, res) => {
  try {
    const products = await Product.findActive();
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get active products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active products',
      error: error.message
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/desktop/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.findLowStock();
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products',
      error: error.message
    });
  }
};

// @desc    Get categories
// @route   GET /api/desktop/products/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get brands
// @route   GET /api/desktop/products/brands
// @access  Private
exports.getBrands = async (req, res) => {
  try {
    const brands = await Product.getBrands();
    
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands',
      error: error.message
    });
  }
};

// @desc    Get companies
// @route   GET /api/desktop/products/companies
// @access  Private
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Product.getCompanies();
    
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
};

// @desc    Bulk import products (CSV/Excel)
// @route   POST /api/desktop/products/bulk
// @access  Private (Admin only)
exports.bulkImportProducts = async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }
    
    const results = {
      success: [],
      errors: []
    };
    
    for (let i = 0; i < products.length; i++) {
      try {
        const productData = products[i];
        
        // Generate product code if not provided
        if (!productData.product_code) {
          productData.product_code = await Product.generateProductCode();
        }
        
        // Check if product code already exists
        const exists = await Product.productCodeExists(productData.product_code);
        if (exists) {
          results.errors.push({
            row: i + 1,
            product_code: productData.product_code,
            message: 'Product code already exists'
          });
          continue;
        }
        
        productData.created_by = req.user.id;
        const product = await Product.create(productData);
        
        results.success.push({
          row: i + 1,
          product_code: product.product_code,
          product_name: product.product_name
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Imported ${results.success.length} of ${products.length} products`,
      data: results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing products',
      error: error.message
    });
  }
};

// @desc    Get warehouse stock breakdown for a product
// @route   GET /api/desktop/products/:id/warehouse-stock
// @access  Private
exports.getProductWarehouseStock = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const warehouseStock = await Product.getWarehouseStock(productId);
    
    // Calculate totals
    const totals = {
      totalWarehouses: warehouseStock.length,
      totalQuantity: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.quantity || 0), 0),
      totalReserved: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.reserved_quantity || 0), 0),
      totalAvailable: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.available_quantity || 0), 0)
    };
    
    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          product_code: product.product_code,
          product_name: product.product_name,
          global_stock: product.stock_quantity
        },
        warehouseStock,
        totals
      }
    });
  } catch (error) {
    console.error('Get product warehouse stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouse stock',
      error: error.message
    });
  }
};
