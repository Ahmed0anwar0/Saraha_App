import { asyncHundler } from "../../utils/response.js";
import * as serviceDB from "../../DB/service.db.js"
import { UserModel } from "../../DB/models/user.model.js";
import { deleteFolder, deleteResources, destroyFile, uploadFile, uploadFiles } from "../../utils/multer/cloudinary.js";
import { MessageModel } from "../../DB/models/Message.model.js";


export const sendMessage = asyncHundler(
    async (req, res, next) => {
        if (!req.body.content && !req.files) {
            return next(new Error("message content is required"))
        }
        const { receiverId } = req.params;

        const user = await serviceDB.findOne({
            model: UserModel,
            filter: {
                _id: receiverId,
                deletedAt: { $exists: false },
                confirmEmail: { $exists: true },
            }
        })
        if (!user) {
            return next(new Error("In-valid Receiver Account" , {cause: 404}))
        }

        const {content} = req.body;
        let attachments = [];

        if (req.files) {
            attachments = await uploadFiles({files : req.files , path : `messages/${receiverId}`})
        }

        const [message] = await MessageModel.create([{
            content,
            attachments,
            receiverId,
            senderId : req.user?._id
        }])

        return res.status(201).json({ message: "message success" , message});
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

        const attachments = await uploadFiles({ files: req.files, path: `user/${req.user._id}/cover` })
        const user = await serviceDB.findOneAndUpdate({
            model: UserModel,
            filter: { _id: req.user._id, },
            data: { coverImages: attachments },
            options: { new: false }
        })

        if (user?.coverImages?.length) {
            await deleteResources({ public_ids: user.coverImages.map(ele => ele.public_id) })
        }
        return res.status(201).json({ message: "Upload Image success", user });
    }
)