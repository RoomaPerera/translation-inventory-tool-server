const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    required: [true, 'User name is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['Translator', 'Developer', 'Administrator'], // Use Administrator instead of Admin
  },
  languages: {
    type: [String],
    default: [],
  },
  roleStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  resetPasswordToken: String,
  resetPasswordOtp: String,
  resetPasswordExpires: Date,
}, { timestamps: true });

// Password hashing before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Register new user
userSchema.statics.register = async function (userName, email, password, role, languages) {
  if (!userName || !email || !password || !role) {
    throw new Error('All fields must be filled');
  }

  if (!validator.isEmail(email)) {
    throw new Error('Invalid email');
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error('Password not strong enough');
  }

  if (!['Translator', 'Developer', 'Administrator'].includes(role)) {
    throw new Error('Invalid role');
  }

  const exists = await this.findOne({ email });
  if (exists) {
    throw new Error('Email already in use');
  }

  // Create user instance (password will be hashed by pre-save hook)
  const user = new this({
    userName,
    email,
    password,
    role,
    languages: role === 'Translator' ? languages : [],
    roleStatus: 'Pending',
  });

  await user.save();
  return user;
};

// Login user
userSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw new Error('All fields must be filled');
  }
  const user = await this.findOne({ email });
  if (!user) {
    throw new Error('Incorrect email');
  }
  if (user.roleStatus !== 'Approved') {
    throw new Error('User is not approved');
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Incorrect password');
  }
  return user;
};

module.exports = mongoose.model('User', userSchema);
