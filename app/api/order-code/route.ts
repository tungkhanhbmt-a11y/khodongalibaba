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
    const { date } = await request.json();
    const sheets = await getGoogleSheetsClient();

    // Read all existing orders to find the next sequence number for the date
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sales!A:A',
    });

    const values = response.data.values || [];
    
    // Filter orders for the specific date and find the highest sequence number
    const datePrefix = date.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
    const existingCodes = values
      .flat()
      .filter(code => code && typeof code === 'string' && code.startsWith(datePrefix))
      .map(code => {
        const parts = code.split('-');
        return parts.length === 2 ? parseInt(parts[1]) || 0 : 0;
      });

    // Get the next sequence number
    const nextSequence = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    const paddedSequence = nextSequence.toString().padStart(3, '0');
    
    // Generate the order code: YYYYMMDD-XXX
    const orderCode = `${datePrefix}-${paddedSequence}`;

    return NextResponse.json({
      success: true,
      orderCode
    });

  } catch (error) {
    console.error('Error generating order code:', error);
    
    // Fallback: generate basic code with timestamp
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 999) + 1;
    const paddedNum = randomNum.toString().padStart(3, '0');
    
    return NextResponse.json({
      success: true,
      orderCode: `${dateString}-${paddedNum}`
    });
  }
}