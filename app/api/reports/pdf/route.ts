import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import Budget from '@/models/Budget';
import User from '@/models/User';
import { jsPDF } from 'jspdf';

const formatPDFDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const dateParam = searchParams.get('date');

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    let startOfPeriod: Date;
    let endOfPeriod: Date;
    let reportPeriodLabel = '';
    let budgetMonthKey = '';
    let filenamePart: string;

    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return new Response(`Invalid date format received: "${dateParam}". Expected YYYY-MM-DD`, { status: 400 });
      }
      const [year, monthVal, dayVal] = dateParam.split('-').map(Number);
      startOfPeriod = new Date(Date.UTC(year, monthVal - 1, dayVal, 0, 0, 0, 0));
      endOfPeriod = new Date(Date.UTC(year, monthVal - 1, dayVal, 23, 59, 59, 999));

      reportPeriodLabel = startOfPeriod.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      budgetMonthKey = `${year}-${String(monthVal).padStart(2, '0')}`;
      filenamePart = dateParam;
    } else if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(`Invalid month format received: "${month}". Expected YYYY-MM`, { status: 400 });
      }
      const [year, monthStr] = month.split('-').map(Number);
      startOfPeriod = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0, 0));
      endOfPeriod = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));

      reportPeriodLabel = new Date(year, monthStr - 1, 1).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
      budgetMonthKey = month;
      filenamePart = month;
    } else {
      return new Response('Missing parameters: Either "month" (YYYY-MM) or "date" (YYYY-MM-DD) query parameter is required.', { status: 400 });
    }

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfPeriod, $lte: endOfPeriod },
    }).sort({ date: -1, createdAt: -1 });

    const budgets = await Budget.find({
      userId,
      month: budgetMonthKey,
    });

    const totalLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    let topCategoryName = 'None';
    let topCategoryAmt = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmt) {
        topCategoryAmt = amt;
        topCategoryName = cat;
      }
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cardFill = [255, 255, 255];
    const mintCash = [27, 67, 50];
    const pineLight = [45, 106, 79];
    const ivoryWhite = [28, 28, 26];
    const slateGray = [107, 107, 99];

    doc.setFillColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.rect(0, 0, 210, 45, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('SPENDWISE', 15, 18);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(dateParam ? 'DAILY FINANCIAL BREAKDOWN' : 'MONTHLY FINANCIAL BREAKDOWN', 15, 28);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`User: ${user.name}`, 195, 16, { align: 'right' });
    doc.text(`Email: ${user.email}`, 195, 22, { align: 'right' });
    doc.text(`Period: ${reportPeriodLabel}`, 195, 28, { align: 'right' });

    doc.setDrawColor(pineLight[0], pineLight[1], pineLight[2]);
    doc.line(0, 45, 210, 45);

    let yCursor = 58;

    const cardWidth = 56;
    const cardHeight = 24;
    const cardY = yCursor;

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(15, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text('TOTAL SPENT', 20, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
    doc.text(`INR ${totalSpent.toLocaleString('en-IN')}`, 20, cardY + 16);

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(77, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text(dateParam ? 'MONTHLY BUDGET' : 'BUDGET LIMIT', 82, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
    const limitLabel = totalLimit > 0 ? `INR ${totalLimit.toLocaleString('en-IN')}` : 'Unset';
    doc.text(limitLabel, 82, cardY + 16);

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(139, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text('LARGEST OUTFLOW', 144, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
    const topCatString = topCategoryName !== 'None' ? `${topCategoryName}` : 'None';
    doc.text(topCatString, 144, cardY + 14);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text(`Spent: INR ${topCategoryAmt.toLocaleString('en-IN')}`, 144, cardY + 20);

    yCursor += cardHeight + 15;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
    doc.text('CATEGORY BREAKDOWN', 15, yCursor);
    yCursor += 5;

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(15, yCursor, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.text('Category', 20, yCursor + 5.5);
    doc.text('Spent Amount', 110, yCursor + 5.5, { align: 'right' });
    doc.text('% of Period Total', 190, yCursor + 5.5, { align: 'right' });
    yCursor += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);

    const breakdownItems = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    if (breakdownItems.length === 0) {
      doc.text('No transaction logs for this period.', 20, yCursor + 6);
      yCursor += 12;
    } else {
      breakdownItems.forEach(([cat, amt]) => {
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0';
        doc.line(15, yCursor, 195, yCursor);
        doc.text(cat, 20, yCursor + 5);
        doc.text(`INR ${amt.toLocaleString('en-IN')}`, 110, yCursor + 5, { align: 'right' });
        doc.text(`${pct}%`, 190, yCursor + 5, { align: 'right' });
        yCursor += 8;
      });
      doc.line(15, yCursor, 195, yCursor);
      yCursor += 12;
    }

    if (yCursor > 220) {
      doc.addPage();
      yCursor = 25;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
    doc.text('ITEMIZED TRANSACTIONS LEDGER', 15, yCursor);
    yCursor += 5;

    doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
    doc.rect(15, yCursor, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.text('Date', 20, yCursor + 5.5);
    doc.text('Title & Category', 50, yCursor + 5.5);
    doc.text('Recurring', 140, yCursor + 5.5);
    doc.text('Amount', 190, yCursor + 5.5, { align: 'right' });
    yCursor += 8;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);

    if (expenses.length === 0) {
      doc.text('No itemized transactions logged.', 20, yCursor + 6);
    } else {
      expenses.forEach((e) => {
        if (yCursor > 270) {
          doc.addPage();
          yCursor = 20;

          doc.setFillColor(cardFill[0], cardFill[1], cardFill[2]);
          doc.rect(15, yCursor, 180, 8, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
          doc.text('Date', 20, yCursor + 5.5);
          doc.text('Title & Category', 50, yCursor + 5.5);
          doc.text('Recurring', 140, yCursor + 5.5);
          doc.text('Amount', 190, yCursor + 5.5, { align: 'right' });
          yCursor += 8;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
        }

        doc.line(15, yCursor, 195, yCursor);

        doc.text(formatPDFDate(e.date), 20, yCursor + 5.5);

        let titleString = e.title;
        if (titleString.length > 36) titleString = titleString.substring(0, 33) + '...';
        doc.text(titleString, 50, yCursor + 4.5);

        doc.setFontSize(6.5);
        doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
        doc.text(e.category, 50, yCursor + 8);
        doc.setFontSize(8);
        doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);

        doc.text(e.isRecurring ? 'Yes' : 'No', 140, yCursor + 5.5);
        doc.text(`INR ${e.amount.toLocaleString('en-IN')}`, 190, yCursor + 5.5, { align: 'right' });
        yCursor += 10;
      });
      doc.line(15, yCursor, 195, yCursor);
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="spendwise-report-${filenamePart}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('PDF Export API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}