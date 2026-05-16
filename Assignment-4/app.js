require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Product = require('./models/Product');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('DB Error:', err));

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ==================
// PUBLIC ROUTES
// ==================

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/products', async (req, res) => {
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

    res.render('products', {
        products, currentPage: page, totalPages,
        search, category, sort,
        minPrice: minPrice === 0 ? '' : minPrice,
        maxPrice: maxPrice === 999999 ? '' : maxPrice
    });
});

// ==================
// ADMIN ROUTES
// ==================

// Dashboard
app.get('/admin', async (req, res) => {
    const products = await Product.find();
    res.render('admin/dashboard', { products });
});

// Add product page
app.get('/admin/add', (req, res) => {
    res.render('admin/add');
});

// Add product submit
app.post('/admin/add', upload.single('image'), async (req, res) => {
    const { name, price, category, rating, stock } = req.body;
    const image = req.file ? 'uploads/' + req.file.filename : '';
    await Product.create({ name, price, category, rating, stock, image });
    res.redirect('/admin');
});

// Edit product page
app.get('/admin/edit/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('admin/edit', { product });
});

// Edit product submit
app.post('/admin/edit/:id', upload.single('image'), async (req, res) => {
    const { name, price, category, rating, stock } = req.body;
    const updateData = { name, price, category, rating, stock };
    if (req.file) updateData.image = 'uploads/' + req.file.filename;
    await Product.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin');
});

// Delete product
app.post('/admin/delete/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});