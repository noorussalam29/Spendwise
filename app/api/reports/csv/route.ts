import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';

// Helper to escape CSV cell contents safely
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
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
    const dateParam = searchParams.get('date'); // Expects "YYYY-MM-DD"

    await dbConnect();

    let startOfPeriod: Date;
    let endOfPeriod: Date;
    let filenamePart: string;

    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return new Response(`Invalid date format received: "${dateParam}". Expected YYYY-MM-DD`, { status: 400 });
      }
      const [year, monthVal, dayVal] = dateParam.split('-').map(Number);
      startOfPeriod = new Date(Date.UTC(year, monthVal - 1, dayVal, 0, 0, 0, 0));
      endOfPeriod = new Date(Date.UTC(year, monthVal - 1, dayVal, 23, 59, 59, 999));
      filenamePart = `day-${dateParam}`;
    } else if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(`Invalid month format received: "${month}". Expected YYYY-MM`, { status: 400 });
      }
      const [year, monthStr] = month.split('-').map(Number);
      startOfPeriod = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0, 0));
      endOfPeriod = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));
      filenamePart = `month-${month}`;
    } else {
      return new Response('Missing parameters: Either "month" (YYYY-MM) or "date" (YYYY-MM-DD) query parameter is required.', { status: 400 });
    }

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfPeriod, $lte: endOfPeriod },
    }).sort({ date: -1, createdAt: -1 });

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

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="spendwise-export-${filenamePart}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('CSV Export API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}