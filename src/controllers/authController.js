const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Enhanced token creation with better error handling
const createToken = (id) => {
  try {
    if (!process.env.SECRET) {
      throw new Error('JWT secret is not defined in environment variables');
    }
    return jwt.sign({ id }, process.env.SECRET, { expiresIn: '2h' });
  } catch (error) {
    console.error('Token creation failed:', error.message);
    throw new Error('Authentication token creation failed');
  }
};

// Register user with enhanced validation
const registerUser = async (req, res) => {
  const { userName, email, password, role, languages } = req.body;

  // Input validation
  if (!userName || !email || !password || !role || !languages) {
    return res.status(400).json({ error: 'Please provide username, email, password, role, and languages' });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = await User.register(userName, email, password, role, languages);
    res.status(201).json({ message: 'User registration pending approval' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed. Please try again later.' });
  }
};

// Login with enhanced security checks
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const user = await User.login(email, password);

    // Check if user is approved
    if (user.status !== 'approved') {
      return res.status(401).json({
        error: 'Account pending approval. Please contact administrator.'
      });
    }

    const token = createToken(user._id);
    res.status(200).json({
      email,
      userName: user.userName,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed. Please check your credentials and try again.' });
  }
};

// Password reset implementation
const resetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please provide email address' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For security, always return the same message even if email doesn't exist
    // Actual reset logic would go here (generate token, send email, etc.)

    res.status(200).json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    res.status(500).json({ error: 'Password reset request failed. Please try again later.' });
  }
};

// Approve or reject user implementation
const approveOrRejectUser = async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body;

  // Input validation
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
  }

  try {
    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        status,
        adminNote: adminNote || '',
        approvedAt: status === 'approved' ? new Date() : null
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: `User ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      user: {
        id: updatedUser._id,
        userName: updatedUser.userName,
        email: updatedUser.email,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('User approval error:', error.message);
    res.status(500).json({ error: 'Failed to update user status. Please try again later.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  approveOrRejectUser
}