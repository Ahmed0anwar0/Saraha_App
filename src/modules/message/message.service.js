import { asyncHundler } from "../../utils/response.js";
import * as serviceDB from "../../DB/service.db.js"
import { UserModel } from "../../DB/models/user.model.js";
import { deleteFolder, uploadFiles } from "../../utils/multer/cloudinary.js";
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
            return next(new Error("In-valid Receiver Account", { cause: 404 }))
        }

        const { content } = req.body;
        let attachments = [];

        const [message] = await MessageModel.create([{
            content,
            attachments : [],
            receiverId,
            senderId: req.user?._id
        }])

        if (req.files) {
            attachments = await uploadFiles({ files: req.files, path: `messages/${receiverId}/${message._id}` })
            message.attachments = attachments;
            await message.save();
        }

        return res.status(201).json({ message: "message success", message });
    }
)

export const getMessageById = asyncHundler(
    async (req, res, next) => {
        const { messageId } = req.params;

        const message = await serviceDB.findOne({
            model: MessageModel,
            filter: {
                _id: messageId,
                deletedAt: { $exists: false }
            }
        });

        if (!message) {
            return next(new Error("Message not found", { cause: 404 }));
        }

        if (message.receiverId.toString() !== req.user._id.toString()) {
            return next(new Error("Not authorized to view this message", { cause: 403 }));
        }

        return res.status(200).json({ message });
    }
);


export const softDeleteMessage = asyncHundler(
    async (req, res, next) => {
        const { messageId } = req.params;

        const message = await serviceDB.findOneAndUpdate({
            model: MessageModel,
            filter: {
                _id: messageId,
                receiverId: req.user._id,
                deletedAt: { $exists: false }
            },
            data: {
                deletedAt: Date.now(),
                deletedBy: req.user._id
            }
        });

        return message
            ? res.status(200).json({ message: "Message deleted successfully", data: message })
            : next(new Error("Invalid Message or Not Authorized", { cause: 404 }));
    }
);

export const hardDeleteMessage = asyncHundler(
    async (req, res, next) => {
        const { messageId } = req.params;

        const message = await serviceDB.deleteOne({
            model: MessageModel,
            filter: {
                _id: messageId,
                receiverId: req.user._id,
                deletedAt: { $exists: true }
            }
        });

        if (message.deletedCount) {
            await deleteFolder({ prefix: `messages/${req.user._id}/${messageId}` });
        }

        return message.deletedCount
            ? res.status(200).json({ message: "Message deleted (hard) successfully" })
            : next(new Error("Invalid Message or Not Authorized", { cause: 404 }));
    }
);
