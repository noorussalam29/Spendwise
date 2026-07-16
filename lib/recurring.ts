import Expense from '@/models/Expense';

/**
 * ARCHITECTURAL TRADEOFFS OF CHECK-ON-LOGIN / CHECK-ON-REQUEST RECURRING EXPENSES
 * 
 * Tradeoffs of this check-on-request approach:
 * 1. Simplicity & Serverless Compatibility (Pro):
 *    - In serverless environments like Vercel, running persistent background daemons is difficult or requires external services.
 *    - Triggering the check when the user logs in or loads their dashboard requires zero infrastructure overhead.
 * 2. Laziness & Latency (Con):
 *    - The processing happens synchronously during a user request, which might add a small latency (a few milliseconds) to that specific page load.
 *    - If a user doesn't log in for 3 months, the expenses are not generated in the database until they log in. 
 * 
 * Production Alternatives:
 * - A Cron Job (e.g., Vercel Cron, GitHub Actions, AWS EventBridge) that runs once a day at midnight, invokes a secure API endpoint (`/api/jobs/recurring`), and updates all accounts.
 * - A distributed message queue (e.g., BullMQ with Redis, or QStash) that schedules jobs to run at exact timestamps in the future, providing retry guarantees and strict concurrency limits.
 */

export async function checkAndGenerateRecurringExpenses(userId: string) {
  try {
    // 1. Fetch all template recurring expenses for the user
    // We treat any expense with isRecurring = true as a template and a ledger item.
    const recurringTemplates = await Expense.find({
      userId,
      isRecurring: true,
      // Only process monthly recurrence for now
      recurringFrequency: 'monthly',
    });

    if (recurringTemplates.length === 0) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 6 = Jul)

    for (const template of recurringTemplates) {
      const startDate = new Date(template.date);
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();

      // Loop through each month from the template's start date to the current date
      let tempYear = startYear;
      let tempMonth = startMonth;

      while (
        tempYear < currentYear ||
        (tempYear === currentYear && tempMonth <= currentMonth)
      ) {
        // Skip the original month (since the template itself is the transaction for that month)
        if (tempYear === startYear && tempMonth === startMonth) {
          tempMonth++;
          if (tempMonth > 11) {
            tempMonth = 0;
            tempYear++;
          }
          continue;
        }

        // Define start and end of the target check month in UTC
        const checkStart = new Date(Date.UTC(tempYear, tempMonth, 1, 0, 0, 0));
        const checkEnd = new Date(Date.UTC(tempYear, tempMonth + 1, 0, 23, 59, 59, 999));

        // Check if an expense already exists for this template in the target month
        // We match by title, amount, category, and userId to determine if it has already been generated
        const existingOccurrence = await Expense.findOne({
          userId,
          title: template.title,
          amount: template.amount,
          category: template.category,
          date: { $gte: checkStart, $lte: checkEnd },
        });

        if (!existingOccurrence) {
          // Determine the target date: keep the same day of month, cap at last day of target month
          const targetDay = startDate.getDate();
          const targetDate = new Date(tempYear, tempMonth, targetDay);
          
          // If the day overflowed (e.g. 31st in a 30-day month), cap it to the last day of the month
          if (targetDate.getMonth() !== tempMonth) {
            targetDate.setDate(0); // Sets to the last day of the previous month
          }

          // Create the auto-generated expense
          await Expense.create({
            userId,
            title: template.title,
            amount: template.amount,
            category: template.category,
            date: targetDate,
            notes: `Auto-generated recurring payment: ${template.title}`,
            isRecurring: true,
            recurringFrequency: 'monthly',
          });
        }

        // Advance to next month
        tempMonth++;
        if (tempMonth > 11) {
          tempMonth = 0;
          tempYear++;
        }
      }
    }
  } catch (error) {
    console.error('Error generating recurring expenses:', error);
  }
}
