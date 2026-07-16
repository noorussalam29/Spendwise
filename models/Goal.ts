import mongoose, { Schema } from 'mongoose';

const GoalSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [0.01, 'Target amount must be greater than 0'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
