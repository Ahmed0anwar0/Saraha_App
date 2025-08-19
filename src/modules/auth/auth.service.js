import { providerEnum, UserModel } from "../../DB/models/user.model.js";
import { asyncHundler } from "../../utils/response.js";
import { compareHash, generateHash } from "../../utils/security/hash.security.js";
import { generateEnc } from "../../utils/security/enc.security.js";
import { generateLoginCred } from "../../utils/security/token.security.js";
import * as serviceDB from "../../DB/service.db.js"
import sendEmail from "../../utils/email/sendEmail.js";
import { OAuth2Client } from 'google-auth-library';
import { customAlphabet } from "nanoid";
import { emailTemplate } from "../../utils/email/sendEmail.template.js";

export const signup = asyncHundler(
    async (req, res, next) => {

        const { fullName, email, password, phone } = req.body;

        if (await serviceDB.findOne({ model: UserModel, filter: { email } })) {
            return next(new Error("Email alredy  exist", { cause: 409 }));
        }

        const hashPassword = await generateHash({ plaintext: password });
        const encPhone = await generateEnc({ plaintext: phone });
        const otp = customAlphabet('0123456789', 6)();
        const confirmEmailOtp = await generateHash({ plaintext: otp });
        const now = Date.now();

        const [user] = await UserModel.create([{
            fullName,
            email,
            password: hashPassword,
            phone: encPhone,
            confirmEmailOtp,
            confirmEmailOtpCreatedAt: now,
            confirmEmailOtpAttempts: 0,
            confirmEmailOtpBannedUntil: null
        }]);

        await sendEmail({ to: email, subject: "Confirm-Email", html: emailTemplate({ otp }) });

        return res.status(201).json({ message: "signup success", user });
    }
)

export const login = asyncHundler(
    async (req, res, next) => {

        const { email, password } = req.body;
        const user = await serviceDB.findOne({
            model: UserModel,
            filter: { email, provider: providerEnum.system },
        })

        if (!user) {
            return next(new Error("In-valid Login Data", { cause: 404 }));
        }

        if (!user.confirmEmail) {
            return next(new Error("Plese confirm your Email", { cause: 400 }));
        }
        if (user.deletedAt) {
            return next(new Error("Deleted Account", { cause: 400 }));
        }

        const match = await compareHash({ plaintext: password, hashValue: user.password })
        if (!match) {
            return next(new Error("In-valid Login Data", { cause: 404 }));
        }


        const credentials = await generateLoginCred({ user });

        return res.status(200).json({
            message: "Login success",
            credentials
        });
    }
)

export const confirmEmail = asyncHundler(
    async (req, res, next) => {
        const { email, otp } = req.body;

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: {
                email,
                confirmEmail: { $exists: false },
                confirmEmailOtp: { $exists: true },
            }
        });

        if (!user) {
            return next(new Error("Invalid Account or Already Confirmed", { cause: 404 }));
        }

        const now = Date.now();

        if (user.confirmEmailOtpBannedUntil && user.confirmEmailOtpBannedUntil > now) {
            const remainingTime = Math.ceil((user.confirmEmailOtpBannedUntil - now) / (1000 * 60));
            return next(new Error(`Too many failed attempts. Try again after ${remainingTime} minutes.`, { cause: 429 }));
        }

        if (!user.confirmEmailOtpCreatedAt || now - user.confirmEmailOtpCreatedAt > 120000) {
            await serviceDB.updateOne({
                model: UserModel,
                filter: { email },
                data: {
                    $unset: {
                        confirmEmailOtp: true,
                        confirmEmailOtpCreatedAt: true,
                        confirmEmailOtpBannedUntil: true,
                    },
                    confirmEmailOtpAttempts: 0,
                },
            });
            return next(new Error("OTP expired. Please request a new OTP", { cause: 400 }));
        }

        if (!await compareHash({ plaintext: otp, hashValue: user.confirmEmailOtp })) {

            const MAX_ATTEMPTS = 5;
            const BAN_DURATION = 5 * 60 * 1000;

            const attempts = (user.confirmEmailOtpAttempts || 0) + 1;
            const updates = {
                confirmEmailOtpAttempts: attempts,
                ...(attempts >= MAX_ATTEMPTS && {
                    confirmEmailOtpBannedUntil: now + BAN_DURATION,
                    confirmEmailOtpAttempts: 0
                })
            };

            await serviceDB.updateOne({
                model: UserModel,
                filter: { email },
                data: updates,
            });

            const remainingAttempts = MAX_ATTEMPTS - attempts;
            return next(new Error(
                `Invalid OTP. ${remainingAttempts > 0 ?
                    `${remainingAttempts} attempts remaining` :
                    'Account temporarily locked for 5 minutes'}`,
                { cause: 400 }
            ));
        }

        const updatedUser = await serviceDB.updateOne({
            model: UserModel,
            filter: { email },
            data: {
                confirmEmail: now,
                $unset: {
                    confirmEmailOtp: true,
                    confirmEmailOtpCreatedAt: true,
                    confirmEmailOtpBannedUntil: true,
                },
                confirmEmailOtpAttempts: 0,
            }
        });

        return updatedUser.matchedCount
            ? res.status(200).json({ message: "Email confirmed successfully!" })
            : next(new Error("Failed to confirm email"));
    })

