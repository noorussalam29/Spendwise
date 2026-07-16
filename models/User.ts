import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    payday: {
      type: Number,
      default: 1,
      min: [1, 'Payday must be between 1 and 31'],
      max: [31, 'Payday must be between 1 and 31'],
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    lastLoggedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Prevent compiling model multiple times in development hot-reload
export default mongoose.models.User || mongoose.model('User', UserSchema);
