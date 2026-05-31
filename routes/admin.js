const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Profile = require('../models/Profile');
const Payment = require('../models/Payment');
const { isAdmin } = require('../middleware/auth');

router.use(isAdmin); // Protect all admin routes

router.get('/', async (req, res) => {
    try {
        const allProfiles = await Profile.find().populate('userId');
        const profiles = await Profile.find().populate('userId').sort({ name: 1 });
        const payments = await Payment.find();

        let membersReport = profiles.map(profile => {
            const weeksPassed = Math.max(0, Math.ceil((new Date() - profile.joinDate) / (7 * 24 * 60 * 60 * 1000)));
            const totalBilled = weeksPassed * 2;
            const userPayments = payments.filter(p => p.userId && p.userId.equals(profile.userId._id));
            const totalPaid = userPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            const balanceOwed = totalBilled - totalPaid;

            return {
                ...profile._doc,
                computed: {
                    weeksPassed,
                    totalBilled,
                    totalPaid,
                    balanceOwed
                }
            };
        });

        // Sort by highest balance owed and take top 5
        membersReport.sort((a, b) => b.computed.balanceOwed - a.computed.balanceOwed);
        const previewMembers = membersReport.slice(0, 5);

        // Fetch Recent Payments Ledger Data
        const recentPayments = await Payment.find()
            .sort({ paymentDate: -1 })
            .limit(5)
            .populate('userId');

        const recentPaymentsReport = recentPayments.map(p => {
            const profile = allProfiles.find(prof => prof.userId && p.userId && prof.userId._id.equals(p.userId._id));
            return {
                ...p._doc,
                memberName: profile ? profile.name : 'Unknown Member'
            };
        });

        res.render('admin', {
            profiles: allProfiles,
            membersReport: previewMembers,
            recentPayments: recentPaymentsReport,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get('/members', async (req, res) => {
    try {
        const { search, status, page = 1 } = req.query;
        let query = {};
        if (status) query.status = status;

        const limit = 10;
        const currentPage = parseInt(page) || 1;
        const skip = (currentPage - 1) * limit;

        // Base fetch
        let profilesQuery = Profile.find(query).populate('userId').sort({ name: 1 });
        let profiles = await profilesQuery.exec();

        // JS Filter for search
        if (search) {
            const lowerSearch = search.toLowerCase();
            profiles = profiles.filter(p =>
                p.name.toLowerCase().includes(lowerSearch) ||
                (p.userId && p.userId.phone && p.userId.phone.includes(lowerSearch))
            );
        }

        const totalProfiles = profiles.length;
        const totalPages = Math.ceil(totalProfiles / limit) || 1;

        // Paginate after JS sort/filter
        const paginatedProfiles = profiles.slice(skip, skip + limit);

        const payments = await Payment.find();

        let membersReport = paginatedProfiles.map(profile => {
            const weeksPassed = Math.max(0, Math.ceil((new Date() - profile.joinDate) / (7 * 24 * 60 * 60 * 1000)));
            const totalBilled = weeksPassed * 2;
            const userPayments = payments.filter(p => p.userId && p.userId.equals(profile.userId._id));
            const totalPaid = userPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            const balanceOwed = totalBilled - totalPaid;

            return {
                ...profile._doc,
                computed: {
                    weeksPassed,
                    totalBilled,
                    totalPaid,
                    balanceOwed
                }
            };
        });

        res.render('admin-members', {
            membersReport,
            currentPage,
            totalPages,
            search: search || '',
            status: status || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.get('/payments', async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const limit = 20;
        const currentPage = parseInt(page) || 1;
        const skip = (currentPage - 1) * limit;

        const totalPayments = await Payment.countDocuments();
        const totalPages = Math.ceil(totalPayments / limit) || 1;

        const recentPayments = await Payment.find()
            .sort({ paymentDate: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId');

        // Need profiles for names
        const allProfiles = await Profile.find();

        const recentPaymentsReport = recentPayments.map(p => {
            const profile = allProfiles.find(prof => prof.userId && p.userId && prof.userId.equals(p.userId._id));
            return {
                ...p._doc,
                memberName: profile ? profile.name : 'Unknown Member'
            };
        });

        res.render('admin-payments', {
            recentPayments: recentPaymentsReport,
            currentPage,
            totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

router.post('/add-member', async (req, res) => {
    const { phone, ...profileData } = req.body;

    try {
        // 1. Create User
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.redirect('/admin?error=Phone+number+already+exists');
        }

        const user = new User({ phone, role: 'member' });
        await user.save();

        // 2. Create Profile mapping to user._id
        const profile = new Profile({
            userId: user._id,
            ...profileData
        });

        await profile.save();
        res.redirect('/admin?success=Member+added+successfully');
    } catch (err) {
        console.error(err);
        res.redirect('/admin?error=Error+adding+member');
    }
});

router.post('/record-payment', async (req, res) => {
    const { userId, amountPaid, reference, paymentDate } = req.body;
    try {
        const payment = new Payment({
            userId,
            amountPaid: parseFloat(amountPaid),
            reference,
            paymentDate: paymentDate ? new Date(paymentDate) : Date.now()
        });
        await payment.save();
        res.redirect('/admin?success=Payment+recorded+successfully');
    } catch (err) {
        console.error(err);
        res.redirect('/admin?error=Error+recording+payment');
    }
});

module.exports = router;
