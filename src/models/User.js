const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'Translator', 'Developer', 'Admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  languages: [{ type: String }],
  resetTokenVersion: { type: Number, default: 0 }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Static login method
userSchema.statics.login = async function(email, password) {
  const user = await this.findOne({ email });
  if (!user) throw Error('Invalid email or password');
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw Error('Invalid email or password');
  return user;
};

// Static register method
userSchema.statics.register = async function(userName, email, password, role, languages) {
  const existing = await this.findOne({ email });
  if (existing) throw Error('Email already in use');
  const user = new this({
    name: userName,
    email,
    password,
    role,
    languages
  });
  await user.save();
  return user;
};

// Password strength utility
function isStrongPassword(password, emailLocal) {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' };
  if (emailLocal && password.toLowerCase().includes(emailLocal.toLowerCase()))
    return { valid: false, message: 'Password should not contain your email.' };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return { valid: false, message: 'Password must contain letters and numbers.' };
  return { valid: true };
}

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.isStrongPassword = isStrongPassword; 