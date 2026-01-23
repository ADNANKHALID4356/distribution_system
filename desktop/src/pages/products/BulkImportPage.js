import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const BulkImportPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState([]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
      
      // Read and preview file
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const previewData = lines.slice(1, 6).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        });
        setPreview(previewData);
      };
      reader.readAsText(selectedFile);
    }
  };

  // Parse CSV to products array
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const products = lines.slice(1).map(line => {
      const values = line.split(',');
      const product = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        
        // Map CSV headers to product fields
        switch (header.toLowerCase()) {
          case 'product_name':
          case 'name':
            product.product_name = value;
            break;
          case 'category':
            product.category = value;
            break;
          case 'brand':
            product.brand = value;
            break;
          case 'pack_size':
            product.pack_size = value;
            break;
          case 'unit_price':
          case 'price':
            product.unit_price = value ? parseFloat(value) : null;
            break;
          case 'carton_price':
            product.carton_price = value ? parseFloat(value) : null;
            break;
          case 'purchase_price':
            product.purchase_price = value ? parseFloat(value) : null;
            break;
          case 'pieces_per_carton':
            product.pieces_per_carton = value ? parseInt(value) : null;
            break;
          case 'stock_quantity':
          case 'stock':
            product.stock_quantity = value ? parseInt(value) : 0;
            break;
          case 'reorder_level':
            product.reorder_level = value ? parseInt(value) : 0;
            break;
          case 'supplier_id':
            product.supplier_id = value ? parseInt(value) : null;
            break;
          case 'barcode':
            product.barcode = value;
            break;
          case 'description':
            product.description = value;
            break;
          case 'is_active':
          case 'active':
            product.is_active = value.toLowerCase() === 'true' || value === '1';
            break;
          default:
            break;
        }
      });
      return product;
    });
    
    return products.filter(p => p.product_name); // Only include rows with product name
  };

  // Handle import
  const handleImport = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Read file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const products = parseCSV(text);
        
        if (products.length === 0) {
          setError('No valid products found in the file');
          setLoading(false);
          return;
        }

        // Send to API
        const response = await productService.bulkImportProducts(products);
        
        if (response.success) {
          setResults(response.data);
        } else {
          setError(response.message || 'Import failed');
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err.message || 'Import failed');
      setLoading(false);
    }
  };

  // Download sample CSV
  const downloadSample = () => {
    const sample = `product_name,category,brand,pack_size,unit_price,carton_price,stock_quantity,reorder_level,supplier_id,barcode,description,is_active
Coca Cola,Beverages,Coca Cola,330ml,50,480,100,20,1,8000123456,Refreshing cola drink,true
Lays Chips,Snacks,Lays,50g,30,720,150,30,2,8000234567,Crispy potato chips,true
Fresh Milk,Dairy,Nestle,1 Liter,150,1440,50,10,3,8000345678,Fresh full cream milk,true`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/products')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Import Products</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Import multiple products from a CSV file
                </p>
              </div>
            </div>
            <button
              onClick={downloadSample}
              className="inline-flex items-center px-4 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Download Sample CSV
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select CSV File</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-primary-600 hover:text-primary-500">
                  {file ? file.name : 'Choose a CSV file'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              CSV file with product details. Max file size: 10MB
            </p>
          </div>

          {file && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleImport}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {preview.length > 0 && !results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview (First 5 rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
            
            <div className="mb-4 flex items-center space-x-4">
              <div className="flex items-center text-green-600">
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">{results.success} Successful</span>
              </div>
              <div className="flex items-center text-red-600">
                <XCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">{results.failed} Failed</span>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">Errors:</h3>
                <div className="space-y-2">
                  {results.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 rounded p-3">
                      <p className="text-sm text-red-800">
                        <span className="font-medium">Row {error.row}:</span> {error.message}
                      </p>
                      {error.productName && (
                        <p className="text-xs text-red-600 mt-1">
                          Product: {error.productName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setFile(null);
                  setResults(null);
                  setPreview([]);
                }}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Import Another File
              </button>
              <button
                onClick={() => navigate('/products')}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                View Products
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CSV Format Instructions</h2>
          <div className="prose text-sm text-gray-600">
            <ul className="space-y-2">
              <li><strong>Required columns:</strong> product_name, unit_price</li>
              <li><strong>Optional columns:</strong> category, brand, pack_size, carton_price, purchase_price, pieces_per_carton, stock_quantity, reorder_level, supplier_id, barcode, description, is_active</li>
              <li><strong>Format:</strong> First row must be headers, followed by data rows</li>
              <li><strong>Numeric fields:</strong> Use numbers without currency symbols (e.g., 50, not Rs. 50)</li>
              <li><strong>Boolean fields:</strong> Use true/false or 1/0 for is_active</li>
              <li><strong>Product codes:</strong> Will be auto-generated if not provided</li>
              <li><strong>Supplier ID:</strong> Must match an existing supplier ID in the system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportPage;
