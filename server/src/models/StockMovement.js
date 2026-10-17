import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    skuSnapshot: {
      type: String,
      required: true,
      trim: true
    },
    nameSnapshot: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['initial', 'stock_received', 'adjustment_increase', 'adjustment_decrease', 'sale'],
      required: true,
      index: true
    },
    quantityChange: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer quantity change'
      }
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer balanceBefore'
      }
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer balanceAfter'
      }
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    reference: {
      kind: {
        type: String,
        enum: ['sale', 'manual'],
        default: 'manual'
      },
      saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null
      },
      invoiceNumber: {
        type: String,
        default: null,
        index: true
      }
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Enforce append-only constraint: disallow update and delete operations
stockMovementSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], function () {
  throw new Error('StockMovement is an append-only audit log and cannot be updated.');
});

stockMovementSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], function () {
  throw new Error('StockMovement is an append-only audit log and cannot be deleted.');
});

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
