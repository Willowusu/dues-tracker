const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const { isAuthenticated } = require('../middleware/auth');

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Handle edge case where admin logs in but has no profile
        if (req.session.role === 'admin') {
            const profileCheck = await Profile.findOne({ userId });
            if (!profileCheck) {
                return res.render('dashboard_admin_empty'); // Simplistic view or redirect to admin
            }
        }

        const profile = await Profile.findOne({ userId });
        if (!profile) {
            return res.status(404).send("Profile not found. Contact administrator.");
        }

        // Pagination info
        const totalPaymentsCount = await Payment.countDocuments({ userId });
        const totalPages = Math.ceil(totalPaymentsCount / limit) || 1;

        // Paginated chunk
        const payments = await Payment.find({ userId })
            .sort({ paymentDate: -1 })
            .skip(skip)
            .limit(limit);

        // Minimal fetch for math
        const allPayments = await Payment.find({ userId }, { amountPaid: 1 });

        // --- BUSINESS LOGIC (ROLLING DUE ENGINE) ---
        const now = Date.now();
        const joinTime = profile.joinDate.getTime();

        // 1. Weeks Passed
        const weeksPassed = Math.ceil((now - joinTime) / (7 * 24 * 60 * 60 * 1000));
        const effectiveWeeks = Math.max(weeksPassed, 1); // Minimum 1 week if they just joined

        // 2. Total Billed
        const totalBilled = effectiveWeeks * 2;

        // 3. Total Paid (calculated across all payments)
        const totalPaid = allPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);

        // 4. Balance Owed
        const balanceOwed = totalBilled - totalPaid;

        res.render('dashboard', {
            profile,
            payments,
            currentPage: page,
            totalPages,
            totalPaymentsCount,
            stats: {
                weeksPassed: effectiveWeeks,
                totalBilled,
                totalPaid,
                balanceOwed
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
