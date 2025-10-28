import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const GOOGLE_SHEETS_CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL!;
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY!.replace(/\\n/g, '\n');

interface Order {
  id: string;
  orderCode: string;
  date: string;
  branch: string;
  total: number;
}

async function getOrdersFromSheets(): Promise<Order[]> {
  try {
    const auth = new google.auth.JWT({
      email: GOOGLE_SHEETS_CLIENT_EMAIL,
      key: GOOGLE_SHEETS_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range: 'Orders!A:F',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const orders = rows.slice(1).map((row: any[], index: number) => ({
      id: `${index + 1}`,
      orderCode: row[0] || '',
      date: row[1] || '',
      branch: row[2] || '',
      total: parseFloat(row[5]) || 0,
    }));

    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('vi-VN');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const filterBranch = searchParams.get('branch') || '';

    const orders = await getOrdersFromSheets();
    
    // Filter orders
    const filteredOrders = orders.filter(order => {
      // Date filter
      if (fromDate) {
        const orderDate = new Date(order.date);
        const fromDateObj = new Date(fromDate);
        if (orderDate < fromDateObj) return false;
      }
      
      if (toDate) {
        const orderDate = new Date(order.date);
        const toDateObj = new Date(toDate);
        if (orderDate > toDateObj) return false;
      }
      
      // Branch filter
      if (filterBranch && order.branch !== filterBranch) {
        return false;
      }
      
      return true;
    });

    const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total, 0);

    // Generate HTML for screenshot
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo KHO ĐÔNG ALIBABA</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          background: white; 
          padding: 20px;
          color: #374151;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          border: 2px solid #d1d5db;
          margin-top: 20px;
        }
        th, td { 
          border: 1px solid #d1d5db; 
          padding: 12px 16px; 
          text-align: left;
          font-size: 14px;
        }
        th { 
          background: #f3f4f6; 
          font-weight: bold; 
          text-transform: uppercase;
          color: #374151;
        }
        tr:nth-child(even) { background: #f9fafb; }
        tr:nth-child(odd) { background: white; }
        .total-row { 
          background: #fef3c7 !important; 
          font-weight: bold;
        }
        .text-right { text-align: right; }
        .no-data { 
          text-align: center; 
          padding: 48px 24px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          color: #6b7280;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${filteredOrders.length === 0 ? `
          <div class="no-data">
            Không có hóa đơn nào trong khoảng thời gian đã chọn
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày lập</th>
                <th>Chi nhánh</th>
                <th>Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map((order, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${formatDate(order.date)}</td>
                  <td>${order.branch}</td>
                  <td>${formatNumber(order.total)}đ</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" class="text-right">TỔNG CỘNG:</td>
                <td>${formatNumber(totalAmount)}đ</td>
              </tr>
            </tbody>
          </table>
        `}
      </div>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Screenshot API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}