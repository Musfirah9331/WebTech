require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');

const apiRoutes = require('./routes/api');

const Product = require('./models/Product');
const User = require('./models/User');
const { isLoggedIn, isAdmin } = require('./middleware/auth');

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

app.use(express.json());

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// Flash
app.use(flash());

// Global variables — har view mein available honge
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

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

// API Routes (JWT-based)
app.use('/api/v1', apiRoutes);

// Cart API (session-based)
app.get('/api/cart', isLoggedIn, (req, res) => {
    const cart = req.session.cart || {};
    res.json({ cart });
});

app.post('/api/cart', isLoggedIn, (req, res) => {
    const { cart } = req.body;
    req.session.cart = cart;
    res.json({ success: true });
});

// ==================
// PUBLIC ROUTES
// ==================

app.get('/', (req, res) => {
    const loggedout = req.query.loggedout || false;
    res.render('index', { loggedout });
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
// AUTH ROUTES
// ==================

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        return res.redirect('/register');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        req.flash('error', 'Email already registered. Please login.');
        return res.redirect('/register');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.create({ name, email, password: hashedPassword });
    req.flash('success', 'Account created! Please log in.');
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    const loggedout = req.query.loggedout || false;
    res.render('login', { loggedout });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);
    const user = await User.findOne({ email });
    if (!user) {
        console.log('Login failed - no user');
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        console.log('Login failed - bad password for', email);
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
    }

    console.log('Login successful for', email);
    req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    };
    req.flash('success', `Welcome back, ${user.name}!`);
    // Redirect admins to admin panel, customers to home
    if (user.role === 'admin') {
        res.redirect('/admin');
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.redirect('/login?loggedout=true');
    });
});

// Checkout (protected)
app.get('/checkout', isLoggedIn, (req, res) => {
    res.render('checkout');
});

// ==================
// ADMIN ROUTES
// ==================

app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    res.render('admin/dashboard', { products });
});

app.get('/admin/add', isAdmin, (req, res) => {
    res.render('admin/add');
});

app.post('/admin/add', isAdmin, upload.single('image'), async (req, res) => {
    const { name, price, category, rating, stock } = req.body;
    const image = req.file ? 'uploads/' + req.file.filename : '';
    await Product.create({ name, price, category, rating, stock, image });
    res.redirect('/admin');
});

app.get('/admin/edit/:id', isAdmin, async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('admin/edit', { product });
});

app.post('/admin/edit/:id', isAdmin, upload.single('image'), async (req, res) => {
    const { name, price, category, rating, stock } = req.body;
    const updateData = { name, price, category, rating, stock };
    if (req.file) updateData.image = 'uploads/' + req.file.filename;
    await Product.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin');
});

app.post('/admin/delete/:id', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});