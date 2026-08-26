const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 5.0
    },
    image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80'
    },
    desc: {
        type: String,
        default: 'A premium product from our store.'
    },
    externalLink: {
        type: String,
        default: '#'
    },
    storeName: {
        type: String,
        default: 'OMS Store'
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
