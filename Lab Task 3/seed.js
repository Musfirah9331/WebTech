require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const User = require('./models/User');

const products = [
    { name: "Bismil 2Pc - Embroidered Lawn Dress", price: 8490, category: "New In", rating: 4.5, stock: 10, image: "img/img2.png" },
    { name: "Cardiff 3Pc - Embroidered Lawn Dress", price: 10990, category: "New In", rating: 4.3, stock: 8, image: "img/img3.png" },
    { name: "Cherry Puff 2Pc - Embroidered Lawn Dress", price: 7090, category: "New In", rating: 4.2, stock: 15, image: "img/img4.png" },
    { name: "Coraline 3Pc - Embroidered Lawn Dress", price: 11990, category: "New In", rating: 4.6, stock: 7, image: "img/img5.png" },
    { name: "Blue Jay 2Pc - Embroidered Lawn Dress", price: 8490, category: "New In", rating: 4.4, stock: 9, image: "img/img6.png" },
    { name: "Misty Lavender 2Pc - Printed Lawn Dress", price: 6990, category: "Lawn", rating: 4.1, stock: 12, image: "img/img7.png" },
    { name: "Shooting Star 2Pc - Embroidered Lawn Dress", price: 7690, category: "New In", rating: 4.3, stock: 20, image: "img/img8.png" },
    { name: "Pink Flora 2Pc - Embroidered Lawn Dress", price: 8490, category: "New In", rating: 4.5, stock: 6, image: "img/img9.png" },
    { name: "Vanilla Bloom 2Pc - Embroidered Lawn Dress", price: 8490, category: "New In", rating: 4.7, stock: 5, image: "img/img10.png" },
    { name: "Syrus 3Pc - Printed Lawn Dress", price: 9990, category: "Lawn", rating: 3.9, stock: 25, image: "img/img11.png" },
    { name: "Bano Sakhi 3Pc - Embroidered Lawn Dress", price: 12990, category: "New In", rating: 4.8, stock: 4, image: "img/img12.png" },
    { name: "Green Nazni 2Pc - Embroidered Lawn Dress", price: 6490, category: "New In", rating: 4.2, stock: 11, image: "img/img13.png" },
    { name: "Ciel 2Pc - Embroidered Lawn Dress", price: 7590, category: "New In", rating: 4.0, stock: 18, image: "img/img14.png" },
    { name: "Santro 2Pc - Embroidered Lawn Dress", price: 7490, category: "New In", rating: 4.3, stock: 14, image: "img/img2.png" },
    { name: "Pink Eclipse 3Pc - Festive Eid Pret", price: 14990, category: "Festive", rating: 4.6, stock: 7, image: "img/img3.png" },
    { name: "Kirara 2Pc - Printed Lawn Dress", price: 6490, category: "Lawn", rating: 3.8, stock: 22, image: "img/img4.png" },
    { name: "Anne 2Pc - Embroidered Lawn Dress", price: 8490, category: "New In", rating: 4.5, stock: 8, image: "img/img5.png" },
    { name: "Mint Dream 3Pc - Festive Embroidered Lawn", price: 12990, category: "Festive", rating: 4.7, stock: 5, image: "img/img6.png" },
    { name: "Yunna 2Pc - Printed Lawn Dress", price: 6490, category: "Lawn", rating: 3.7, stock: 30, image: "img/img7.png" },
    { name: "Black Ziva 3Pc - Festive Embroidered Lawn", price: 13990, category: "Festive", rating: 4.4, stock: 9, image: "img/img8.png" },
    { name: "Norway 3Pc - Embroidered Lawn Dress", price: 11990, category: "New In", rating: 4.6, stock: 7, image: "img/img9.png" },
    { name: "Purple Forest 3Pc - Festive Eid Pret", price: 16490, category: "Festive", rating: 4.9, stock: 2, image: "img/img10.png" },
    { name: "Ocean Pearl 2Pc - Embroidered Lawn", price: 7890, category: "Lawn", rating: 4.2, stock: 16, image: "img/img11.png" },
    { name: "Sapphire Dream 3Pc - New Collection", price: 13490, category: "New In", rating: 4.7, stock: 8, image: "img/img12.png" },
    { name: "Rose Whisper 2Pc - Printed Dress", price: 5990, category: "Lawn", rating: 3.9, stock: 28, image: "img/img13.png" },
    { name: "Emerald Elegance 3Pc - Luxe Pret", price: 18990, category: "Luxe Pret", rating: 4.8, stock: 3, image: "img/img14.png" },
    { name: "Golden Hour 2Pc - Embroidered", price: 9990, category: "New In", rating: 4.4, stock: 12, image: "img/img16.png" },
    { name: "Lavender Dreams 2Pc - Lawn", price: 6890, category: "Lawn", rating: 4.1, stock: 19, image: "img/img18.png" },
    { name: "Velvet Touch 3Pc - Festive Collection", price: 15490, category: "Festive", rating: 4.6, stock: 6, image: "img/img2.png" },
    { name: "Azure Sky 2Pc - New Arrival", price: 8290, category: "New In", rating: 4.3, stock: 13, image: "img/img3.png" },
    { name: "Silk Serenity 3Pc - Premium", price: 17990, category: "Luxe Pret", rating: 4.9, stock: 4, image: "img/img4.png" },
    { name: "Coral Sunset 2Pc - Embroidered", price: 7790, category: "New In", rating: 4.2, stock: 17, image: "img/img5.png" }
];

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        await Product.deleteMany({});
        await User.deleteMany({ role: 'admin' });
        
        await Product.insertMany(products);
        console.log('32 products added!');
        
        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await User.create({
            name: 'Admin User',
            email: 'admin@batik.com',
            password: hashedPassword,
            role: 'admin'
        });
        console.log('Admin user created: admin@batik.com / admin123');
        
        process.exit();
    })
    .catch(err => {
        console.log(' Error:', err);
        process.exit();
    });