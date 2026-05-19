const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Product = require('../models/Product');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');

// PUBLIC: POST /api/v1/auth/login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { user_id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUBLIC: GET /api/v1/products
router.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || 999999;
        const sort = req.query.sort || 'default';

        let filter = { price: { $gte: minPrice, $lte: maxPrice } };
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (category) filter.category = category;

        let sortObj = {};
        if (sort === 'priceLow') sortObj = { price: 1 };
        else if (sort === 'priceHigh') sortObj = { price: -1 };
        else if (sort === 'nameAZ') sortObj = { name: 1 };
        else if (sort === 'nameZA') sortObj = { name: -1 };

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);
        const products = await Product.find(filter).sort(sortObj).skip(skip).limit(limit);

        res.json({ products, currentPage: page, totalPages, totalProducts });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }

});

// PUBLIC: GET /api/v1/products/:id
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ product });
    } catch (err) {
        res.status(500).json({ error: 'Invalid product ID or server error' });
    }
});

// PROTECTED: GET /api/v1/user/profile
router.get('/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.user_id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PROTECTED: POST /api/v1/orders
router.post('/orders', verifyToken, async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }

        const productIds = items.map(i => i.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        if (products.length !== items.length) {
            return res.status(400).json({ error: 'One or more products not found' });
        }

        let total = 0;
        const orderItems = items.map(item => {
            const product = products.find(p => p._id.toString() === item.productId);
            total += product.price * item.quantity;
            return {
                product: product.name,
                quantity: item.quantity,
                price: product.price
            };
        });

        res.status(201).json({
            message: 'Order placed successfully',
            order: {
                user_id: req.user.user_id,
                items: orderItems,
                total,
                placedAt: new Date()
            }
        });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
