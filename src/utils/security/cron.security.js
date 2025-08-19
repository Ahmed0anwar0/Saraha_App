import cron from "node-cron";
import { TokenModel } from "../../DB/models/Token.model.js";

cron.schedule("0 0 * * *", async () => {

    try {
        const result = await TokenModel.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} tokens`);
    } catch (error) {
        console.error("❌ Failed deleting tokens:", error);
    }
});