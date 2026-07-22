import React, { useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';

const format = (date, fmt) => {
  const d = new Date(date);
  if (fmt === 'MMM dd, yyyy') return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  if (fmt === 'MMM dd') return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  if (fmt === 'h:mm a') return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (fmt === 'MMMM dd, yyyy') return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  if (fmt === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
  if (fmt === 'yyyy-MM-dd HH:mm') return d.toISOString().slice(0, 16).replace('T', ' ');
  return d.toString();
};

const SellerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    searchBy: 'buyerUsername',
    searchValue: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [sortBy, setSortBy] = useState('purchaseDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState({
    carrier: '',
    trackingNumber: '',
    estimatedDelivery: '',
  });
  const [showShippingLabel, setShowShippingLabel] = useState(false);
  const [generatedLabel, setGeneratedLabel] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);
  const [showDeliveryFailModal, setShowDeliveryFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');

  const carrierOptions = [
    { value: 'USPS', label: 'USPS', days: 3 },
    { value: 'FedEx', label: 'FedEx', days: 2 },
    { value: 'UPS', label: 'UPS', days: 2 },
    { value: 'DHL', label: 'DHL Express', days: 1 },
    { value: 'Giao Hang Nhanh', label: 'Giao Hang Nhanh (GHN)', days: 3 },
    { value: 'Vietnam Post', label: 'Vietnam Post', days: 5 },
    { value: 'Viettel Post', label: 'Viettel Post', days: 3 },
    { value: 'J&T Express', label: 'J&T Express', days: 4 },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Awaiting Shipment' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const periodOptions = [
    { value: 'all', label: 'All time' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' },
  ];

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, sortBy, sortOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };

      if (filters.status !== 'all') params.status = filters.status;
      if (filters.searchValue.trim()) params.search = filters.searchValue.trim();
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await apiClient.get('/orders', { params });
      setOrders(response.data.orders || []);
      setPagination((p) => ({
        ...p,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePeriodChange = (period) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';
    if (period !== 'all' && period !== 'custom') {
      const daysAgo = parseInt(period, 10);
      startDate = format(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      endDate = format(now, 'yyyy-MM-dd');
    }
    setFilters({ ...filters, startDate, endDate });
  };

  const handleReset = () => {
    setFilters({ status: 'all', searchBy: 'buyerUsername', searchValue: '', startDate: '', endDate: '' });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders((sel) => (sel.includes(orderId) ? sel.filter((id) => id !== orderId) : [...sel, orderId]));
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) setSelectedOrders([]);
    else setSelectedOrders(orders.map((o) => o._id));
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      returned: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const a = Number(amount) || 0;
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a);
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const generateTrackingNumber = (carrier) => {
    const prefixes = {
      USPS: '9400', FedEx: '7789', UPS: '1Z', DHL: 'JD',
      'Giao Hang Nhanh': 'GHN', 'Vietnam Post': 'VNP',
      'Viettel Post': 'VTP', 'J&T Express': 'JT',
    };
    const prefix = prefixes[carrier] || 'TRK';
    const randomNum = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    return `${prefix}${randomNum}`;
  };

  const calculateEstimatedDelivery = (carrier) => {
    const info = carrierOptions.find((c) => c.value === carrier);
    const days = info?.days || 3;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const handlePurchaseShippingLabel = (order) => {
    setCurrentOrder(order);
    setShowShippingModal(true);
  };

  const handleCarrierChange = (carrier) => {
    setTrackingInfo({
      carrier,
      trackingNumber: generateTrackingNumber(carrier),
      estimatedDelivery: calculateEstimatedDelivery(carrier),
    });
  };

  const handleSubmitTracking = async () => {
    try {
      await apiClient.post(`/orders/${currentOrder._id}/shipping`, trackingInfo);
      const label = {
        orderNumber: currentOrder.orderNumber || currentOrder._id,
        trackingNumber: trackingInfo.trackingNumber,
        carrier: trackingInfo.carrier,
        estimatedDelivery: trackingInfo.estimatedDelivery,
        buyerName: currentOrder.buyerName,
        buyerAddress: currentOrder.shippingAddress,
        listingTitle: currentOrder.listingTitle,
        purchaseDate: currentOrder.purchaseDate,
      };
      setGeneratedLabel(label);
      setShowShippingModal(false);
      setShowShippingLabel(true);
      fetchOrders();
    } catch (error) {
      console.error('Error adding tracking:', error);
      alert(error.response?.data?.message || 'Failed to add tracking information');
    }
  };

  const handlePrintLabel = () => window.print();
  const handleCloseLabel = () => {
    setShowShippingLabel(false);
    setGeneratedLabel(null);
    setTrackingInfo({ carrier: '', trackingNumber: '', estimatedDelivery: '' });
  };

  const handleMarkAsShipped = async () => {
    if (selectedOrders.length === 0) return alert('Please select orders to mark as shipped');
    try {
      await Promise.all(
        selectedOrders.map((orderId) => apiClient.patch(`/orders/${orderId}/status`, { status: 'shipped' }))
      );
      alert(`${selectedOrders.length} order(s) marked as shipped!`);
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      console.error('Error marking orders as shipped:', error);
      alert(error.response?.data?.message || 'Failed to mark orders as shipped');
    }
  };

  const handleDownloadReport = async () => {
    try {
      let csv = 'Order Number,Buyer Name,Buyer Username,Status,Quantity,Item Price,Total,Purchase Date,Payment Date\n';
      orders.forEach((o) => {
        csv += `"${o.orderNumber || o._id}","${o.buyerName}","${o.buyerUsername}","${formatStatus(o.status)}",${o.pricing?.quantity || 1},${o.pricing?.itemPrice || 0},${o.pricing?.total || 0},"${format(new Date(o.purchaseDate), 'yyyy-MM-dd HH:mm')}","${o.paymentDate ? format(new Date(o.paymentDate), 'yyyy-MM-dd HH:mm') : 'N/A'}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report');
    }
  };

  const openOrderDetail = async (order) => {
    try {
      const res = await apiClient.get(`/orders/${order._id}`);
      setOrderDetail(res.data);
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Error fetching order detail:', error);
      alert('Failed to load order detail');
    }
  };

  const handleMarkDelivered = async (orderId) => {
    if (!window.confirm('Mark this order as delivered?')) return;
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: 'delivered' });
      alert('Order marked as delivered');
      setShowOrderDetail(false);
      fetchOrders();
    } catch (error) {
      console.error('Error marking delivered:', error);
      alert(error.response?.data?.message || 'Failed to mark delivered');
    }
  };

  const openDeliveryFailModal = (order) => {
    setCurrentOrder(order);
    setFailReason('');
    setShowDeliveryFailModal(true);
  };

  const handleConfirmDeliveryFail = async () => {
    if (!failReason.trim()) return alert('Please provide a reason');
    try {
      await apiClient.patch(`/orders/${currentOrder._id}/status`, { status: 'returned', sellerNotes: failReason });
      alert('Order marked as returned (delivery failed)');
      setShowDeliveryFailModal(false);
      setShowOrderDetail(false);
      fetchOrders();
    } catch (error) {
      console.error('Error marking delivery failed:', error);
      alert(error.response?.data?.message || 'Failed to mark delivery failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage your orders and shipments</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
              <select onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by</label>
              <select value={filters.searchBy} onChange={(e) => handleFilterChange('searchBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="buyerUsername">Buyer username</option>
                <option value="buyerName">Buyer name</option>
                <option value="orderNumber">Order number</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="flex gap-2">
                <input type="text" value={filters.searchValue} onChange={(e) => handleFilterChange('searchValue', e.target.value)}
                  placeholder="Search..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleReset} className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium">Reset</button>
              </div>
            </div>
          </div>
          {filters.startDate || filters.endDate ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Results: <span className="font-semibold">{pagination.total}</span> orders
              {filters.status !== 'all' && ` (${formatStatus(filters.status)})`}
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Print</button>
              <button onClick={handleDownloadReport} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Download report</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-4">
            <button onClick={handleMarkAsShipped} disabled={selectedOrders.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              Mark as Shipped
            </button>
            <div className="ml-auto">
              <span className="text-sm text-gray-600 mr-2">Sort by:</span>
              <select onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="purchaseDate-desc">Date (Newest)</option>
                <option value="purchaseDate-asc">Date (Oldest)</option>
                <option value="totalPrice-desc">Amount (High to Low)</option>
                <option value="totalPrice-asc">Amount (Low to High)</option>
                <option value="orderNumber-asc">Order Number</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input type="checkbox" checked={selectedOrders.length === orders.length} onChange={handleSelectAll} className="rounded border-gray-300" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input type="checkbox" checked={selectedOrders.includes(order._id)} onChange={() => handleSelectOrder(order._id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {order.status === 'paid' && (
                            <>
                              <div className="text-xs text-red-600 font-medium">Ready to ship</div>
                              {!order.tracking?.trackingNumber && (
                                <button onClick={() => handlePurchaseShippingLabel(order)} className="text-xs text-blue-600 hover:underline text-left">
                                  Purchase shipping label
                                </button>
                              )}
                            </>
                          )}
                          {order.status === 'shipped' && (
                            <button onClick={() => openOrderDetail(order)} className="text-xs text-blue-600 hover:underline text-left">
                              Update status
                            </button>
                          )}
                          <button onClick={() => openOrderDetail(order)} className="text-xs text-gray-600 hover:underline text-left">
                            View details
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <img src={order.listingImage || 'https://via.placeholder.com/50'} alt={order.listingTitle}
                            className="w-12 h-12 object-cover rounded" onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }} />
                          <div className="flex-1">
                            <button onClick={() => openOrderDetail(order)} className="text-sm text-blue-600 hover:underline font-medium block mb-1 text-left">
                              {order.orderNumber || `#${order._id.slice(-8).toUpperCase()}`}
                            </button>
                            <div className="text-sm text-gray-900 mb-1">
                              {order.buyerName} ({order.pricing?.quantity || 1})
                            </div>
                            <div className="text-xs text-gray-600 mb-1">{order.listingTitle}</div>
                            {order.tracking?.trackingNumber && (
                              <div className="text-xs text-gray-500">
                                Tracking: {order.tracking.carrier} - {order.tracking.trackingNumber}
                              </div>
                            )}
                            <div className="mt-2">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(order.status)}`}>
                                {formatStatus(order.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.pricing?.quantity || 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(order.pricing?.total || order.totalPrice, order.pricing?.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {order.purchaseDate ? format(new Date(order.purchaseDate), 'MMM dd, yyyy') : '-'}
                        {order.purchaseDate && (
                          <div className="text-xs text-gray-500">at {format(new Date(order.purchaseDate), 'h:mm a')}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">Page {pagination.page} of {pagination.totalPages}</div>
            <div className="flex gap-2">
              <button onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Shipping Modal (UC-03) */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Purchase Shipping Label</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <input type="text" value={currentOrder?.orderNumber || ''} disabled className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Carrier <span className="text-red-500">*</span></label>
                <select value={trackingInfo.carrier} onChange={(e) => handleCarrierChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select shipping carrier</option>
                  {carrierOptions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label} - Estimated: {c.days} day{c.days > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              {trackingInfo.carrier && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Generated Tracking Number:</p>
                    <p className="text-lg font-mono font-bold text-blue-600">{trackingInfo.trackingNumber}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Estimated Delivery:</p>
                    <p className="text-lg font-semibold text-green-600">
                      {format(new Date(trackingInfo.estimatedDelivery), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmitTracking} disabled={!trackingInfo.carrier}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                Generate Label & Ship
              </button>
              <button onClick={() => { setShowShippingModal(false); setTrackingInfo({ carrier: '', trackingNumber: '', estimatedDelivery: '' }); }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Label (UC-03) */}
      {showShippingLabel && generatedLabel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b no-print">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Shipping Label</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrintLabel} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Print Label</button>
                  <button onClick={handleCloseLabel} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
                </div>
              </div>
            </div>
            <div className="p-8 print:p-0" id="shipping-label">
              <div className="border-4 border-black p-6 max-w-lg mx-auto bg-white">
                <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-blue-600 flex items-center justify-center rounded"><span className="text-white font-bold text-xl">📦</span></div>
                    <div>
                      <div className="text-sm font-medium">SHIPPING SERVICE</div>
                      <div className="text-sm font-medium">eBay Label</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">Preferred shipping service on</div>
                    <div className="text-2xl font-bold">eBay</div>
                  </div>
                </div>
                <div className="bg-red-600 text-white text-center py-3 mb-6">
                  <div className="text-3xl font-bold">{generatedLabel.carrier === 'USPS' ? 'USPS PRIORITY MAIL®' : generatedLabel.carrier.toUpperCase() + ' EXPRESS'}</div>
                </div>
                <div className="mb-6">
                  <div className="text-sm font-semibold mb-2">SHIP TO:</div>
                  <div className="text-lg font-bold">{generatedLabel.buyerName}</div>
                  <div className="text-base">{generatedLabel.buyerAddress?.street}</div>
                  {generatedLabel.buyerAddress?.city && <div className="text-base">{generatedLabel.buyerAddress.city}, {generatedLabel.buyerAddress?.state} {generatedLabel.buyerAddress?.country}</div>}
                </div>
                <div className="border-2 border-black p-4 mb-4">
                  <div className="text-center mb-2"><div className="text-xs font-semibold">DELIVERY CONFIRMATION</div></div>
                  <div className="flex flex-col items-center">
                    <div className="font-mono text-xs mb-2">||||||||||||||||||||||||||||||||||||||||||||||</div>
                    <div className="font-mono text-sm font-bold tracking-widest">{generatedLabel.trackingNumber}</div>
                  </div>
                </div>
                <div className="bg-gray-100 p-3 mb-4 text-sm">
                  <div className="font-semibold mb-1">Order Details:</div>
                  <div>Order #: {generatedLabel.orderNumber}</div>
                  <div>Item: {generatedLabel.listingTitle}</div>
                  <div>Estimated Delivery: {format(new Date(generatedLabel.estimatedDelivery), 'MMM dd, yyyy')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal (UC-02) */}
      {showOrderDetail && orderDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button onClick={() => setShowOrderDetail(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Order Number</div>
                  <div className="font-mono font-semibold">{orderDetail.orderNumber || orderDetail._id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeClass(orderDetail.status)}`}>{formatStatus(orderDetail.status)}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Buyer</div>
                  <div className="font-medium">{orderDetail.buyerName}</div>
                  <div className="text-sm text-gray-600">@{orderDetail.buyerUsername}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-semibold text-lg">{formatCurrency(orderDetail.pricing?.total || orderDetail.totalPrice, orderDetail.pricing?.currency)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Ship To</div>
                  <div>{orderDetail.shippingAddress?.fullName}</div>
                  <div className="text-sm text-gray-700">
                    {orderDetail.shippingAddress?.street}, {orderDetail.shippingAddress?.city}, {orderDetail.shippingAddress?.country}
                  </div>
                </div>
                {orderDetail.tracking?.trackingNumber && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">Tracking</div>
                    <div className="font-mono">{orderDetail.tracking.carrier} - {orderDetail.tracking.trackingNumber}</div>
                  </div>
                )}
                {orderDetail.sellerNotes && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500">Seller Notes</div>
                    <div className="text-sm">{orderDetail.sellerNotes}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Items</div>
                <div className="border rounded divide-y">
                  {orderDetail.items?.map((item) => (
                    <div key={item._id} className="p-3 flex justify-between text-sm">
                      <div>
                        <div className="font-medium">{item.productId?.title || 'Item'}</div>
                        <div className="text-xs text-gray-500">Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {orderDetail.status === 'shipped' && (
                <div className="border-t pt-4 flex gap-3">
                  <button onClick={() => handleMarkDelivered(orderDetail._id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">
                    Mark as Delivered
                  </button>
                  <button onClick={() => openDeliveryFailModal(orderDetail)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                    Mark Delivery Failed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Fail Modal (UC-05) */}
      {showDeliveryFailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Mark Delivery Failed</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea value={failReason} onChange={(e) => setFailReason(e.target.value)} rows={4}
                  placeholder="e.g. Buyer not available, address invalid, package damaged..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleConfirmDeliveryFail} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                Confirm
              </button>
              <button onClick={() => setShowDeliveryFailModal(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #shipping-label, #shipping-label * { visibility: visible; }
          #shipping-label { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
};

export default SellerOrders;