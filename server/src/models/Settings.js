import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'Greenfield Grocers',
      trim: true
    },
    taxRate: {
      type: Number,
      default: 5,
      min: 0
    },
    currencySymbol: {
      type: String,
      default: '₹',
      trim: true
    },
    staffMaxDiscountPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

export const Settings = mongoose.model('Settings', settingsSchema);
