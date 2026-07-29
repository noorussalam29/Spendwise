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
      filenamePart = `day-${dateParam}`;
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
      filenamePart = `month-${month}`;
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

    const mintCash = [27, 67, 50];
    const pineLight = [45, 106, 79];
    const ivoryWhite = [40, 40, 38];
    const slateGray = [110, 110, 100];
    const lightGrayBg = [248, 249, 250];

    // Header Banner
    doc.setFillColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.rect(0, 0, 210, 42, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('SPENDWISE', 15, 16);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(200, 230, 210);
    doc.text(dateParam ? 'DAILY FINANCIAL STATEMENT' : 'MONTHLY FINANCIAL STATEMENT', 15, 24);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(240, 240, 240);
    doc.text(`User: ${user.name}`, 195, 13, { align: 'right' });
    doc.text(`Email: ${user.email}`, 195, 19, { align: 'right' });
    doc.text(`Period: ${reportPeriodLabel}`, 195, 25, { align: 'right' });

    doc.setDrawColor(pineLight[0], pineLight[1], pineLight[2]);
    doc.line(0, 42, 210, 42);

    let yCursor = 52;

    // Summary Cards Section (3 columns)
    const cardWidth = 56;
    const cardHeight = 22;
    const cardY = yCursor;
    const leftMargin = 15;
    const gap = 6;

    const cards = [
      {
        title: 'TOTAL SPENT',
        value: `INR ${totalSpent.toLocaleString('en-IN')}`,
      },
      {
        title: dateParam ? 'MONTHLY BUDGET' : 'BUDGET LIMIT',
        value: totalLimit > 0 ? `INR ${totalLimit.toLocaleString('en-IN')}` : 'Unset',
      },
      {
        title: 'LARGEST OUTFLOW',
        value: topCategoryName !== 'None' ? `${topCategoryName}` : 'None',
        sub: topCategoryName !== 'None' ? `INR ${topCategoryAmt.toLocaleString('en-IN')}` : '',
      },
    ];

    cards.forEach((card, index) => {
      const xPos = leftMargin + index * (cardWidth + gap);
      
      doc.setFillColor(lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]);
      doc.setDrawColor(225, 230, 235);
      doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
      doc.text(card.title, xPos + 5, cardY + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
      doc.text(card.value, xPos + 5, cardY + 15);

      if (card.sub) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
        doc.text(card.sub, xPos + 5, cardY + 19);
      }
    });

    yCursor += cardHeight + 12;

    const renderSectionHeader = (title: string) => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
      doc.text(title, 15, yCursor);
      yCursor += 4;
    };

    // Category Breakdown Table
    renderSectionHeader('CATEGORY BREAKDOWN');

    doc.setFillColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.rect(15, yCursor, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Category', 20, yCursor + 4.8);
    doc.text('Spent Amount', 115, yCursor + 4.8, { align: 'right' });
    doc.text('% of Total', 190, yCursor + 4.8, { align: 'right' });
    yCursor += 7;

    const breakdownItems = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    if (breakdownItems.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
      yCursor += 6;
      doc.text('No transaction logs for this period.', 20, yCursor);
      yCursor += 10;
    } else {
      breakdownItems.forEach(([cat, amt], idx) => {
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0';
        
        if (idx % 2 === 0) {
          doc.setFillColor(252, 253, 253);
          doc.rect(15, yCursor, 180, 7, 'F');
        }

        doc.setDrawColor(235, 240, 242);
        doc.line(15, yCursor + 7, 195, yCursor + 7);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
        doc.text(cat, 20, yCursor + 4.8);
        doc.text(`INR ${amt.toLocaleString('en-IN')}`, 115, yCursor + 4.8, { align: 'right' });
        doc.text(`${pct}%`, 190, yCursor + 4.8, { align: 'right' });
        yCursor += 7;
      });
      yCursor += 10;
    }

    if (yCursor > 230) {
      doc.addPage();
      yCursor = 20;
    }

    // Itemized Transactions Ledger
    renderSectionHeader('ITEMIZED TRANSACTIONS LEDGER');

    doc.setFillColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.rect(15, yCursor, 180, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Date', 20, yCursor + 4.8);
    doc.text('Title & Category', 55, yCursor + 4.8);
    doc.text('Recurring', 140, yCursor + 4.8);
    doc.text('Amount', 190, yCursor + 4.8, { align: 'right' });
    yCursor += 7;

    if (expenses.length === 0) {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
      yCursor += 6;
      doc.text('No itemized transactions logged.', 20, yCursor);
    } else {
      expenses.forEach((e, idx) => {
        if (yCursor > 270) {
          doc.addPage();
          yCursor = 20;

          doc.setFillColor(mintCash[0], mintCash[1], mintCash[2]);
          doc.rect(15, yCursor, 180, 7, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('Date', 20, yCursor + 4.8);
          doc.text('Title & Category', 55, yCursor + 4.8);
          doc.text('Recurring', 140, yCursor + 4.8);
          doc.text('Amount', 190, yCursor + 4.8, { align: 'right' });
          yCursor += 7;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(252, 253, 253);
          doc.rect(15, yCursor, 180, 10, 'F');
        }

        doc.setDrawColor(235, 240, 242);
        doc.line(15, yCursor + 10, 195, yCursor + 10);

        // Ensure normal font for row data
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);

        doc.text(formatPDFDate(e.date), 20, yCursor + 6);

        let titleString = e.title;
        if (titleString.length > 35) titleString = titleString.substring(0, 32) + '...';
        doc.text(titleString, 55, yCursor + 4.5);

        doc.setFontSize(7);
        doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
        doc.text(e.category, 55, yCursor + 8.5);

        doc.setFontSize(8.5);
        doc.setTextColor(ivoryWhite[0], ivoryWhite[1], ivoryWhite[2]);
        doc.text(e.isRecurring ? 'Yes' : 'No', 140, yCursor + 6);
        doc.text(`INR ${e.amount.toLocaleString('en-IN')}`, 190, yCursor + 6, { align: 'right' });
        
        yCursor += 10;
      });
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