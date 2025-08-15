const express = require('express');
const router = express.Router();
const { addProduct, getAllProducts, getProductCount, deleteProduct, getProductById } = require('../controllers/productController');
const multer = require('multer');

// Configure Multer for multiple file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
    }
  }
});

// Routes
router.post('/add', upload.array('images', 5), addProduct); // Add a new product
router.get('/', getAllProducts); // Get all products
router.get('/count', getProductCount); // Get total product count
router.delete('/:id', deleteProduct); // Delete a product by ID
router.get('/:id', getProductById); // Get a product by ID

module.exports = router;