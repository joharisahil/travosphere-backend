const User = require('../models/User');
const Otp = require('../models/Otp');
const generateOtp = require('../utils/generateOtp');
const transporter = require('../config/email');
const otpTemplate = require('../utils/emailTemplates/otpTemplate');
const jwt = require('jsonwebtoken');

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10);
const OTP_RATE_LIMIT_SECONDS = parseInt(process.env.OTP_RATE_LIMIT_SECONDS || '60', 10);

async function sendOtp(req, res, next) {
  try {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: check last OTP created
    const lastOtp = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 }).lean();
    if (lastOtp) {
      const secondsSince = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
      if (secondsSince < OTP_RATE_LIMIT_SECONDS) {
        return res.status(429).json({ message: `Please wait ${Math.ceil(OTP_RATE_LIMIT_SECONDS - secondsSince)} seconds before requesting a new OTP.` });
      }
    }

    // Create user if not exists (signup on first OTP)
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.create({ email: normalizedEmail, phone: phone || '' });
    } else {
      // update phone if provided and changed
      if (phone && phone !== user.phone) {
        user.phone = phone;
        await user.save();
      }
    }

    // Generate OTP
    const otp = generateOtp(6);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60000);

    // Save OTP (old OTP docs will expire automatically thanks to TTL index)
    await Otp.create({ email: normalizedEmail, otp, expiresAt });

    // Prepare email
    const { subject, text, html } = otpTemplate({ otp, minutes: OTP_EXPIRES_MINUTES });
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: normalizedEmail,
      subject,
      text,
      html
    };

try {
  await transporter.emails.send({
    from: process.env.EMAIL_FROM || 'YourApp <onboarding@resend.dev>',
    to: normalizedEmail,
    subject,
    html,
  });

  return res.json({ message: 'OTP sent to email', email: normalizedEmail });
} catch (err) {
  console.error('Email send failed', err);
  return res.status(500).json({ message: 'Failed to send OTP email. Check email settings.' });
}
    return res.json({ message: 'OTP sent to email', email: normalizedEmail });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();

    const record = await Otp.findOne({ email: normalizedEmail, otp }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ message: 'Invalid OTP' });

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // OTP valid => create/find user, return JWT
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(500).json({ message: 'User record not found' });

    // delete used OTP (remove all OTPs for that email)
    await Otp.deleteMany({ email: normalizedEmail });

    // create JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.json({
      message: 'Authenticated',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        profilePic: user.profilePic
      }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  me
};
