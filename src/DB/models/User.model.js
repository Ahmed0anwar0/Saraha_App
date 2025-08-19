import mongoose from "mongoose";

export let genderEnum = { male: "male", female: "female" };
export let roleEnum = { user: "user", admin: "admin" };
export let providerEnum = { system: "system", google: "google" };

const userSchema = new mongoose.Schema({

    firstName: { type: String, required: true, minLength: 2, maxLength: [20, "First Name Max Length is 20 char"] },
    lastName: { type: String, required: true, minLength: 2, maxLength: [20, "Last Name Max Length is 20 char"] },
    email: { type: String, required: true, unique: true },
    password: {
        type: String, required: function () {
            return this.provider === providerEnum.system ? true : false
        }
    },
    gender: { type: String, enum: { values: Object.values(genderEnum), message: "" }, default: genderEnum.male },
    phone: String,
    picture: { secure_url: String, public_id: String },
    coverImages: [{ secure_url: String, public_id: String }],

    confirmEmail: Date,
    confirmEmailOtp: String,
    confirmEmailOtpCreatedAt: Date,
    confirmEmailOtpAttempts: Number,
    confirmEmailOtpBannedUntil: Date,
    confirmPasswordOtp: String,
    changeCredTime: Date,

    provider: { type: String, enum: Object.values(providerEnum), default: providerEnum.system },
    role: {
        type: String,
        enum: Object.values(roleEnum),
        default: roleEnum.user
    },

    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    restoredAt: Date,
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },


}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
})

userSchema.virtual("fullName").set(function (value) {
    const [firstName, lastName] = value?.split(" ") || [];
    this.set({ firstName, lastName });
}).get(function () {
    return this.firstName + " " + this.lastName;
})

userSchema.virtual('messages', {
    localField: "_id",
    foreignField: "receiverId",
    ref: "Message"
})

export const UserModel = mongoose.model.User || mongoose.model("User", userSchema)

UserModel.syncIndexes()