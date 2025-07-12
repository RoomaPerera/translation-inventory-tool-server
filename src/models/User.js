const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const validator = require('validator')

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
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
        default: []
    },
    roleStatus: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    }
}, { timestamps: true })

userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password; // remove password from the response
    return user;
}

//static signup method
userSchema.statics.register = async function (userName, email, password, role, languages) {
    //validation
    if (!userName || !email || !password) {
        throw Error('All fields must be filled')
    }
    if (!validator.isEmail(email)) {
        throw Error('Invalid Email')
    }
    if (!validator.isStrongPassword(password, { minLength: 8 })) {
        throw Error('Password must be at least 8 characters and strong');
    }
    const exists = await this.findOne({ email })
    if (exists) {
        throw Error('Email already in use')
    }
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)

    const user = await this.create({
        userName,
        email,
        password: hash,
        role,
        languages: role === "Translator" ? languages : [],
        roleStatus: "Pending"
    })
    return user
}

//static login method
userSchema.statics.login = async function (email, password) {
    //validation
    if (!email || !password) {
        throw Error('All fields must be filled')
    }
    const user = await this.findOne({ email })
    console.log('Login: Found user?', !!user);

    if (!user) {
        throw Error('Incorrect Email')
    }

    console.log('User fetched from DB:', user.email, 'Status:', user.roleStatus);
    if (user.roleStatus !== 'Approved') {
        console.log('User login blocked - status not approved');
        throw Error('Not an approved user')
    }


    const match = await bcrypt.compare(password, user.password)
    console.log('Login: Password match?', match);

    if (!match) {
        throw Error('Incorrect Password')
    }
    return user
}

// admin only: approve or reject a user
userSchema.statics.updateRoleStatus = async function (userId, newStatus) {
    if (!["Approved", "Rejected"].includes(newStatus)) {
        throw Error("Invalid role status");
    }

    const user = await this.findByIdAndUpdate(
        userId,
        { roleStatus: newStatus },
        { new: true }
    );
    if (!user) {
        throw Error("User not found");
    }

    return user;
};


module.exports = mongoose.model('User', userSchema)