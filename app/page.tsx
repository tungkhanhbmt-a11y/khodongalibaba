'use client';

import { ShoppingCartIcon, PlusIcon, UserIcon, ClockIcon, MinusIcon, TrashIcon, EyeIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useMemo } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  category?: string;
}

interface Branch {
  id: number;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

export default function Home() {
  // States for sales form
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    branch: '',
    ticketCode: '',
    date: ''
  });
  const [selectedProductId, setSelectedProductId] = useState('');
  const [note, setNote] = useState('');
  
  // Autocomplete states
  const [productSearch, setProductSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Order management states
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  
  // Loading states
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [originalOrderCode, setOriginalOrderCode] = useState<string>('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');

  // Generate ticket code
  const generateTicketCode = async (orderDate: string) => {
    try {
      const response = await fetch('/api/order-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: orderDate })
      });
      
      const data = await response.json();
      return data.orderCode;
    } catch (error) {
      console.error('Error generating order code:', error);
      // Fallback to old method
      const dateString = orderDate.replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 999) + 1;
      const paddedNum = randomNum.toString().padStart(3, '0');
      return `${dateString}-${paddedNum}`;
    }
  };

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  // Format date to dd-mm-yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  // Handle date change to regenerate ticket code
  const handleDateChange = async (newDate: string) => {
    setGeneratingCode(true);
    try {
      // Always generate new ticket code when date changes
      const ticketCode = await generateTicketCode(newDate);
      
      setCustomerInfo({
        ...customerInfo,
        date: newDate,
        ticketCode: ticketCode
      });
      
      // If editing and date changed, show notification
      if (editingOrder && newDate !== editingOrder.date) {
        // Could add a subtle notification here if needed
      }
    } finally {
      setGeneratingCode(false);
    }
  };

  // Initialize form data when opening sales form
  const openSalesForm = async () => {
    setGeneratingCode(true);
    const currentDate = getCurrentDate();
    
    try {
      const ticketCode = await generateTicketCode(currentDate);
      setCustomerInfo({
        branch: '',
        ticketCode: ticketCode,
        date: currentDate
      });
      setCartItems([]);
      setEditingOrder(null);
      setOriginalOrderCode('');
      setShowSalesForm(true);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  // Fetch branches from API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        const data = await response.json();
        setBranches(data.branches || []);
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };

    fetchBranches();
  }, []);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('.autocomplete-container')) {
        setShowSuggestions(false);
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Refresh orders list
  const refreshOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  // Filter orders based on search and filter criteria
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.branch.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDate = filterDate === '' || order.date === filterDate;
      
      const matchesBranch = filterBranch === '' || order.branch === filterBranch;
      
      return matchesSearch && matchesDate && matchesBranch;
    });
  }, [orders, searchTerm, filterDate, filterBranch]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterBranch('');
  };

  // View order details
  const viewOrderDetails = async (order: any) => {
    setLoadingOrderDetails(true);
    try {
      // Fetch order details from Sales sheet
      const response = await fetch(`/api/sales`);
      const data = await response.json();
      
      // Filter details for this specific order
      const details = data.sales.filter((item: any) => item.orderCode === order.orderCode);
      
      setSelectedOrder(order);
      setOrderDetails(details);
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      alert('Không thể tải chi tiết đơn hàng');
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Edit order
  const editOrder = async (order: any) => {
    try {
      // Fetch order details from Sales sheet
      const response = await fetch(`/api/sales`);
      const data = await response.json();
      
      // Filter details for this specific order
      const details = data.sales.filter((item: any) => item.orderCode === order.orderCode);
      
      // Convert details back to cart format
      const editCartItems = details.map((item: any) => ({
        product: {
          id: Date.now() + Math.random(), // Generate temp ID
          name: item.product,
          price: item.price,
          unit: item.unit,
          category: ''
        },
        quantity: item.quantity,
        note: item.note || ''
      }));

      // Set edit mode
      setCartItems(editCartItems);
      setCustomerInfo({
        branch: order.branch,
        ticketCode: order.orderCode,
        date: order.date
      });
      setOriginalOrderCode(order.orderCode); // Store original code
      setShowSalesForm(true);
      setEditingOrder(order);
    } catch (error) {
      console.error('Error loading order for edit:', error);
      alert('Không thể tải thông tin đơn hàng để chỉnh sửa');
    }
  };

  // Delete order
  const deleteOrder = async (order: any) => {
    if (!confirm(`Bạn có chắc muốn xóa đơn hàng ${order.orderCode}?`)) {
      return;
    }
    
    setDeletingOrder(order.orderCode);
    try {
      // This would need API implementation to delete from both Sales and dshoadon sheets
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      alert(`Chức năng xóa đơn hàng ${order.orderCode} sẽ được phát triển sau`);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Có lỗi xảy ra khi xóa đơn hàng');
    } finally {
      setDeletingOrder(null);
    }
  };

  // Handle product search
  const handleProductSearch = (searchTerm: string) => {
    setProductSearch(searchTerm);
    
    if (searchTerm.length > 0) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.unit.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredProducts([]);
      setShowSuggestions(false);
    }
  };

  // Select product from suggestions
  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id.toString());
    setProductSearch(product.name);
    setShowSuggestions(false);
  };

  // Add product to cart
  const addToCart = () => {
    if (!selectedProductId) {
      alert('Vui lòng chọn sản phẩm');
      return;
    }

    const product = products.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;

    // Always add as new item with quantity 1 and note
    setCartItems([...cartItems, { 
      product, 
      quantity: 1, 
      note: note.trim() || undefined 
    }]);

    setSelectedProductId('');
    setProductSearch('');
    setNote('');
    setShowSuggestions(false);
  };

  // Remove from cart by index
  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Update quantity in cart by index
  const updateQuantity = (index: number, newQuantity: number) => {
    // Round to 1 decimal place
    const roundedQuantity = Math.round(newQuantity * 10) / 10;
    
    // Allow 0 quantity, only remove when explicitly using remove button
    const finalQuantity = Math.max(0, roundedQuantity);
    
    setCartItems(cartItems.map((item, i) =>
      i === index
        ? { ...item, quantity: finalQuantity }
        : item
    ));
  };

  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  // Submit order
  const submitOrder = async () => {
    // Filter out items with quantity 0
    const validCartItems = cartItems.filter(item => item.quantity > 0);
    
    if (!customerInfo.branch || !customerInfo.date || validCartItems.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin và thêm sản phẩm với số lượng lớn hơn 0');
      return;
    }

    setSavingOrder(true);
    try {
      let response;
      
      if (editingOrder) {
        // Update existing order
        response = await fetch('/api/sales', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderCode: customerInfo.ticketCode,
            oldOrderCode: originalOrderCode, // Send original order code for deletion
            orderDate: customerInfo.date,
            branch: customerInfo.branch,
            cartItems: validCartItems,
            total: calculateTotal(),
            isEdit: true
          })
        });
      } else {
        // Create new order
        response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderCode: customerInfo.ticketCode,
            orderDate: customerInfo.date,
            branch: customerInfo.branch,
            cartItems: validCartItems,
            total: calculateTotal()
          })
        });
      }

      const result = await response.json();

      if (result.success) {
        const actionText = editingOrder ? 'cập nhật' : 'lưu';
        alert(`Đơn hàng đã được ${actionText} thành công!\nMã phiếu: ${customerInfo.ticketCode}\nNgày: ${customerInfo.date}\nChi nhánh: ${customerInfo.branch}\nTổng tiền: ${calculateTotal().toLocaleString()}đ`);
        
        // Reset form
        setCartItems([]);
        setCustomerInfo({ branch: '', ticketCode: '', date: '' });
        setShowSalesForm(false);
        setEditingOrder(null);
        setOriginalOrderCode('');
        
        // Refresh orders list
        refreshOrders();
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Có lỗi xảy ra khi lưu đơn hàng. Vui lòng thử lại.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bán hàng</h1>
          <p className="text-gray-600">Quản lý đơn hàng và bán hàng trực tiếp</p>
        </div>

        {/* Create New Order */}
        <div className="mb-8">
          <button 
            onClick={openSalesForm}
            className="w-full bg-blue-600 text-white p-6 rounded-xl shadow-sm hover:bg-blue-700 transition-colors duration-200"
          >
            <PlusIcon className="w-10 h-10 mx-auto mb-3" />
            <span className="text-lg font-medium">Tạo đơn hàng mới</span>
          </button>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Đơn hàng gần đây</h2>
              <div className="text-sm text-gray-500">
                {filteredOrders.length} / {orders.length} đơn hàng
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Tìm kiếm chi nhánh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Lọc theo ngày"
                />
              </div>

              {/* Branch Filter */}
              <div className="flex gap-2">
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                
                {/* Clear Filters Button */}
                {(searchTerm || filterDate || filterBranch) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                    title="Xóa bộ lọc"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi nhánh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Chưa có đơn hàng nào
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Không tìm thấy đơn hàng phù hợp với bộ lọc
                      <div className="mt-2">
                        <button
                          onClick={clearFilters}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr key={order.orderCode} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(order.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.branch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{order.total.toLocaleString()}đ</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => viewOrderDetails(order)}
                            disabled={loadingOrderDetails}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                            title="Xem chi tiết"
                          >
                            {loadingOrderDetails && (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                            )}
                            <span>{loadingOrderDetails ? 'Đang tải...' : 'Xem'}</span>
                          </button>
                          <button
                            onClick={() => editOrder(order)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            title="Sửa đơn hàng"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteOrder(order)}
                            disabled={deletingOrder === order.orderCode}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                            title="Xóa đơn hàng"
                          >
                            {deletingOrder === order.orderCode && (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700"></div>
                            )}
                            <span>{deletingOrder === order.orderCode ? 'Đang xóa...' : 'Xóa'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Form Modal */}
        {showSalesForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl my-8">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingOrder ? `Chỉnh sửa đơn hàng ${editingOrder.orderCode}` : 'Tạo đơn hàng mới'}
                  </h3>
                  {editingOrder && (
                    <p className="text-sm text-blue-600 mt-1">
                      Đang chỉnh sửa đơn hàng có sẵn. Mã phiếu sẽ tự động cập nhật khi thay đổi ngày.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowSalesForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Sales Info */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Thông tin bán hàng</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã phiếu</label>
                        <input
                          type="text"
                          value={generatingCode ? 'Đang tạo mã...' : customerInfo.ticketCode}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          placeholder="Mã tự động tạo..."
                        />
                        {editingOrder && originalOrderCode && customerInfo.ticketCode !== originalOrderCode && (
                          <p className="text-xs text-orange-600 mt-1">
                            Mã phiếu đã thay đổi từ {originalOrderCode} → {customerInfo.ticketCode}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tháng *</label>
                        <input
                          type="date"
                          value={customerInfo.date}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh *</label>
                        <select
                          value={customerInfo.branch}
                          onChange={(e) => setCustomerInfo({...customerInfo, branch: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Chọn chi nhánh...</option>
                          {branches.map(branch => (
                            <option key={branch.id} value={branch.name}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Add Product Section */}
                    <div className="mt-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Thêm sản phẩm</h4>
                      <div className="space-y-4">
                        <div className="relative autocomplete-container">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm sản phẩm</label>
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => handleProductSearch(e.target.value)}
                            onFocus={() => {
                              if (productSearch.length > 0) setShowSuggestions(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nhập tên sản phẩm để tìm kiếm..."
                          />
                          
                          {/* Suggestions Dropdown */}
                          {showSuggestions && filteredProducts.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredProducts.map(product => (
                                <button
                                  key={product.id}
                                  onClick={() => selectProduct(product)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none"
                                >
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-600">
                                    {product.price.toLocaleString()}đ/{product.unit}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {/* No results message */}
                          {showSuggestions && productSearch.length > 0 && filteredProducts.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                              <div className="text-gray-500 text-center">Không tìm thấy sản phẩm</div>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ghi chú cho sản phẩm (không bắt buộc)..."
                          />
                        </div>
                        <button
                          onClick={addToCart}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <PlusIcon className="w-5 h-5 mr-2" />
                          Thêm vào giỏ hàng
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cart */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Giỏ hàng ({cartItems.filter(item => item.quantity > 0).length} mặt hàng)
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cartItems.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Chưa có sản phẩm nào trong giỏ hàng</p>
                      ) : (
                        cartItems.map((item, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{item.product.name}</h5>
                                <p className="text-sm text-gray-600">
                                  {item.product.price.toLocaleString()}đ/{item.product.unit}
                                </p>
                                {item.note && (
                                  <p className="text-sm text-blue-600 mt-1 italic">
                                    Ghi chú: {item.note}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeFromCart(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateQuantity(index, item.quantity - 0.5)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                  <MinusIcon className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(1)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      // Allow empty input without removing item
                                      updateQuantity(index, 0);
                                    } else {
                                      const newQty = parseFloat(value) || 0;
                                      updateQuantity(index, newQty);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // If still empty on blur, set to 0
                                    if (e.target.value === '') {
                                      updateQuantity(index, 0);
                                    }
                                  }}
                                  className="w-16 text-center font-medium border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                  onClick={() => updateQuantity(index, item.quantity + 0.5)}
                                  className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {(item.product.price * item.quantity).toLocaleString()}đ
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total */}
                    {cartItems.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Tổng cộng:</span>
                          <span className="text-blue-600">{calculateTotal().toLocaleString()}đ</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSalesForm(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={submitOrder}
                  disabled={!customerInfo.branch || !customerInfo.date || cartItems.length === 0 || savingOrder}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {savingOrder && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{savingOrder ? 'Đang lưu...' : (editingOrder ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Detail Modal */}
        {showOrderDetail && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Chi tiết đơn hàng {selectedOrder.orderCode}
                  </h3>
                  <button
                    onClick={() => setShowOrderDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Mã đơn hàng</p>
                      <p className="font-medium">{selectedOrder.orderCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ngày tạo</p>
                      <p className="font-medium">{formatDate(selectedOrder.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Chi nhánh</p>
                      <p className="font-medium">{selectedOrder.branch}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tổng tiền</p>
                      <p className="font-medium text-blue-600">{selectedOrder.total.toLocaleString()}đ</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Sản phẩm</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Sản phẩm</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Đơn vị</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">SL</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Đơn giá</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Thành tiền</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {orderDetails.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{item.unit}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.price.toLocaleString()}đ</td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.total.toLocaleString()}đ</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{item.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowOrderDetail(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}