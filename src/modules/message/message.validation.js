import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { logoutEnum } from "../../utils/security/token.security.js";
import { fileValidation } from "../../utils/multer/local.multer.js";


export const sendMessage = {
    params: joi.object().keys(
        { receiverId: generalFields.id.required() }
    ),

     body: joi.object().keys(
        {content: joi.string().min(2).max(200000)}
    ).required(),
    
    files: joi.array().items(
        joi.object().keys({

            fieldname: joi.string().valid('attachments').required(),
            originalname: joi.string().required(),
            encoding: joi.string().required(),
            mimetype: joi.string().valid(...Object.values(fileValidation.image)).required(),
            destination: joi.string().required(),
            filename: joi.string().required(),
            path: joi.string().required(),
            size: joi.number().positive().required()

        })
    ).min(0).max(2)
}

export const getMessageById = {
    params: joi.object().keys(
        { messageId: generalFields.id.required() }
    ),

}