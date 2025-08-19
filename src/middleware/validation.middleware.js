import { Types } from "mongoose";
import { asyncHundler } from "../utils/response.js"
import joi from "joi";
import { genderEnum } from "../DB/models/user.model.js";

export const generalFields = {

    fullName: joi.string().pattern(new RegExp(/^[A-Z][a-z]{1,19}\s[A-Z][a-z]{1,19}$/)).min(2).max(20).messages({
        'string.min': "min name length is 2 char",
        'any.required': "fullName is mandatory"
    }),
    email: joi.string().email({ minDomainSegments: 2, maxDomainSegments: 2, tlds: { allow: ['net', 'com', 'edu'] } }),
    password: joi.string().pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d\W]{8,16}$/)),
    confirmPassword: joi.string().valid(joi.ref("password")),
    phone: joi.string().pattern(new RegExp(/^(002|\+2)?01[0125][0-9]{8}$/)),
    gender: joi.string().valid(...Object.values(genderEnum)),
    otp: joi.string().pattern(new RegExp(/^\d{6}$/)),
    id: joi.string().custom(
        (value , helper)=>{
            return Types.ObjectId.isValid(value) || helper.message("In-Valid ObjectId")
    }) ,
}

export const validation = (schema) => {
    return asyncHundler(
        async (req, res, next) => {
            
            const validationError = [];

            for (const key of Object.keys(schema)) {

                const validationResult = schema[key].validate(req[key], { abortEarly: false })

                if (validationResult.error) {
                    validationError.push({
                        key,
                        details: validationResult.error.details.map(ele => {
                            return { message: ele.message, path: ele.path[0] }
                        })
                    })
                }
            }
            if (validationError.length) {
                return res.status(400).json({ validationError })
            }
            return next()
        }
    )
}