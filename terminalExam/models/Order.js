const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: String, default: 'guest' },
    items: [
        {
            product: String,
            quantity: Number,
            price: Number
        }
    ],
    total: { type: Number, required: true },
    placedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);