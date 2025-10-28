'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

interface InvoiceData {
  id: number | string;
  orderCode: string;
  date: string;
  branch: string;
  total: number;
}

function PrintReportContent() {
  const searchParams = useSearchParams();
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Get filter parameters from URL
  const fromDate = searchParams.get('fromDate') || '';
  const toDate = searchParams.get('toDate') || '';
  const filterBranch = searchParams.get('branch') || '';

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString('vi-VN'));
    setCurrentTime(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  // Format date to dd-mm-yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  // Safe number formatting to avoid hydration issues
  const formatNumber = (num: number) => {
    return num.toLocaleString('vi-VN');
  };

  // Fetch invoice data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const response = await fetch('/api/orders');
        const data = await response.json();
        setInvoiceData(data.orders || []);
      } catch (error) {
        console.error('Error fetching invoice data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, []);

  // Filter invoices based on URL parameters
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

  // Add print styles when component mounts
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide print controls when printing */
      .no-print { display: none !important; }
      
      @media print {
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        nav, header, .navigation, [class*="nav"], [class*="Navigation"] {
          display: none !important;
        }
        .no-print { display: none !important; }
        .print-container { 
          width: 100% !important; 
          max-width: none !important;
          margin: 0 !important;
          padding: 20px !important;
        }
        table { border-collapse: collapse !important; }
        th, td { border: 1px solid black !important; }
        @page { margin: 1cm; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          nav, header, .navigation {
            display: none !important;
          }
        `
      }} />
      <div className="min-h-screen bg-white" suppressHydrationWarning={true}>
        {/* Print Content */}
        <div className="print-container max-w-7xl mx-auto p-8">
        {/* Print Table */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 border-2 border-gray-300 rounded-lg">
            <p className="text-xl text-gray-500">Không có hóa đơn nào trong khoảng thời gian đã chọn</p>
          </div>
        ) : (
          <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse border-2 border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">STT</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Mã hóa đơn</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Ngày lập</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Chi nhánh</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-bold text-gray-700 uppercase">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, index) => (
                    <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                        {invoice.orderCode}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                        {invoice.branch}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                        {formatNumber(invoice.total)}đ
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-yellow-100 font-bold">
                    <td colSpan={4} className="border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      TỔNG CỘNG:
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-bold text-gray-900">
                      {formatNumber(filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0))}đ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
    </>
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải báo cáo...</p>
        </div>
      </div>
    }>
      <PrintReportContent />
    </Suspense>
  );
}