require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const filmRoutes = require('./routes/film.routes');
const seriesRoutes = require('./routes/series.routes');
const eventRoutes = require('./routes/event.routes');
const resourceRoutes = require('./routes/resource.routes');
const ticketRoutes = require('./routes/ticket.routes');
const donationRoutes = require('./routes/donation.routes');
const productRoutes = require('./routes/product.routes');
const kidsRoutes = require('./routes/kidsRoutes');
const newsletterRoutes = require('./routes/newsletter.routes');
const contactRoutes = require('./routes/contact.routes');
const heroSliderRoutes = require('./routes/filmSlider.routes');

const campaignRoutes = require('./routes/campaign.routes');
const adminMailRoutes = require('./routes/adminMail.routes');

const uploadRoutes = require('./routes/upload.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const settingRoutes = require('./routes/setting.routes');
const podcastRoutes = require('./routes/podcast.routes');
const prayerRoutes = require('./routes/prayer.routes');
const promoCodeRoutes = require('./routes/promoCode.routes');
const paymentRoutes = require('./routes/payment.routes');
const formRoutes = require('./routes/form.routes');
const albumRoutes = require('./routes/album.routes');
const path = require('path');

const app = express();

// Connect to database
connectDB();

// Middleware
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(null, true); // Permissive fallback if domains not yet configured
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use(cookieParser());

// Ensure uploads directory exists and serve statically
const uploadsDir = path.join(__dirname, '../uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/films/hero-sliders', heroSliderRoutes);
app.use('/api/hero-sliders', heroSliderRoutes);
app.use('/api/films', filmRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/kids', kidsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/admin-mail', adminMailRoutes);
app.use('/api/podcast', podcastRoutes);
app.use('/api/prayer', prayerRoutes);
app.use('/api/promocodes', promoCodeRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/albums', albumRoutes);

// Default route
app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'Welcome to the Cinema Hub Backend API' });
});

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack || err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;

// trigger restart
