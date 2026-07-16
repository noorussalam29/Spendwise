import mongoose, { Schema } from 'mongoose';

const ExpenseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
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
        message: '{VALUE} is not a valid category',
      },
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: {
        values: ['monthly', null, ''],
        message: '{VALUE} is not a valid recurring frequency',
      },
      required: function (this: any) {
        return this.isRecurring;
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
