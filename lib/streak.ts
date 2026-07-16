import User from '@/models/User';

/**
 * Updates the user's daily logging streak.
 * Logic:
 * - If lastLoggedDate is null: Set streak to 1, lastLoggedDate to today.
 * - If lastLoggedDate is today: Do nothing (already logged today, maintain streak).
 * - If lastLoggedDate is yesterday: Increment streak by 1, set lastLoggedDate to today.
 * - If lastLoggedDate is older than yesterday: Reset streak to 1, set lastLoggedDate to today.
 * 
 * @param userId - The MongoDB ObjectId of the user
 * @param dateLogged - The date of the expense being logged (defaults to current date)
 */
export async function updateUserStreak(userId: string, dateLogged: Date = new Date()) {
  const user = await User.findById(userId);
  if (!user) return 0;

  // Normalize target date to midnight UTC/Local depending on app settings
  const today = new Date(dateLogged);
  today.setHours(0, 0, 0, 0);

  // Case 1: First time ever logging an expense
  if (!user.lastLoggedDate) {
    user.currentStreak = 1;
    user.lastLoggedDate = today;
    await user.save();
    return 1;
  }

  const lastLogged = new Date(user.lastLoggedDate);
  lastLogged.setHours(0, 0, 0, 0);

  // Calculate strict difference in calendar days
  const diffTime = today.getTime() - lastLogged.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let shouldSave = false;

  if (diffDays === 1) {
    // Case 2: Logged exactly the next consecutive calendar day
    user.currentStreak += 1;
    user.lastLoggedDate = today;
    shouldSave = true;
  } else if (diffDays > 1) {
    // Case 3: Streak broken (gap of 2+ days)
    user.currentStreak = 1;
    user.lastLoggedDate = today;
    shouldSave = true;
  } 
  // Note: diffDays === 0 (already logged today) or diffDays < 0 (backdated expense) 
  // requires no database write since dates and streaks match target states.

  if (shouldSave) {
    await user.save();
  }

  return user.currentStreak;
}