const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    dob: { type: Date, required: true },
    email: { type: String, default: '' },
    residentialAddress: { type: String, required: true },
    occupation: { type: String, default: '' },
    placeOfWork: { type: String, default: '' },
    joinDate: { type: Date, required: true, default: Date.now }, // Core date for dues math
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    baptismStatus: { type: String, enum: ['Baptized', 'Unbaptized'], default: 'Unbaptized' },
    communicant: { type: String, enum: ['Yes', 'No'], default: 'No' },
    previousChurch: { type: String, default: '' }
});

module.exports = mongoose.model('Profile', ProfileSchema);
