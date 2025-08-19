import CryptoJS from "crypto-js";

export const generateEnc = async ({plaintext= "" , secretkey= process.env.ENC_SECRET })=>{
    return CryptoJS.AES.encrypt(plaintext , secretkey ).toString()
}

export const decryptEnc = async ({ciphertext , secretkey= process.env.ENC_SECRET })=>{
    return CryptoJS.AES.decrypt(ciphertext , secretkey ).toString(CryptoJS.enc.Utf8)
}