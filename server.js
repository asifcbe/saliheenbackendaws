const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/landing', require('./routes/landing'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/payment', require('./routes/payment'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Saliheen API is running' }));

const seedAdmin = async () => {
  const User = require('./models/User');
  const exists = await User.findOne({ email: 'saliheenperfumes@gmail.com' });
  if (!exists) {
    await User.create({
      name: 'saliheenadmin',
      email: 'saliheenperfumes@gmail.com',
      password: 'saliheencbe123',
      isAdmin: true
    });
    console.log('✅ Admin account created');
  }
};

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/saliheen')
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedAdmin();
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
