import mongoose, { Schema } from 'mongoose';

const MonthlyIncomeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
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
    monthlyIncome: {
      type: Number,
      required: [true, 'Monthly income is required'],
      min: [0, 'Monthly income must be positive'],
    },
    payday: {
      type: Number,
      required: [true, 'Payday is required'],
      min: [1, 'Payday must be between 1 and 31'],
      max: [31, 'Payday must be between 1 and 31'],
    },
  },
  {
    timestamps: true,
  }
);

MonthlyIncomeSchema.index({ userId: 1, month: 1 }, { unique: true });

export default mongoose.models.MonthlyIncome ||
  mongoose.model('MonthlyIncome', MonthlyIncomeSchema);
