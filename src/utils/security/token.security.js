import jwt from "jsonwebtoken";
import { roleEnum, UserModel } from "../../DB/models/user.model.js";
import * as serviceDB from "../../DB/service.db.js"
import { nanoid } from "nanoid";
import { TokenModel } from "../../DB/models/Token.model.js";

export const signEnum = { bearer: 'Bearer', system: 'System' }
export const tokenTypeEnum = { access: 'access', refresh: 'refresh' }
export const logoutEnum = { logoutFromAll: 'logoutFromAll', logout: 'logout' , staylogedIn: 'staylogedIn' }

export const generateToken = async ({

  payload = {},
  sign = process.env.USER_TOKEN_SIGN,
  options = { expiresIn: Number(process.env.TOKEN_EXPIRESIN) }

} = {}) => {
  return jwt.sign(payload, sign, options)
}

export const verifyToken = async ({

  token = "",
  sign = process.env.USER_TOKEN_SIGN,

} = {}) => {
  return jwt.verify(token, sign)
}

export const getSignatures = async ({ signLevel = signEnum.bearer } = {}) => {

  let signatures = { accessSignature: undefined, refreshSignature: undefined }

  switch (signLevel) {
    case signEnum.system:
      signatures.accessSignature = process.env.SYSTEM_TOKEN_SIGN
      signatures.refreshSignature = process.env.SYSTEM_REFRESH_TOKEN_SIGN
      break;
    default:
      signatures.accessSignature = process.env.USER_TOKEN_SIGN
      signatures.refreshSignature = process.env.USER_REFRESH_TOKEN_SIGN
      break;
  }
  return signatures;
}

export const decodedToken = async ({ next, authorization = '', tokenType = tokenTypeEnum.access } = {}) => {

  const [bearer, token] = authorization?.split(' ') || [];

  if (!bearer || !token) {
    return next(new Error("Missing Token", { cause: 401 }))
  }

  let signatures = await getSignatures({ signLevel: bearer });

  const decoded = await verifyToken({
    token,
    sign: tokenType === tokenTypeEnum.access ? signatures.accessSignature : signatures.refreshSignature
  });

  if (!decoded?._id) {
    return next(new Error("In-valid Token", { cause: 400 }))
  }

  if (decoded.jti && await serviceDB.findOne({model:TokenModel , filter: {jti : decoded.jti}})) {
    return next(new Error("In-valid Credentials", { cause: 401 }))
  }

  const user = await serviceDB.findById({ model: UserModel, id: decoded._id })
  if (!user) {
    return next(new Error("Not Register Account", { cause: 404 }))
  }

  if (user.changeCredTime?.getTime() > decoded.iat * 1000) {
    return next(new Error("In-valid Login Credentials", { cause: 401 }))
  }

  return {user , decoded}
}

export const generateLoginCred = async ({ user } = {}) => {

  let signatures = await getSignatures({
    signLevel: user.role != roleEnum.user ? signEnum.system : signEnum.bearer
  })

  const jwtid = nanoid();

  const access_token = await generateToken({
    payload: { _id: user._id },
    sign: signatures.accessSignature,
    options: { jwtid, expiresIn: Number(process.env.TOKEN_EXPIRESIN) }
  });

  
  const refresh_token = await generateToken({
    payload: { _id: user._id },
    sign: signatures.refreshSignature,
    options: { jwtid, expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRESIN) }
  });

  const tokenPrefix = user.role === roleEnum.admin ? "System" : "Bearer";

  return {
    access_token, refresh_token,
    token_prefix: tokenPrefix
  };
}
