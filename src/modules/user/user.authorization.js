import { roleEnum } from "../../DB/models/user.model.js";

export const endpoint = {
    profile : [roleEnum.admin , roleEnum.user],
    restoreAcc : [roleEnum.admin],
    deleteAcc : [roleEnum.admin],
}