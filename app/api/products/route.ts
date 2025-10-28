import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  try {
    // Cấu hình Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ID của Google Sheet (lấy từ URL của sheet)
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    // Đọc dữ liệu từ sheet "Products"
    const range = 'Products!A:C'; // Đọc cột A, B, C (Tên sản phẩm, Đơn vị tính, Giá tiền)
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Chuyển đổi dữ liệu thành format phù hợp
    const products = rows.slice(1).map((row, index) => ({ // Bỏ qua header row
      id: index + 1,
      name: row[0] || '',
      unit: row[1] || '',
      price: parseFloat(row[2]) || 0,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products from Google Sheets:', error);
    
    // Fallback data nếu không kết nối được với Google Sheets
    const fallbackProducts = [
      { id: 1, name: 'Áo thun trắng cổ tròn', unit: 'Cái', price: 250000 },
      { id: 2, name: 'Quần jean xanh skinny', unit: 'Cái', price: 450000 },
      { id: 3, name: 'Giày sneaker trắng', unit: 'Đôi', price: 890000 },
      { id: 4, name: 'Áo hoodie xám', unit: 'Cái', price: 650000 },
      { id: 5, name: 'Túi xách da nâu', unit: 'Cái', price: 1200000 },
    ];
    
    return NextResponse.json({ 
      products: fallbackProducts,
      error: 'Using fallback data. Please check Google Sheets configuration.'
    });
  }
}

// Thêm sản phẩm mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, unit, price } = body;

    if (!name || !unit || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Thêm dòng mới vào Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Products!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, unit, price]],
      },
    });

    return NextResponse.json({ success: true, message: 'Product added successfully' });
  } catch (error) {
    console.error('Error adding product:', error);
    return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
  }
}

// Cập nhật sản phẩm
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, unit, price } = body;

    console.log('PUT request body:', { id, name, unit, price });

    if (!id || !name || !unit || (!price && price !== 0)) {
      console.log('Missing fields validation failed');
      return NextResponse.json({ 
        error: 'Missing required fields',
        received: { id, name, unit, price }
      }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Đọc tất cả data để tìm đúng row cần update
    const range = 'Products!A:C';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Tìm row có id tương ứng (id là index trong array + 1)
    const rowIndex = id; // id là 1-based index từ frontend
    const actualRowNumber = rowIndex + 1; // +1 vì có header row
    
    console.log(`Updating row ${actualRowNumber} for product ID ${id}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Products!A${actualRowNumber}:C${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, unit, price]],
      },
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product', details: String(error) }, { status: 500 });
  }
}

// Xóa sản phẩm
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('DELETE request ID:', id);

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Xóa dòng trong Google Sheet
    const productId = parseInt(id);
    const actualRowNumber = productId + 1; // +1 vì có header row
    
    console.log(`Deleting row ${actualRowNumber} for product ID ${productId}`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming Products sheet is the first sheet
                dimension: 'ROWS',
                startIndex: actualRowNumber - 1, // 0-based index
                endIndex: actualRowNumber, // 0-based index
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product', details: String(error) }, { status: 500 });
  }
}