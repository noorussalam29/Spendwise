import mongoose, { Schema } from 'mongoose';

const BudgetSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Food',
        'Transport',
        'Rent',
        'Shopping',
        'Data/Recharge',
        'EMI',
        'Family Support',
        'Savings',
        'Other',
      ],
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Monthly limit is required'],
      min: [0, 'Limit must be positive'],
    },
    month: {
      type: String,
      required: [true, 'Month is required in YYYY-MM format'],
      validate: {
        validator: function (v: string) {
          return /^\d{4}-\d{2}$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid month format! Use YYYY-MM.`,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate budgets for the same category in the same month for a user
BudgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
