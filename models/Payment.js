const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaid: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    reference: { type: String } // e.g., "Cash", "MoMo ID"
});

module.exports = mongoose.model('Payment', PaymentSchema);
