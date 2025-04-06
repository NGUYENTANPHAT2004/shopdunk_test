const db = require('./db');

const redemptionHistorySchema = new db.mongoose.Schema({
  userId: { 
    type: db.mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  phone: { 
    type: String,
    required: true 
  },
  redemptionId: { 
    type: db.mongoose.Schema.Types.ObjectId, 
    ref: 'PointsRedemption',
    required: true 
  },
  voucherId: { 
    type: db.mongoose.Schema.Types.ObjectId, 
    ref: 'magiamgia' 
  },
  pointsSpent: { 
    type: Number, 
    required: true 
  },
  redemptionDate: { 
    type: Date, 
    default: Date.now 
  },
  voucherCode: { 
    type: String 
  },
  expiryDate: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'used', 'expired'], 
    default: 'active' 
  },
  usedDate: { 
    type: Date 
  },
  usedOrderId: { 
    type: db.mongoose.Schema.Types.ObjectId, 
    ref: 'hoadon' 
  }
});

// Create indexes for better query performance
redemptionHistorySchema.index({ userId: 1 });
redemptionHistorySchema.index({ phone: 1 });
redemptionHistorySchema.index({ voucherCode: 1 });

const RedemptionHistory = db.mongoose.model('RedemptionHistory', redemptionHistorySchema);
module.exports = { RedemptionHistory };