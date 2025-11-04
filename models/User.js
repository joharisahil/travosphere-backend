const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, default: '' },
  name: { type: String, default: '' },
  profilePic: { type: String, default: '' },
  isVerified: { type: Boolean, default: true } // email verified via OTP login
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
