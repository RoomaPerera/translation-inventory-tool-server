const express = require('express');
const router  = express.Router();
const User    = require('../models/User');      
const Language = require('../models/Language'); 

// // Middleware placeholder — replace with your real auth middleware later
// function requireAdmin(req, res, next) {
//   // JWT middleware
//   if (req.user?.role !== 'Admin') {
//     return res.status(403).json({ error: 'Admin rights required' });
//   }
//   next();
// }

router.post('/users/:userId/languages', async (req, res) => {
  const { userId }      = req.params;
  const { languages }   = req.body;        

  if (!Array.isArray(languages) || !languages.length) {
    return res.status(400).json({ error: 'languages must be a non‑empty array' });
  }

  try {
    // 1) Fetch the user — must exist & be a Translator
    const user = await User.findById(userId);
    if (!user)           return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'Translator')
      return res.status(400).json({ error: 'User is not a Translator' });

    // 3) Update languages
    user.languages = languages;
    await user.save();

    // 4) Respond 
    res.json({ message: 'Languages assigned', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
