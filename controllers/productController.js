const Product = require('../models/Product');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

exports.getProducts = async (req, res) => {
  try {
    const { type, featured, page = 1, limit = 12, search } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;
    if (featured) query.featured = true;
    if (search) query.name = { $regex: search, $options: 'i' };
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });
    res.json({ products, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, type, variants, category, featured, tags } = req.body;
    const images = req.files?.length
      ? await Promise.all(req.files.map(f => uploadToCloudinary(f, 'saliheen/products').then(r => r.secure_url)))
      : [];
    const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    const product = await Product.create({
      name, description, type, images,
      variants: parsedVariants,
      category, featured: featured === 'true' || featured === true,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const { name, description, type, variants, category, featured, isActive, tags, existingImages } = req.body;
    const keepImages = existingImages
      ? (typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages)
      : [];
    const removedImages = product.images.filter(img => !keepImages.includes(img));
    await Promise.all(removedImages.map(deleteFromCloudinary));
    const newImages = req.files?.length
      ? await Promise.all(req.files.map(f => uploadToCloudinary(f, 'saliheen/products').then(r => r.secure_url)))
      : [];
    product.name = name || product.name;
    product.description = description || product.description;
    product.type = type || product.type;
    product.category = category || product.category;
    product.featured = featured === 'true' || featured === true;
    product.isActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : product.isActive;
    if (variants) product.variants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    if (tags) product.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    product.images = [...keepImages, ...newImages];
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await Promise.all(product.images.map(deleteFromCloudinary));
    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
