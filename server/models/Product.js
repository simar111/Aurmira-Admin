const mongoose = require('mongoose');

// --- Size Stock Schema ---
const sizeStockSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], // Extend as needed
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

// --- Product Schema ---
const productSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  tagline: { 
    type: String,
    trim: true,
    maxlength: 150,
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 2000,
  },
  price: { 
    type: Number, 
    required: true,
    min: 0,
  },
  category: { 
    type: String, 
    required: true,
    trim: true,
    enum: [
      'Shirts', 'T-Shirts', 'Jeans', 'Trousers', 
      'Jackets', 'Ethnic Wear', 'Activewear', 
      'Accessories', 'Hoodies'
    ],
  },
  subcategory: { 
    type: String, 
    trim: true,
  },
  sizesAvailable: {
    type: [sizeStockSchema],
    required: true,
    validate: v => Array.isArray(v) && v.length > 0,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  images: [{
    data: { 
      type: Buffer,
      required: true,
    },
    contentType: { 
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    },
  }],
  createdAt: { 
    type: Date, 
    default: Date.now,
  },
}, {
  timestamps: true,
});

// --- Validations ---
productSchema.path('images').validate(function (images) {
  return images.length <= 5;
}, 'A product can have a maximum of 5 images.');

// --- Indexes ---
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ createdAt: -1 });

// --- Middleware ---
productSchema.pre('save', function (next) {
  if (this.sizesAvailable && (!this.totalQuantity || this.totalQuantity === 0)) {
    this.totalQuantity = this.sizesAvailable.reduce((sum, s) => sum + s.quantity, 0);
  }
  next();
});

// --- Export Factory Function ---
module.exports = (connection) => {
  return connection.model('Product', productSchema);
};