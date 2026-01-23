import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import salesmanService from '../../services/salesmanService';
import './SalesmanListingPage.css';

function SalesmanListingPage() {
  const navigate = useNavigate();
  const [salesmen, setSalesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, cities: 0 });
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cities, setCities] = useState([]);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    name: '',
    isPermanent: false
  });

  // Credential management modal states
  const [credentialModal, setCredentialModal] = useState({
    show: false,
    username: '',
    password: '',
    message: '',
    salesmanName: ''
  });

  const [resetPasswordModal, setResetPasswordModal] = useState({
    show: false,
    salesmanId: null,
    salesmanName: '',
    newPassword: '',
    showResult: false,
    resultUsername: '',
    resultPassword: ''
  });

  useEffect(() => {
    fetchSalesmen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, cityFilter, statusFilter]);

  const fetchSalesmen = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        city: cityFilter,
        status: statusFilter
      };

      const response = await salesmanService.getAllSalesmen(filters);
      
      // Backend returns: { success, data: [...salesmen], pagination: {...} }
      const salesmenData = response.data || [];
      const paginationData = response.pagination || { total: 0, page: 1, totalPages: 1 };
      
      setSalesmen(salesmenData);
      
      // Extract unique cities for filter dropdown
      const uniqueCities = [...new Set(salesmenData.map(s => s.city).filter(Boolean))];
      setCities(uniqueCities);
      
      setStats({
        total: paginationData.total,
        active: salesmenData.filter(s => s.is_active === 1).length,
        inactive: salesmenData.filter(s => s.is_active === 0).length
      });
      setCurrentPage(paginationData.page || currentPage);
      setTotalPages(paginationData.totalPages || 1);
      
    } catch (err) {
      setError('Failed to fetch salesmen: ' + (err.message || 'Unknown error'));
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete - Two-step process
  const handleDelete = async (id, name, isActive) => {
    if (isActive === 1) {
      // First click: Soft delete (mark as inactive)
      if (window.confirm(`Mark "${name}" as inactive?\n\nClick delete again on inactive salesman to permanently remove from database.`)) {
        try {
          await salesmanService.deleteSalesman(id);
          fetchSalesmen();
        } catch (err) {
          setError('Failed to deactivate salesman');
          console.error('Delete error:', err);
        }
      }
    } else {
      // Second click: Show permanent delete confirmation
      setDeleteModal({
        show: true,
        id,
        name,
        isPermanent: true
      });
    }
  };

  // Confirm permanent delete
  const confirmPermanentDelete = async () => {
    try {
      await salesmanService.permanentDeleteSalesman(deleteModal.id);
      alert(`✓ "${deleteModal.name}" has been permanently deleted from the database.`);
      setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
      
      // Reset to page 1 if current page becomes empty
      if (salesmen.length === 1 && currentPage > 1) {
        setCurrentPage(1);
      } else {
        fetchSalesmen();
      }
    } catch (err) {
      setError('Failed to permanently delete salesman');
      console.error('Permanent delete error:', err);
      setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteModal({ show: false, id: null, name: '', isPermanent: false });
  };

  // Handle view credentials
  const handleViewCredentials = async (id, name) => {
    try {
      const response = await salesmanService.getCredentials(id);
      const data = response.data || response;
      setCredentialModal({
        show: true,
        username: data.username || '',
        password: data.password || '',
        message: data.message || '',
        salesmanName: name
      });
    } catch (err) {
      alert('Failed to retrieve credentials: ' + (err.message || 'Unknown error'));
      console.error('Get credentials error:', err);
    }
  };

  // Close credential modal
  const closeCredentialModal = () => {
    setCredentialModal({
      show: false,
      username: '',
      password: '',
      message: '',
      salesmanName: ''
    });
  };

  // Copy to clipboard with fallback
  const copyToClipboard = (text, label) => {
    // Check if text is valid
    if (!text || text.trim() === '') {
      alert(`❌ No ${label} to copy`);
      return;
    }

    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          alert(`✓ ${label} copied to clipboard!`);
        })
        .catch((err) => {
          console.error('Clipboard API failed:', err);
          fallbackCopyToClipboard(text, label);
        });
    } else {
      // Fallback for older browsers
      fallbackCopyToClipboard(text, label);
    }
  };

  // Fallback copy method using textarea
  const fallbackCopyToClipboard = (text, label) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert(`✓ ${label} copied to clipboard!`);
      } else {
        alert(`❌ Failed to copy ${label}. Please copy manually.`);
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      alert(`❌ Copy failed. Please select and copy manually: ${text}`);
    }
    
    document.body.removeChild(textarea);
  };

  // Handle reset password
  const handleResetPassword = (id, name) => {
    setResetPasswordModal({
      show: true,
      salesmanId: id,
      salesmanName: name,
      newPassword: '',
      showResult: false,
      resultUsername: '',
      resultPassword: ''
    });
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordModal(prev => ({ ...prev, newPassword: password }));
  };

  // Submit password reset
  const submitPasswordReset = async () => {
    if (!resetPasswordModal.newPassword || resetPasswordModal.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await salesmanService.resetPassword(
        resetPasswordModal.salesmanId,
        resetPasswordModal.newPassword
      );
      
      const data = response.data || response;
      setResetPasswordModal(prev => ({
        ...prev,
        showResult: true,
        resultUsername: data.username || '',
        resultPassword: data.new_password || data.password || ''
      }));
    } catch (err) {
      alert('Failed to reset password: ' + (err.message || 'Unknown error'));
      console.error('Reset password error:', err);
    }
  };

  // Close reset password modal
  const closeResetPasswordModal = () => {
    setResetPasswordModal({
      show: false,
      salesmanId: null,
      salesmanName: '',
      newPassword: '',
      showResult: false,
      resultUsername: '',
      resultPassword: ''
    });
  };

  // Navigation handlers
  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleAddNew = () => {
    navigate('/salesmen/add');
  };

  const handleEdit = (id) => {
    navigate(`/salesmen/edit/${id}`);
  };

  const handleViewRoutes = (id) => {
    navigate(`/salesmen/${id}/routes`);
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Filter handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleCityFilterChange = (e) => {
    setCityFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="salesman-listing-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading salesmen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="salesman-listing-page">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchSalesmen}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="salesman-listing-page">
      {/* Header with Back Button */}
      <div className="page-header">
        <div className="header-left">
          <button className="back-button" onClick={handleBack}>
            ← Back to Dashboard
          </button>
          <div className="header-title">
            <h1>Salesman Management</h1>
            <p>Manage your sales team and route assignments</p>
          </div>
        </div>
        <button className="add-button" onClick={handleAddNew}>
          + Add New Salesman
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Search</label>
            <input 
              type="text" 
              placeholder="Search by name, code, city..." 
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <div className="filter-group">
            <label>City</label>
            <select value={cityFilter} onChange={handleCityFilterChange}>
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Salesmen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.inactive}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section">
        {salesmen.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <p>No salesmen found. Add your first salesman to get started.</p>
          </div>
        ) : (
          <>
            <table className="salesmen-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>SALESMAN NAME</th>
                  <th>PHONE</th>
                  <th>CITY</th>
                  <th>MONTHLY TARGET</th>
                  <th>COMMISSION</th>
                  <th>HIRE DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {salesmen.map((salesman) => (
                  <tr key={salesman.id}>
                    <td>
                      <span className="code-badge">{salesman.salesman_code}</span>
                    </td>
                    <td>
                      <div className="name-cell">
                        <span className="salesman-name">{salesman.full_name}</span>
                        <span className="salesman-email">{salesman.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{salesman.phone}</td>
                    <td>
                      <span className="city-badge">{salesman.city}</span>
                    </td>
                    <td>PKR {Number(salesman.monthly_target || 0).toLocaleString()}</td>
                    <td>{salesman.commission_percentage}%</td>
                    <td>{new Date(salesman.hire_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${salesman.is_active === 1 ? 'status-active' : 'status-inactive'}`}>
                        {salesman.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn btn-edit" 
                          onClick={() => handleEdit(salesman.id)}
                          title="Edit"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="action-btn btn-routes" 
                          onClick={() => handleViewRoutes(salesman.id)}
                          title="Routes"
                        >
                          🗺️ Routes
                        </button>
                        <button 
                          className="action-btn btn-credentials" 
                          onClick={() => handleViewCredentials(salesman.id, salesman.full_name)}
                          title="View Credentials"
                        >
                          🔑 Credentials
                        </button>
                        <button 
                          className="action-btn btn-reset-password" 
                          onClick={() => handleResetPassword(salesman.id, salesman.full_name)}
                          title="Reset Password"
                        >
                          🔄 Reset Password
                        </button>
                        <button 
                          className="action-btn btn-delete" 
                          onClick={() => handleDelete(salesman.id, salesman.full_name, salesman.is_active)}
                          title={salesman.is_active === 1 ? "Deactivate" : "Permanently Delete"}
                        >
                          🗑️ {salesman.is_active === 1 ? 'Deactivate' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button 
                onClick={handlePreviousPage} 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">⚠️</span>
              <h2>Permanent Delete Confirmation</h2>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to <strong>permanently delete</strong> salesman:
              </p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', margin: '16px 0' }}>
                {deleteModal.name}
              </p>
              <p>
                This action <strong>CANNOT be undone</strong>. The salesman data will be completely removed from the database.
              </p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-btn btn-confirm-delete" onClick={confirmPermanentDelete}>
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credential View Modal */}
      {credentialModal.show && (
        <div className="modal-overlay" onClick={closeCredentialModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">🔑</span>
              <h2>Login Credentials</h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Credentials for: <strong>{credentialModal.salesmanName}</strong>
              </p>
              
              {credentialModal.message ? (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#fef3c7', 
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ color: '#92400e', margin: 0 }}>
                    ⚠️ {credentialModal.message}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Username:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={credentialModal.username} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(credentialModal.username, 'Username')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Password:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={credentialModal.password} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(credentialModal.password, 'Password')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#991b1b', margin: 0, fontSize: '14px' }}>
                      🔒 <strong>Security Notice:</strong> Store these credentials securely. Do not share via unsecured channels.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-btn btn-cancel" onClick={closeCredentialModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModal.show && (
        <div className="modal-overlay" onClick={closeResetPasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">🔄</span>
              <h2>Reset Password</h2>
            </div>
            <div className="modal-body">
              {!resetPasswordModal.showResult ? (
                <>
                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    Reset password for: <strong>{resetPasswordModal.salesmanName}</strong>
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      New Password (minimum 6 characters):
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.newPassword}
                        onChange={(e) => setResetPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password..."
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px'
                        }}
                      />
                      <button 
                        className="modal-btn btn-generate"
                        onClick={generateRandomPassword}
                      >
                        🎲 Generate
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                      Click "Generate" to create a strong random password
                    </p>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fbbf24',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#92400e', margin: 0, fontSize: '14px' }}>
                      ⚠️ <strong>Important:</strong> The new password will be displayed only once after reset. Make sure to save it securely.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#dcfce7', 
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ color: '#166534', margin: 0, fontWeight: 'bold' }}>
                      ✓ Password reset successful!
                    </p>
                  </div>

                  <p style={{ marginBottom: '16px', color: '#666' }}>
                    New credentials for: <strong>{resetPasswordModal.salesmanName}</strong>
                  </p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      Username:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.resultUsername} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(resetPasswordModal.resultUsername, 'Username')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                      New Password:
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={resetPasswordModal.resultPassword} 
                        readOnly 
                        style={{ 
                          flex: 1, 
                          padding: '8px', 
                          border: '1px solid #ddd', 
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9'
                        }}
                      />
                      <button 
                        className="modal-btn btn-copy"
                        onClick={() => copyToClipboard(resetPasswordModal.resultPassword, 'Password')}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fef2f2', 
                    border: '1px solid #fca5a5',
                    borderRadius: '6px'
                  }}>
                    <p style={{ color: '#991b1b', margin: 0, fontSize: '14px' }}>
                      🔒 <strong>One-Time Display:</strong> This password will not be shown again. Save it now!
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-actions">
              {!resetPasswordModal.showResult ? (
                <>
                  <button className="modal-btn btn-cancel" onClick={closeResetPasswordModal}>
                    Cancel
                  </button>
                  <button className="modal-btn btn-confirm" onClick={submitPasswordReset}>
                    Reset Password
                  </button>
                </>
              ) : (
                <button className="modal-btn btn-cancel" onClick={closeResetPasswordModal}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesmanListingPage;
