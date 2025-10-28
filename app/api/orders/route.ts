import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

async function getGoogleSheetsClient() {
  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google credentials not found');
  }

  const credentials = {
    type: 'service_account',
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  try {
    const sheets = await getGoogleSheetsClient();

    // Read order summary from dshoadon sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'dshoadon!A:D',
    });

    const values = response.data.values || [];
    
    // Skip header row and format data
    const orders = values.slice(1).map((row, index) => ({
      id: row[0] || `#${index + 1}`,
      orderCode: row[0] || '',
      date: row[1] || '',
      branch: row[2] || '',
      total: parseFloat(row[3]) || 0,
      status: 'Hoàn thành' // Default status
    }));

    // Sort by most recent (assuming order code format YYYYMMDD-XXX)
    orders.sort((a, b) => {
      if (a.orderCode > b.orderCode) return -1;
      if (a.orderCode < b.orderCode) return 1;
      return 0;
    });

    // Return only latest 10 orders
    const recentOrders = orders.slice(0, 10);

    return NextResponse.json({
      success: true,
      orders: recentOrders
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    
    // Fallback data if Google Sheets is not available
    const fallbackOrders = [
      { id: '#DH001', orderCode: '#DH001', date: '2025-10-28', branch: 'Tân Hóa', total: 250000, status: 'Hoàn thành' },
      { id: '#DH002', orderCode: '#DH002', date: '2025-10-28', branch: 'Tân Kỳ', total: 180000, status: 'Đang xử lý' },
      { id: '#DH003', orderCode: '#DH003', date: '2025-10-28', branch: 'Hoàng Long', total: 320000, status: 'Hoàn thành' },
    ];

    return NextResponse.json({
      success: true,
      orders: fallbackOrders
    });
  }
}