const db = require('./db')

const pointVoucherSchema = new db.mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  pointsCost: { 
    type: Number, 
    required: true 
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'fixed'],
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true 
  },
  minOrderValue: { 
    type: Number, 
    default: 0 
  },
  maxDiscount: { 
    type: Number 
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  redeemedCount: { 
    type: Number, 
    default: 0 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  createdBy: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

const pointVoucher = db.mongoose.model('pointvoucher', pointVoucherSchema)
module.exports = { pointVoucher } 