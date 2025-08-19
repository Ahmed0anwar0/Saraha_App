import { roleEnum } from "../../DB/models/user.model.js";
import { auth, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { cloudFileUpload } from "../../utils/multer/cloud.multer.js";
import { fileValidation, localFileUpload } from "../../utils/multer/local.multer.js";
import { tokenTypeEnum } from "../../utils/security/token.security.js";
import { endpoint } from "./user.authorization.js";
import * as userService from "./user.service.js";
import * as validators from "./user.validation.js";
import { Router } from "express";

const router = Router();

router.get('/', auth(), authorization({ accessRole: [roleEnum.user, roleEnum.admin] }), userService.profile)
router.get('/refresh-token', auth({ tokenType: tokenTypeEnum.refresh }), userService.getNewLoginCred)

router.get('/:userId',
    auth(),
    authorization({ accessRole: [roleEnum.user, roleEnum.admin] }),
    validation(validators.shareProfile),
    userService.shareProfile)

router.patch('/', auth(), validation(validators.updateBasicInfo), userService.updateBasicInfo)
router.delete('{/:userId}/freeze-acc', auth(), validation(validators.freezeAcc), userService.freezeAcc)

router.patch('/:userId/restore-acc',
    auth(),
    authorization({ accessRole: endpoint.restoreAcc }),
    validation(validators.restoreAcc),
    userService.restoreAcc)

router.delete('/:userId',
    auth(),
    authorization({ accessRole: endpoint.deleteAcc }),
    validation(validators.deleteAcc),
    userService.deleteAcc)

router.put('/update-password', auth(), validation(validators.updatePass), userService.updatePass)

router.patch('/profile-image',
    auth(),
    cloudFileUpload({ validation: fileValidation.image , maxFileSizeMB : 3 }).single("image"),
    userService.profileImage)

router.patch('/cover-image',
    auth(),
    cloudFileUpload({validation: fileValidation.image , maxFileSizeMB : 3}).array("images" , 2),
    validation(validators.coverImage),
    userService.coverImage)

router.post('/logout', auth(), validation(validators.logout), userService.logout)

export default router