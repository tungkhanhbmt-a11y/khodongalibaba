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

    // Read branches from column B starting from B2
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'chinhanh!B2:B1000', // Read from B2 to B1000 to get all branches
    });

    const values = response.data.values || [];
    
    // Filter out empty values and create branch objects
    const branches = values
      .flat()
      .filter(value => value && value.trim() !== '')
      .map((name, index) => ({
        id: index + 1,
        name: name.trim()
      }));

    return NextResponse.json({
      success: true,
      branches
    });

  } catch (error) {
    console.error('Error fetching branches:', error);
    
    // Fallback data if Google Sheets is not available
    const fallbackBranches = [
      { id: 1, name: 'Chi nhánh Quận 1' },
      { id: 2, name: 'Chi nhánh Quận 3' },
      { id: 3, name: 'Chi nhánh Quận 7' },
      { id: 4, name: 'Chi nhánh Thủ Đức' },
    ];

    return NextResponse.json({
      success: true,
      branches: fallbackBranches
    });
  }
}