const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const MongoStore = require('connect-mongo').default;
require('dotenv').config();

const app = express();

// 1. Trust Proxy (Crucial for secure cookies on platforms like Heroku/Render)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// 2. Core Middlewares & View Engine
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 3. Database Connection
const mongoUri = process.env.NODE_ENV === 'production' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// 4. Session Configuration (Must be initialized before routes)
app.use(session({
    secret: 'dues-tracker-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        autoRemove: 'native'
    }),
    cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true 
    }
}));

// 5. Context Middleware (Must be AFTER session, but BEFORE routes)
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? { id: req.session.userId, role: req.session.role } : null;
    next();
});

// 6. Application Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/dashboard', dashboardRoutes);

// Root redirect
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});