export const resendConfirmEmailOtp = asyncHundler(
    async (req, res, next) => {
        const { email } = req.body;
        const user = await serviceDB.findOne({
            model: UserModel,
            filter: { email },
        });

        if (!user) return next(new Error("User not found", { cause: 404 }));

        const now = Date.now();

        if (user.confirmEmailOtpBannedUntil && user.confirmEmailOtpBannedUntil > now) {
            const waitSec = Math.ceil((user.confirmEmailOtpBannedUntil - now) / 1000);
            return next(new Error(`Too many failed attempts. Try again in ${waitSec} seconds.`, { cause: 429 }));
        }

        const otp = customAlphabet("0123456789", 6)();
        const newOtp = await generateHash({ plaintext: otp });

        await serviceDB.updateOne({
            model: UserModel,
            filter: { email },
            data: {
                confirmEmailOtp: newOtp,
                confirmEmailOtpCreatedAt: now,
                confirmEmailOtpAttempts: 0,
                confirmEmailOtpBannedUntil: null,
            },
        });

        await sendEmail({
            to: email,
            subject: "Confirm-Email",
            html: emailTemplate({ otp }),
        });

        return res.status(200).json({ message: "OTP resent" });
    }
)

async function verifyGoogleAcc({ idToken } = {}) {

    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.WEB_CLIENT_ID.split(",")
    });
    const payload = ticket.getPayload();
    return payload
}

export const signupWithGmail = asyncHundler(
    async (req, res, next) => {
        const { idToken } = req.body;
        const { email, email_verified, picture, name } = await verifyGoogleAcc({ idToken })
        if (!email_verified) {
            return next(new Error("not verified account", { cause: 400 }));
        }

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: { email }
        })
        if (user) {
            if (user.provider === providerEnum.google) {
                return loginWithGmail(req, res, next)
            }
            return next(new Error("Email alredy  exist", { cause: 409 }));
        }

        const [newUser] = await UserModel.create([{
            fullName: name,
            email,
            confirmEmail: Date.now(),
            picture,
            provider: providerEnum.google
        }]);

        const credentials = await generateLoginCred({ user: newUser });
        await sendEmail({ to: email, subject: "Confirm-Email", html: `<h1>OTP ${Date.now()}</h1>` });

        return res.status(201).json({
            message: "success",
            credentials
        });

    }
)

export const loginWithGmail = asyncHundler(
    async (req, res, next) => {
        const { idToken } = req.body;
        const { email, email_verified } = await verifyGoogleAcc({ idToken })
        if (!email_verified) {
            return next(new Error("not verified account", { cause: 400 }));
        }

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: { email, provider: providerEnum.google }
        })
        if (!user) {
            return next(new Error("In-valid login data or provider", { cause: 409 }));
        }

        const credentials = await generateLoginCred({ user });

        return res.status(201).json({
            message: "Login success",
            credentials
        });

    }
)


export const sendForgotPassword = asyncHundler(
    async (req, res, next) => {

        const { email } = req.body;
        const otp = customAlphabet("0123456789", 6)();

        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: {
                email,
                provider: providerEnum.system,
                confirmEmail: { $exists: true },
                deletedAt: { $exists: false },
            },
            data: {
                confirmPasswordOtp: await generateHash({ plaintext: otp })
            }
        });

        if (!user) {
            return next(new Error("In-valid account", { cause: 404 }))
        };

        await sendEmail({
            to: email,
            subject: "Reset-Password",
            html: emailTemplate({ otp, title: "Reset-Password" })
        });

        return res.status(201).json({
            message: "OTP send success",
        });

    }
)


export const verifyForgotPassword = asyncHundler(
    async (req, res, next) => {

        const { email, otp } = req.body;

        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: {
                email,
                provider: providerEnum.system,
                confirmEmail: { $exists: true },
                deletedAt: { $exists: false },
                confirmPasswordOtp: { $exists: true },
            },
            data: {
                confirmPasswordOtp: await generateHash({ plaintext: otp })
            }
        });

        if (!user) {
            return next(new Error("In-valid account", { cause: 404 }))
        };

        if (!await compareHash({ plaintext: otp, hashValue: user.confirmPasswordOtp })) {
            return next(new Error("In-valid OTP", { cause: 400 }))
        }

        return res.status(201).json({
            message: "verifyd OTP",
        });

    }
)


export const resetPassword = asyncHundler(
    async (req, res, next) => {

        const { email, otp, password } = req.body;

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: {
                email,
                provider: providerEnum.system,
                confirmEmail: { $exists: true },
                deletedAt: { $exists: false },
                confirmPasswordOtp: { $exists: true },
            }
        });

        if (!user) {
            return next(new Error("In-valid account", { cause: 404 }))
        };

        if (!await compareHash({ plaintext: otp, hashValue: user.confirmPasswordOtp })) {
            return next(new Error("In-valid OTP", { cause: 400 }))
        }

        await serviceDB.updateOne({
            model: UserModel,
            filter: { email },
            data: {
                password: await generateHash({ plaintext: password }),
                changeCredTime: new Date(),
                $unset: { confirmPasswordOtp: 1 }
            }
        });

        return res.status(201).json({
            message: "Password Reset Success",
        });

    }
)

