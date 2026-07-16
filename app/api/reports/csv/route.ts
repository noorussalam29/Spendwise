import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';

// Helper to escape CSV cell contents safely
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // If value contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // Expects "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response('Invalid month parameter', { status: 400 });
    }

    await dbConnect();

    // 1. Fetch expenses for the target calendar month
    const [year, monthStr] = month.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1, createdAt: -1 });

    // 2. Generate CSV rows
    const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Notes', 'Is Recurring'];
    const rows = expenses.map((e) => {
      const dateFormatted = new Date(e.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return [
        escapeCSV(dateFormatted),
        escapeCSV(e.title),
        escapeCSV(e.category),
        escapeCSV(e.amount),
        escapeCSV(e.notes || ''),
        escapeCSV(e.isRecurring ? 'Yes' : 'No'),
      ];
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // 3. Return CSV file as a downloadable response
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="spendwise-export-${month}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('CSV Export API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
