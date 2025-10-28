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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderCode, orderDate, branch, cartItems, total } = body;

    const sheets = await getGoogleSheetsClient();

    // Prepare data for each cart item
    const rows = cartItems.map((item: any) => [
      orderCode,        // A: maphieu
      orderDate,        // B: ngaythang
      branch,           // C: chinhanh
      item.product.name, // D: sanpham
      item.product.unit, // E: donvi
      item.quantity,    // F: soluong
      item.product.price, // G: giatien
      item.product.price * item.quantity, // H: thanhtien
      item.note || ''   // I: ghichu
    ]);

    // Append rows to Sales sheet (chi tiết từng sản phẩm)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sales!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      }
    });

    // Also append to dshoadon sheet (tổng hợp đơn hàng)
    const orderSummary = [[
      orderCode,    // A: Mã phiếu
      orderDate,    // B: Ngày
      branch,       // C: Chi nhánh  
      total         // D: Tổng tiền
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'dshoadon!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: orderSummary
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Đơn hàng đã được lưu thành công'
    });

  } catch (error) {
    console.error('Error saving order:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Có lỗi xảy ra khi lưu đơn hàng'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sheets = await getGoogleSheetsClient();

    // Read all sales data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sales!A:I',
    });

    const values = response.data.values || [];
    
    // Skip header row and format data
    const sales = values.slice(1).map((row, index) => ({
      id: index + 1,
      orderCode: row[0] || '',
      orderDate: row[1] || '',
      branch: row[2] || '',
      product: row[3] || '',
      unit: row[4] || '',
      quantity: parseInt(row[5]) || 0,
      price: parseFloat(row[6]) || 0,
      total: parseFloat(row[7]) || 0,
      note: row[8] || ''
    }));

    return NextResponse.json({
      success: true,
      sales
    });

  } catch (error) {
    console.error('Error fetching sales:', error);
    
    return NextResponse.json({
      success: true,
      sales: []
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderCode, orderDate, branch, cartItems, total, oldOrderCode } = body;

    const sheets = await getGoogleSheetsClient();

    // First, delete existing order data from both sheets
    // Get all data to find rows to delete
    const [salesResponse, ordersResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sales!A:I',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'dshoadon!A:D',
      })
    ]);

    const salesValues = salesResponse.data.values || [];
    const ordersValues = ordersResponse.data.values || [];

    // Find rows to delete using oldOrderCode (skip header row)
    const deleteCode = oldOrderCode || orderCode;
    const salesRowsToDelete = [];
    const ordersRowsToDelete = [];

    for (let i = 1; i < salesValues.length; i++) {
      if (salesValues[i][0] === deleteCode) {
        salesRowsToDelete.push(i + 1); // +1 because sheets are 1-indexed
      }
    }

    for (let i = 1; i < ordersValues.length; i++) {
      if (ordersValues[i][0] === deleteCode) {
        ordersRowsToDelete.push(i + 1);
      }
    }

    // Delete rows from both sheets (delete from bottom to top to maintain indices)
    for (const rowIndex of salesRowsToDelete.reverse()) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming Sales is the first sheet
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }]
        }
      });
    }

    for (const rowIndex of ordersRowsToDelete.reverse()) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 2, // Assuming dshoadon is the third sheet (index 2)
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }]
        }
      });
    }

    // Now add the updated data
    const rows = cartItems.map((item: any) => [
      orderCode,
      orderDate,
      branch,
      item.product.name,
      item.product.unit,
      item.quantity,
      item.product.price,
      item.product.price * item.quantity,
      item.note || ''
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sales!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      }
    });

    const orderSummary = [[
      orderCode,
      orderDate,
      branch,
      total
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'dshoadon!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: orderSummary
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Đơn hàng đã được cập nhật thành công'
    });

  } catch (error) {
    console.error('Error updating order:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Có lỗi xảy ra khi cập nhật đơn hàng'
    }, { status: 500 });
  }
}