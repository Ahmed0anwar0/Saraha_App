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

export const updateBasicInfo = {
    body: joi.object().keys({
        fullName: generalFields.fullName,
        phone: generalFields.phone,
        gender: generalFields.gender,

    })
}

export const updatePass = {
    body: joi.object().keys({
        oldPassword: generalFields.password.required(),
        password: generalFields.password.not(joi.ref("oldPassword")).required(),
        confirmPassword: generalFields.confirmPassword.required()

    })
}

export const freezeAcc = {
    params: joi.object().keys(
        { userId: generalFields.id }
    )
}

export const restoreAcc = {
    params: joi.object().keys(
        { userId: generalFields.id.required() }
    )
}

export const deleteAcc = {
    params: joi.object().keys(
        { userId: generalFields.id.required() }
    )
}

export const logout = {
    body: joi.object().keys(
        { flag: joi.string().valid(...Object.values(logoutEnum)).default(logoutEnum.staylogedIn) }
    ).required()
}

export const coverImage = {
    files: joi.array().items(
        joi.object().keys({

            fieldname: joi.string().valid('images').required(),
            originalname: joi.string().required(),
            encoding: joi.string().required(),
            mimetype: joi.string().valid(...Object.values(fileValidation.image)).required(),
            // finalPathBase: joi.string().required(),
            // finalPath: joi.string().required(),
            destination: joi.string().required(),
            filename: joi.string().required(),
            path: joi.string().required(),
            size: joi.number().positive().required()

        }).required()
    ).min(1).max(2).required()
}
