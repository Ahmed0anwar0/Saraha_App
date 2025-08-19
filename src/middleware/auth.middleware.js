import { asyncHundler } from "../utils/response.js"
import { decodedToken, tokenTypeEnum } from "../utils/security/token.security.js";

export const auth = ({ tokenType = tokenTypeEnum.access } = {}) => {

    return asyncHundler(async (req, res, next) => {

        const { user, decoded } = await decodedToken({ next, authorization: req.headers.authorization, tokenType }) || {};
        req.user = user;
        req.decoded = decoded;
        return next()
    })
}

export const authorization = ({ accessRole = [] } = {}) => {
    return asyncHundler(
        async (req, res, next) => {
            if (!accessRole.includes(req.user.role)) {
                return next(new Error("Not authorized Account", { cause: 403 }));
            }
            return next()
        }
    )
}