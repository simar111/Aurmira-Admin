const fs = require('fs');
const mongoose = require('mongoose');
const { connectToDB } = require('../db');
const ProductModel = require('../models/Product');
const multer = require('multer');

// Initialize the Product model with the database connection
let Product;
const initializeDB = async () => {
  try {
    const connection = await connectToDB();
    Product = ProductModel(connection);
    console.log('Product model initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Product model:', error);
    throw error;
  }
};

// Call initializeDB when the server starts
initializeDB().catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});

const addProduct = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const {
      title,
      tagline,
      description,
      price,
      category,
      subcategory,
      sizesAvailable,
      totalQuantity
    } = req.body;
    const files = req.files;

    // Validate required fields
    if (!title || !price || !category || !sizesAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, category, and sizesAvailable are required'
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative number'
      });
    }

    // Parse sizesAvailable
    let parsedSizes;
    try {
      parsedSizes = typeof sizesAvailable === 'string'
        ? JSON.parse(sizesAvailable)
        : sizesAvailable;

      if (!Array.isArray(parsedSizes) || parsedSizes.length === 0) {
        throw new Error();
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: 'sizesAvailable must be a valid non-empty JSON array'
      });
    }

    // Validate each size entry
    for (const entry of parsedSizes) {
      if (
        !entry.size ||
        typeof entry.size !== 'string' ||
        !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(entry.size) ||
        typeof entry.quantity !== 'number' ||
        entry.quantity < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each size must include a valid size (XS, S, M, L, XL, XXL) and quantity (non-negative number)'
        });
      }
    }

    // Calculate totalQuantity if not provided
    const computedTotal = parsedSizes.reduce((sum, s) => sum + s.quantity, 0);
    const finalTotalQuantity =
      totalQuantity !== undefined
        ? parseInt(totalQuantity)
        : computedTotal;

    if (isNaN(finalTotalQuantity) || finalTotalQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total quantity must be a non-negative number'
      });
    }

    // Check for existing product (basic match)
    const existingProduct = await Product.findOne({
      title,
      description,
      category,
      subcategory
    });

    if (existingProduct) {
      // If exists, update total quantity and merge sizes
      parsedSizes.forEach(newSize => {
        const existing = existingProduct.sizesAvailable.find(
          s => s.size === newSize.size
        );
        if (existing) {
          existing.quantity += newSize.quantity;
        } else {
          existingProduct.sizesAvailable.push(newSize);
        }
      });

      existingProduct.totalQuantity += computedTotal;
      await existingProduct.save();

      return res.status(200).json({
        success: true,
        message: 'Product already exists. Quantity updated.',
        product: existingProduct
      });
    }

    // Check image uploads
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product image is required'
      });
    }

    if (files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum of 5 images allowed per product'
      });
    }

    const images = files.map(file => ({
      data: file.buffer,
      contentType: file.mimetype
    }));

    // Create new product
    const newProduct = new Product({
      title,
      tagline,
      description,
      price: parsedPrice,
      category,
      subcategory,
      sizesAvailable: parsedSizes,
      totalQuantity: finalTotalQuantity,
      images
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'New product added successfully',
      product: newProduct
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded. Maximum 5 images allowed.'
        });
      }
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 5MB limit.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Multer error: ${error.message}`
      });
    }

    res.status(500).json({
      success: false,
      message: `Error adding product: ${error.message}`,
      error: error
    });
  }
};

// Get all products (GET API - Simple Version)
const getProducts = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const products = await Product.find({});

    const productList = products.map(product => ({
      id: product._id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      images: product.images && Array.isArray(product.images)
        ? product.images.map(image => ({
            contentType: image.contentType,
            data: image.data.toString('base64')
          }))
        : [],
      sizesAvailable: product.sizesAvailable,
      totalQuantity: product.totalQuantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.status(200).json(productList);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products', error: error.message });
  }
};

// Get all products (GET API - Detailed Version)
const getAllProducts = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const products = await Product.find();

    const productList = products.map(product => ({
      _id: product._id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      images: product.images && Array.isArray(product.images)
        ? product.images.map(image => ({
            contentType: image.contentType,
            data: image.data.toString('base64')
          }))
        : [],
      sizesAvailable: product.sizesAvailable,
      totalQuantity: product.totalQuantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      products: productList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving products', error: error.message });
  }
};

// Get total number of products (GET API)
const getProductCount = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const totalProducts = await Product.countDocuments();
    res.status(200).json({
      success: true,
      message: 'Total product count retrieved successfully',
      totalProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving product count',
      error: error.message
    });
  }
};

// Delete a product (DELETE API)
const deleteProduct = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct: {
        id: product._id,
        title: product.title,
        category: product.category,
        subcategory: product.subcategory,
        totalQuantity: product.totalQuantity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
  }
};

// Get product by ID (GET API)
const getProductById = async (req, res) => {
  try {
    if (!Product) {
      throw new Error('Product model not initialized');
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const productData = {
      id: product._id,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      images: product.images && Array.isArray(product.images)
        ? product.images.map(image => ({
            contentType: image.contentType,
            data: image.data.toString('base64')
          }))
        : [],
      sizesAvailable: product.sizesAvailable,
      totalQuantity: product.totalQuantity,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      product: productData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving product',
      error: error.message
    });
  }
};

module.exports = { addProduct, getProducts, getAllProducts, getProductCount, deleteProduct, getProductById };