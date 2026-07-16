import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import Budget from '@/models/Budget';
import User from '@/models/User';
import { jsPDF } from 'jspdf';

// Helper to format date
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
    const month = searchParams.get('month'); // Expects "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response('Invalid month parameter', { status: 400 });
    }

    await dbConnect();

    // 1. Fetch User details
    const user = await User.findById(userId);
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // 2. Fetch expenses and budgets for that month
    const [year, monthStr] = month.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1, createdAt: -1 });

    const budgets = await Budget.find({
      userId,
      month,
    });

    const totalLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    // Find top category
    let topCategoryName = 'None';
    let topCategoryAmt = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmt) {
        topCategoryAmt = amt;
        topCategoryName = cat;
      }
    });

    // 3. Instantiate jsPDF Document (A4 portrait dimensions: 210mm x 297mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // --- Styling Variables ---
    const primaryDark = [9, 13, 20]; // Deep Charcoal #090D14
    const cardBg = [19, 25, 36]; // Card slate background #131924
    const mintCash = [5, 211, 147]; // Accent Mint #05D393
    const textLight = [241, 245, 249]; // Primary text #F1F5F9
    const textGray = [100, 116, 139]; // Muted text #64748B
    const lineStroke = [30, 41, 59]; // Border gray #1E293B

    // Draw header panel banner
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(0, 0, 210, 45, 'F');

    // Wordmark logo text
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.text('SPENDWISE', 15, 18);

    // Document label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('MONTHLY FINANCIAL BREAKDOWN', 15, 28);

    // Profile metadata info aligned to the right
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`User: ${user.name}`, 195, 16, { align: 'right' });
    doc.text(`Email: ${user.email}`, 195, 22, { align: 'right' });
    
    const reportPeriodLabel = new Date(year, monthStr - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Period: ${reportPeriodLabel}`, 195, 28, { align: 'right' });

    // Draw a dividing line under header banner
    doc.setDrawColor(lineStroke[0], lineStroke[1], lineStroke[2]);
    doc.line(0, 45, 210, 45);

    let yCursor = 58;

    // --- KPI Cards Section ---
    // Draw 3 cards: Total Spent, Total Budget, Top Category
    const cardWidth = 56;
    const cardHeight = 24;
    const cardY = yCursor;

    // Card 1: Total Spent
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(15, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('TOTAL SPENT', 20, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`INR ${totalSpent.toLocaleString('en-IN')}`, 20, cardY + 16);

    // Card 2: Total Budget
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(77, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('BUDGET LIMIT', 82, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    const limitLabel = totalLimit > 0 ? `INR ${totalLimit.toLocaleString('en-IN')}` : 'Unset';
    doc.text(limitLabel, 82, cardY + 16);

    // Card 3: Top Category
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(139, cardY, cardWidth, cardHeight, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('LARGEST OUTFLOW', 144, cardY + 7);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    const topCatString = topCategoryName !== 'None' ? `${topCategoryName}` : 'None';
    doc.text(topCatString, 144, cardY + 14);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`Spent: INR ${topCategoryAmt.toLocaleString('en-IN')}`, 144, cardY + 20);

    yCursor += cardHeight + 15;

    // --- Category Breakdown Grid Section ---
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('CATEGORY BREAKDOWN', 15, yCursor);
    yCursor += 5;

    // Table Header
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(15, yCursor, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.text('Category', 20, yCursor + 5.5);
    doc.text('Spent Amount', 110, yCursor + 5.5, { align: 'right' });
    doc.text('% of Month Total', 190, yCursor + 5.5, { align: 'right' });
    yCursor += 8;

    // Draw rows
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);

    const breakdownItems = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    if (breakdownItems.length === 0) {
      doc.text('No transaction logs for this month.', 20, yCursor + 6);
      yCursor += 12;
    } else {
      breakdownItems.forEach(([cat, amt]) => {
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : '0';
        doc.line(15, yCursor, 195, yCursor); // border bottom
        doc.text(cat, 20, yCursor + 5);
        doc.text(`INR ${amt.toLocaleString('en-IN')}`, 110, yCursor + 5, { align: 'right' });
        doc.text(`${pct}%`, 190, yCursor + 5, { align: 'right' });
        yCursor += 8;
      });
      doc.line(15, yCursor, 195, yCursor);
      yCursor += 12;
    }

    // --- Itemized Transactions Ledger Section ---
    // Check if yCursor is too close to the bottom before starting the ledger
    if (yCursor > 220) {
      doc.addPage();
      yCursor = 25;
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('ITEMIZED TRANSACTIONS LEDGER', 15, yCursor);
    yCursor += 5;

    // Table Header
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.rect(15, yCursor, 180, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(mintCash[0], mintCash[1], mintCash[2]);
    doc.text('Date', 20, yCursor + 5.5);
    doc.text('Title & Category', 50, yCursor + 5.5);
    doc.text('Recurring', 140, yCursor + 5.5);
    doc.text('Amount', 190, yCursor + 5.5, { align: 'right' });
    yCursor += 8;

    // Draw rows with multi-page wrap check
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);

    if (expenses.length === 0) {
      doc.text('No itemized transactions logged.', 20, yCursor + 6);
    } else {
      expenses.forEach((e) => {
        // Page break checker
        if (yCursor > 270) {
          doc.addPage();
          yCursor = 20;

          // Redraw table headers on the new page
          doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
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
          doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        }

        doc.line(15, yCursor, 195, yCursor);
        
        // Date
        doc.text(formatPDFDate(e.date), 20, yCursor + 5.5);
        
        // Title (truncated if too long to fit layout)
        let titleString = e.title;
        if (titleString.length > 36) titleString = titleString.substring(0, 33) + '...';
        doc.text(titleString, 50, yCursor + 4.5);
        // Category below title
        doc.setFontSize(6.5);
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        doc.text(e.category, 50, yCursor + 8);
        doc.setFontSize(8);
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);

        // Recurring status
        doc.text(e.isRecurring ? 'Yes' : 'No', 140, yCursor + 5.5);

        // Amount
        doc.text(`INR ${e.amount.toLocaleString('en-IN')}`, 190, yCursor + 5.5, { align: 'right' });
        yCursor += 10;
      });
      doc.line(15, yCursor, 195, yCursor);
    }

    // 4. Return PDF array buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="spendwise-report-${month}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('PDF Export API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
