import { auth } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as authService from "./auth.service.js";
import * as validators from "./auth.validation.js";
import { Router } from "express";

const router = Router();


router.post('/signup',validation(validators.signup), authService.signup)
router.post('/login',validation(validators.login), authService.login)
router.post('/signup/gmail',validation(validators.signupWithGmail), authService.signupWithGmail)
router.post('/confirm-email',validation(validators.confirmEmail), authService.confirmEmail)
router.post('/re-Confirm-email', authService.resendConfirmEmailOtp)
router.patch('/send-forgot-password',validation(validators.sendForgotPassword), authService.sendForgotPassword)
router.patch('/verify-forgot-password',validation(validators.verifyForgotPassword), authService.verifyForgotPassword)
router.patch('/reset-password',validation(validators.resetPassword), authService.resetPassword)

export default router