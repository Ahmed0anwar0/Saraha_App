import multer from "multer";
import path from "node:path";
import fs from "node:fs";

export const fileValidation = {
    image: ['image/jpeg', 'image/gif'],
    document: ['application/pdf', 'application/msword']
}

export const localFileUpload = ({ customPath = "general", validation = [], maxFileSizeMB = 5 } = {}) => {

    const storage = multer.diskStorage({

        destination: function (req, file, callback) {
            let basePath = `uploads/${customPath}`;

            if (req.user?._id) {
                basePath += `/${req.user._id}`
            }
            const fullPath = path.resolve(`./src/${basePath}`)
            if (!fs.existsSync(fullPath)) { 
                fs.mkdirSync(fullPath, { recursive: true })
            }
            file.finalPathBase = basePath

            callback(null, fullPath)
        },
        filename: function (req, file, callback) {
            const uniqueFileName = Date.now() + "__" + Math.random() + "__" + file.originalname;
            file.finalPath = file.finalPathBase + "/" + uniqueFileName;

            callback(null, uniqueFileName)
        }
    })

    const fileFilter = function (req, file, callback) {

        if (validation.includes(file.mimetype)) {
            return callback(null, true)
        }
        return callback("In-valid File Format", false)
    }

    const fileSize = {
        limits: {
            fileSize: maxFileSizeMB * 1024 * 1024
        }
        
    }
    return multer({
        dest: "./temp",
        fileFilter,
        limits:fileSize.limits,
        storage
    })
}