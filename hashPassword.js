const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const email = 'amila@gmail.com'; // exact email from your DB
    const plainPassword = 'amila123';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const result = await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 1) {
      console.log('✅ Password hashed and updated');
    } else {
      console.log('⚠️ No user found or password not updated.');
    }

    mongoose.connection.close();
  })
  .catch(err => console.error('DB connection error:', err));
