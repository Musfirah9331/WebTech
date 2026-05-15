require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(' MongoDB connected'))
    .catch(err => console.log(' DB Error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// Products route
app.get('/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const category = req.query.category || '';
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 999999;
    const sort = req.query.sort || 'default';

    let filter = {
        price: { $gte: minPrice, $lte: maxPrice }
    };
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
        products,
        currentPage: page,
        totalPages,
        search,
        category,
        sort,
        minPrice: minPrice === 0 ? '' : minPrice,
        maxPrice: maxPrice === 999999 ? '' : maxPrice
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});