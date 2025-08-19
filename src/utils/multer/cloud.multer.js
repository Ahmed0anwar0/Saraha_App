import multer from "multer";
export const fileValidation = {
    image: ['image/jpeg', 'image/gif'],
    document: ['application/pdf', 'application/msword' , 'application/json']
}

export const cloudFileUpload = ({ validation = [], maxFileSizeMB = 5 } = {}) => {

    const storage = multer.diskStorage({ })

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