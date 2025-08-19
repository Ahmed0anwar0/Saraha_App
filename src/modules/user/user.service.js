import { asyncHundler } from "../../utils/response.js";
import { decryptEnc, generateEnc } from "../../utils/security/enc.security.js";
import { generateLoginCred, logoutEnum } from "../../utils/security/token.security.js";
import * as serviceDB from "../../DB/service.db.js"
import { roleEnum, UserModel } from "../../DB/models/user.model.js";
import { compareHash, generateHash } from "../../utils/security/hash.security.js";
import { TokenModel } from "../../DB/models/Token.model.js";
import { deleteFolder, deleteResources, destroyFile, uploadFile, uploadFiles } from "../../utils/multer/cloudinary.js";


export const profile = asyncHundler(
    async (req, res, next) => {

        const user = await serviceDB.findById({
            model:UserModel,
            id: req.user._id,
            populate:[{path:"messages"}]
        })
        user.phone = await decryptEnc({ ciphertext: req.user.phone })

        return res.status(201).json({ message: "profile success", user });
    }
)

export const shareProfile = asyncHundler(
    async (req, res, next) => {

        const { userId } = req.params;
        const user = await serviceDB.findOne({
            model: UserModel,
            filter: {
                _id: userId,
                confirmEmail: { $exists: true }
            }
        })

        return user ? res.status(201).json({ message: "profile success", user }) :
            next(new Error("In-valid Acc", { cause: 404 }));
    }
)

export const updateBasicInfo = asyncHundler(
    async (req, res, next) => {
        if (req.body.phone) {
            req.body.phone = await generateEnc({ plaintext: req.body.phone })
        }
        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: {
                _id: req.user._id,
            },
            data: req.body
        })

        return user ? res.status(201).json({ message: "Updated profile success", user }) :
            next(new Error("In-valid Acc", { cause: 404 }));
    }
)

export const freezeAcc = asyncHundler(
    async (req, res, next) => {
        const { userId } = req.params;
        if (userId && req.user.role !== roleEnum.admin) {
            return next(new Error("Not Authorized Account", { cause: 403 }));
        }
        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: {
                _id: userId || req.user._id,
                deletedAt: { $exists: false }
            },
            data: {
                deletedAt: Date.now(),
                deletedBy: req.user._id,
                changeCredTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1,
                }
            }
        })

        return user ? res.status(201).json({ message: "Account Deleted success", user }) :
            next(new Error("In-valid Acc", { cause: 404 }));
    }
)

export const restoreAcc = asyncHundler(
    async (req, res, next) => {
        const { userId } = req.params;

        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: {
                _id: userId,
                deletedAt: { $exists: true },
                deletedBy: { $ne: userId }
            },
            data: {
                $unset: {
                    deletedAt: 1,
                    deletedBy: 1,
                },
                restoredAt: Date.now(),
                restoredBy: req.user._id,

            }
        })

        return user ? res.status(201).json({ message: "Account Restored success", user }) :
            next(new Error("In-valid Acc", { cause: 404 }));
    }
)

export const deleteAcc = asyncHundler(
    async (req, res, next) => {
        const { userId } = req.params;

        const user = await serviceDB.deleteOne({
            model: UserModel,
            filter: {
                _id: userId,
                deletedAt: { $exists: true },
            }
        })

        if (user.deletedCount) {
            await deleteFolder({prefix : `user/${userId}`})   
        }
        return user.deletedCount ? res.status(201).json({ message: "Account Deleted success", user }) :
            next(new Error("In-valid Acc", { cause: 404 }));
    }
)

export const getNewLoginCred = asyncHundler(
    async (req, res, next) => {

        const credentials = await generateLoginCred({ user: req.user });

        return res.status(200).json({
            message: "Refresh Login Creds",
            credentials
        });
    }
)

export const updatePass = asyncHundler(
    async (req, res, next) => {

        const userId = req.user._id;
        const { oldPassword, password } = req.body;

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: { _id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const match = await compareHash({ plaintext: oldPassword, hashValue: user.password });
        if (!match) {
            return res.status(401).json({ message: "Incorrect old password" });
        }

        const hashed = await generateHash({ plaintext: password });

        await UserModel.updateOne(
            { _id: userId },
            { password: hashed }
        );

        return res.status(200).json({ message: "Password updated success" });
    }
)

export const logout = asyncHundler(
    async (req, res, next) => {
        const { flag } = req.body;
        let status = 200;
        switch (flag) {
            case logoutEnum.logoutFromAll:
                await serviceDB.updateOne({
                    model: UserModel,
                    filter: { _id: req.decoded._id },
                    data: { changeCredTime: new Date() }
                })
                break;

            default:
                await TokenModel.create([{
                    jti: req.decoded.jti,
                    expiresIn: req.decoded.iat + Number(process.env.REFRESH_TOKEN_EXPIRESIN),
                    userId: req.decoded._id
                }]);
                status = 201
                break;
        }




        return res.status(status).json({ message: "Done" });
    }
)

export const profileImage = asyncHundler(
    async (req, res, next) => {

        const { secure_url, public_id } = await uploadFile({ file: req.file, path: `user/${req.user._id}` })

        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: { _id: req.user._id, },
            data: { picture: { secure_url, public_id } },
            options: { new: false }
        })
        if (user?.picture?.public_id) {
            await destroyFile({ public_id: user.picture.public_id })
        }
        return res.status(201).json({ message: "Upload Image success", data: user });
    }
)

export const coverImage = asyncHundler(
    async (req, res, next) => {

        const attachments = await uploadFiles({files:req.files , path: `user/${req.user._id}/cover`})
        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: { _id: req.user._id, },
            data: { coverImages: attachments },
            options: { new: false }
        })
        
        if (user?.coverImages?.length) {
            await deleteResources({public_ids: user.coverImages.map(ele => ele.public_id)})
        }
        return res.status(201).json({ message: "Upload Image success", user });
    }
)