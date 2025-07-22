const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dns = require('dns').promises;
const zxcvbn = require('zxcvbn');
const Schema = mongoose.Schema

const userSchema = new Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ["Translator", "Developer", "Admin"]
    },
    languages: {
        type: [String],
    },
    roleStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    deletedAt: {
        type: Date,
        default: null
    },
    resetTokenVersion: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

function isValidEmail(email) {
    const emailRegex = new RegExp(
        "^" +
        "(?:[A-Za-z0-9!#$%&'*+/=?^_\\{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_\\{|}~-]+)*|" +
        "(?:\\\\[\\x00-\\x7F]|[^\\\\\"]*)\")+" +
        "@" +
        "(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\\.)+" +
        "[A-Za-z]{2,63}" +
        "$"
    );
    return emailRegex.test(email);
}

async function hasMaxRecord(email) {
    const domain = email.split('@')[1];
    try {
        const records = await dns.resolveMx(domain);
        return records && records.length > 0;
    } catch {
        return false;
    }
}

function getStregthColor(score) {
    switch (score) {
        case 0: return 'red';
        case 1: return 'yellowred';
        case 2: return 'yellow';
        case 3: return 'yellowgreen';
        case 4: return 'green';
        default: return 'grey';
    }
}

function isStrongPassword(pw, emailLocalPart = "") {
    //testing if this is a common password
    const result = zxcvbn(pw);
    const feedback = {
        valid: true,
        score: result.score,
        color: getStregthColor(result.score),
        message: result.feedback.warning || ''
    }
    if (result.score < 3) {
        feedback.valid = false;
        feedback.message = feedback.message || 'Password is too weak';
        return feedback;
    }
    if (pw.length < 12) {
        feedback.valid = false;
        feedback.message = feedback.message || 'Password is should be more than 8 characters.';
        return feedback;
    }
    if (/\s/.test(pw)) {
        feedback.valid = false;
        feedback.message = feedback.message || 'Password must not contain spaces.';
        return feedback;
    }
    const check = {
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        digit: /\d/.test(pw),
        special: /[!@#$%^&*()\[\]{};:'",.<>/?\\|`~_\-+=]/.test(pw)
    }
    if (!check.upper || !check.lower || !check.digit || !check.special) {
        feedback.valid = false;
        if (!check.upper) {
            feedback.message = 'Password must include Upper case characters.'
            return feedback;
        }
        if (!check.lower) {
            feedback.message = 'Password must include Lower case characters.'
            return feedback;
        }
        if (!check.digit) {
            feedback.message = 'Password must include Digits.'
            return feedback;
        }
        if (!check.special) {
            feedback.message = 'Password must include special characters.'
            return feedback;
        }
    }
    //checking for sequences - abcd, 1234
    for (let i = 0; i < pw.length - 3; i++) {
        const seq = pw.substr(i, 4).toLowerCase();
        if (
            "abcdefghijklmnopqrstuvwxyz".includes(seq) || "0123456789".includes(seq)
        ) {
            feedback.valid = false;
            feedback.message = 'Password must not contain obvious sequences (e.g., abcd, 1234';
            return feedback;
        }
    }
    //checking if the password contains parts of the email before @
    if (emailLocalPart && pw.toLowerCase().includes(emailLocalPart.toLowerCase())) {
        feedback.valid = false;
        feedback.message = 'Password should not contain your email.';
        return feedback;
    }
    return feedback;
}

//static signup method
userSchema.statics.register = async function (userName, email, password, role, languages) {
    //field presence check
    if (!userName || !email || !password) {
        throw Error('All fields must be filled');
    }

    //email format validation
    if (!isValidEmail(email)) {
        throw Error('Invalid Email');
    }

    //email domain check
    const hasMx = await hasMaxRecord(email);
    if (!hasMx) {
        console.warn(`Warning: MX record not found for ${email}`);
    }

    //password strength check
    const emailLocalPart = email.split('@')[0];
    const pwCheck = isStrongPassword(password, emailLocalPart);
    if (!pwCheck.valid) {
        throw Error(pwCheck.message || 'Password is not strong enough.')
    }

    //check is password already exists
    const existing = await this.findOne({ email })
    if (existing && existing.roleStatus == 'Approved') {
        throw Error('Email already in use');
    }
    if (existing && existing.roleStatus == 'Pending') {
        throw Error('Your account is still pending approval.');
    }
    if (existing && existing.roleStatus == 'Rejected') {
        existing.roleStatus = 'Pending';
        existing.languages = role === 'Translator' ? languages : [];
        await existing.save();
        return existing;
    }

    //hash password and create user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = {
        userName, email,
        password: hash,
        role,
        roleStatus: "Pending"
    };
    if (role == "Translator" && Array.isArray(languages)) {
        newUser.languages = languages;
    }
    console.log('[User.register] newUser =', newUser);
    try {
        console.log('Creating user with fields:', Object.keys(newUser));
        for (const key in newUser) {
            if (key.trim() === "") {
                console.error("Invalid field name detected in newUser:", newUser);
                throw new Error("User object contains invalid field name");
            }
        }
        return await this.create(newUser);
    } catch (err) {
        console.error('Error creating user:', err);
        throw err;
    }
};

//static login method
userSchema.statics.login = async function (email, password) {
    if (!email || !password) {
        throw Error('All fields must be filled');
    }
    const user = await this.findOne({ email })
    if (!user) {
        throw Error('Incorrect Email');
    }
    if (user.roleStatus !== 'Approved') {
        throw Error('Not an approved user');
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        throw Error('Incorrect Password');
    }
    return user;
};

module.exports = mongoose.model('User', userSchema);
module.exports.isStrongPassword = isStrongPassword;