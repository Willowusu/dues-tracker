const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true }, // Auth identifier
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null }
});

module.exports = mongoose.model('User', UserSchema);
