'use client';


import { useState, useEffect } from 'react';

interface SalesData {
  id: number;
  orderCode: string;
  orderDate: string;
  branch: string;
  product: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
  note: string;
}

interface InvoiceData {
  id: number | string;
  orderCode: string;
  date: string;
  branch: string;
  total: number;
}

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<SalesData[]>([]);
  
  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [branches, setBranches] = useState<{id: number; name: string}[]>([]);
  
  // Screenshot states
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Loading states
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  // Format date to dd-mm-yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  // Fetch sales data
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const response = await fetch('/api/sales');
        const data = await response.json();
        setSalesData(data.sales || []);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, []);

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const response = await fetch('/api/orders');
        const data = await response.json();
        setInvoiceData(data.orders || []);
      } catch (error) {
        console.error('Error fetching invoice data:', error);
      }
    };

    fetchInvoiceData();
  }, []);

  // Fetch branches
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

  // Function to capture screenshot of print report
  const captureReportScreenshot = async () => {
    if (filteredInvoices.length === 0) return;
    
    setIsCapturing(true);
    
    try {
      // Tạo URL của trang print với các tham số filter
      const printUrl = `https://kdalibaba.netlify.app/reports/print?${new URLSearchParams({
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
        ...(filterBranch && { branch: filterBranch })
      }).toString()}`;
      
      // Tạo URL screenshot
      const screenshotUrl = `https://chupanh.onrender.com/screenshot?url=${encodeURIComponent(printUrl)}`;
      
      // Hiển thị thông báo chờ 30 giây (tăng thời gian chờ)
      const countdownAlert = () => {
        let countdown = 30;
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          z-index: 9999;
          text-align: center;
          min-width: 300px;
        `;
        
        const overlayDiv = document.createElement('div');
        overlayDiv.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
        `;
        
        const updateAlert = () => {
          alertDiv.innerHTML = `
            <div style="margin-bottom: 16px;">
              <div style="width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
              <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #1f2937;">Đang chụp ảnh báo cáo</h3>
              <p style="margin: 0; color: #6b7280;">Vui lòng chờ ${countdown} giây...</p>
            </div>
          `;
        };
        
        // Thêm CSS animation
        if (!document.querySelector('#spin-animation')) {
          const style = document.createElement('style');
          style.id = 'spin-animation';
          style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
          document.head.appendChild(style);
        }
        
        document.body.appendChild(overlayDiv);
        document.body.appendChild(alertDiv);
        updateAlert();
        
        const interval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            updateAlert();
          } else {
            clearInterval(interval);
            document.body.removeChild(overlayDiv);
            document.body.removeChild(alertDiv);
            
            // Sau 15 giây, tải ảnh về
            downloadImage();
          }
        }, 1000);
      };
      
      const downloadImage = async () => {
        try {
          // Tạo tên file với thời gian hiện tại
          const now = new Date();
          const fileName = `BaoCao_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.png`;
          
          // Fetch ảnh với timeout và retry
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
          
          const response = await fetch(screenshotUrl, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Accept': 'image/png,image/*,*/*'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // Kiểm tra xem blob có phải là ảnh không
          if (!blob.type.startsWith('image/')) {
            throw new Error('File tải về không phải là ảnh');
          }
          
          // Tạo URL object và download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          
          // Trigger download với user gesture
          document.body.appendChild(link);
          
          // Sử dụng setTimeout để đảm bảo link đã được add vào DOM
          setTimeout(() => {
            link.click();
            
            // Cleanup sau khi download
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }, 100);
          }, 100);
          
          // Hiển thị thông báo thành công
          setTimeout(() => {
            alert('Báo cáo đã được tải về thành công! Kiểm tra thư mục Downloads của bạn.');
          }, 500);
          
        } catch (error) {
          console.error('Lỗi khi tải ảnh:', error);
          
          // Fallback: Mở ảnh trong tab mới để user có thể save manually
          const fallbackLink = document.createElement('a');
          fallbackLink.href = screenshotUrl;
          fallbackLink.target = '_blank';
          fallbackLink.rel = 'noopener noreferrer';
          document.body.appendChild(fallbackLink);
          fallbackLink.click();
          document.body.removeChild(fallbackLink);
          
          alert('Không thể tự động tải ảnh. Đã mở ảnh trong tab mới, bạn có thể click chuột phải và chọn "Save image as..."');
        } finally {
          setIsCapturing(false);
        }
      };
      
      // Bắt đầu countdown
      countdownAlert();
      
    } catch (error) {
      console.error('Lỗi khi chụp ảnh báo cáo:', error);
      alert('Có lỗi xảy ra khi chụp ảnh báo cáo. Vui lòng thử lại!');
      setIsCapturing(false);
    }
  };

  // Filter invoices based on date range and branch
  const filteredInvoices = invoiceData.filter(invoice => {
    // Date filter
    if (fromDate) {
      const invoiceDate = new Date(invoice.date);
      const fromDateObj = new Date(fromDate);
      if (invoiceDate < fromDateObj) return false;
    }
    
    if (toDate) {
      const invoiceDate = new Date(invoice.date);
      const toDateObj = new Date(toDate);
      if (invoiceDate > toDateObj) return false;
    }
    
    // Branch filter
    if (filterBranch && invoice.branch !== filterBranch) {
      return false;
    }
    
    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setFilterBranch('');
  };

  // View invoice details
  const viewInvoiceDetails = async (invoice: InvoiceData) => {
    setLoadingInvoiceDetail(true);
    try {
      // Simulate loading delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Get details from salesData for this invoice
      const details = salesData.filter(item => item.orderCode === invoice.orderCode);
      
      setSelectedInvoice(invoice);
      setInvoiceDetails(details);
      setShowInvoiceDetail(true);
    } catch (error) {
      console.error('Error loading invoice details:', error);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Danh sách hóa đơn</h1>
          <p className="text-gray-600">Quản lý và xem chi tiết các hóa đơn bán hàng</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng hóa đơn</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceData.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-green-600">
                  {invoiceData.reduce((sum, invoice) => sum + invoice.total, 0).toLocaleString()}đ
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sau lọc</p>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-bold text-purple-600">{filteredInvoices.length} hóa đơn</p>
                  <p className="text-sm font-medium text-gray-700">
                    ({filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0).toLocaleString()}đ)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Danh sách hóa đơn</h2>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {filteredInvoices.length} / {invoiceData.length} hóa đơn
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    Tổng: {filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0).toLocaleString()}đ
                  </div>
                </div>
                <button
                  onClick={captureReportScreenshot}
                  disabled={filteredInvoices.length === 0 || isCapturing}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    filteredInvoices.length === 0 || isCapturing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isCapturing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang chụp...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Chụp báo cáo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* From Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* To Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                {(fromDate || toDate || filterBranch) && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                  >
                    Xóa bộ lọc
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã hóa đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày lập</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi nhánh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : invoiceData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Chưa có hóa đơn nào
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      Không tìm thấy hóa đơn phù hợp với bộ lọc
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
                  filteredInvoices.map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.orderCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.branch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.total.toLocaleString()}đ
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => viewInvoiceDetails(invoice)}
                          disabled={loadingInvoiceDetail}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center space-x-1"
                          title="Xem chi tiết"
                        >
                          {loadingInvoiceDetail && (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                          )}
                          <span>{loadingInvoiceDetail ? 'Đang tải...' : 'Xem'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>


        {/* Invoice Detail Modal */}
        {showInvoiceDetail && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Chi tiết hóa đơn {selectedInvoice.orderCode}
                  </h3>
                  <button
                    onClick={() => setShowInvoiceDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Invoice Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Mã hóa đơn</p>
                      <p className="font-medium">{selectedInvoice.orderCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ngày lập</p>
                      <p className="font-medium">{formatDate(selectedInvoice.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Chi nhánh</p>
                      <p className="font-medium">{selectedInvoice.branch}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tổng tiền</p>
                      <p className="font-medium text-blue-600">{selectedInvoice.total.toLocaleString()}đ</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Items */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Chi tiết sản phẩm</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">STT</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Sản phẩm</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Đơn vị</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">SL</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Đơn giá</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Thành tiền</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoiceDetails.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
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
                  onClick={() => setShowInvoiceDetail(false)}
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