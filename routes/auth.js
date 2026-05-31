const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', (req, res) => {
    res.render('login', { error: null });
});

router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { phone } = req.body;
    try {
        let user = await User.findOne({ phone });
        if (!user) {
            // Auto-create initial admin if trying to login with a special backdoor to bootstrap the app
            if (phone === '0000000000') {
                user = new User({ phone: '0000000000', role: 'admin' });
            } else {
                return res.render('login', { error: 'Phone number not found. Please contact an administrator.' });
            }
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        await user.save();

        // Transform phone number to international format (assuming Ghanaian numbers)
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '233' + phone.slice(1);
        } else if (!phone.startsWith('233')) {
            formattedPhone = '233' + phone;
        }


        try {
            const message = `Your one-time PIN Code is ${otp}. Please type this code in your app to log in.`;

            const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.ARKESEL_API_KEY
                },
                body: JSON.stringify({
                    sender: 'PRESBY',
                    message: message,
                    recipients: [formattedPhone]
                })
            });

            const data = await response.json();

            // Check if the HTTP status is not 2xx
            if (!response.ok) {
                console.error('Failed to send OTP via Arkesel (HTTP Error):', data);
            } else if (data.status !== 'success') {
                // Arkesel specific API failure check (e.g., out of balance)
                console.error('Arkesel API rejected the SMS:', data);
            } else {
                console.log('OTP sent successfully:', data);
            }

        } catch (smsErr) {
            // This catches network drops, bad URLs, or JSON parsing errors
            console.error('Network or Execution error sending OTP via Arkesel:', smsErr);
        }

        console.log(`\n===========================================`);
        console.log(`[SIMULATED SMS] OTP for ${phone} is: ${otp}`);
        console.log(`===========================================\n`);

        res.redirect(`/verify-otp?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'An error occurred during login.' });
    }
});

router.get('/verify-otp', (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.redirect('/login');
    res.render('verify-otp', { phone, error: null });
});

router.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    try {
        const user = await User.findOne({ phone });
        if (!user) return res.redirect('/login');

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.render('verify-otp', { phone, error: 'Invalid or expired OTP.' });
        }

        // OTP matched
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        req.session.userId = user._id;
        req.session.role = user.role;

        // Redirect admins to admin, members to dashboard
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/dashboard');
        }
    } catch (err) {
        console.error(err);
        res.render('verify-otp', { phone: req.body.phone, error: 'An error occurred during verification.' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
