const mongoose = require('mongoose');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Payment = require('./models/Payment');

mongoose.connect('mongodb://127.0.0.1:27017/dues-tracker').then(async () => {
    let admin = await User.findOne({ phone: '1234567890' });
    if (!admin) {
        admin = new User({ phone: '1234567890', role: 'admin' });
        await admin.save();
    } else {
        admin.role = 'admin';
        await admin.save();
    }

    let profile = await Profile.findOne({ userId: admin._id });
    if (!profile) {
        profile = new Profile({
            userId: admin._id,
            name: 'Super Admin',
            gender: 'Female',
            dob: new Date('1980-01-01'),
            residentialAddress: 'Address 1',
            joinDate: new Date(Date.now() - (7 * 10 * 24 * 60 * 60 * 1000)) // joined exactly 10 weeks ago
        });
        await profile.save();
    }

    // add payment
    let p = new Payment({
        userId: admin._id,
        amountPaid: 10,
        reference: 'Cash'
    });
    await p.save();

    console.log('Mock Profile Ready');
    process.exit(0);
});
