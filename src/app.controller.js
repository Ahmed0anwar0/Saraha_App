import path from "node:path";
import * as dotenv from "dotenv";
// dotenv.config({ path: path.join("./src/config/.env") })
dotenv.config({ })


import express from 'express';
import connectDB from './DB/connection.db.js';
import authController from './modules/auth/auth.controller.js'
import userController from './modules/user/user.controller.js'
import messageController from './modules/message/message.controller.js'
import { globalErrorHandling } from './utils/response.js';
import "./utils/security/cron.security.js";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const bootstrap = async () => {

    const app = express();
    const port = process.env.PORT;
    app.use(express.json());
    app.use(morgan('dev'));
    app.use(helmet());

    const limiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 60 minutes
        limit: 500,
        standardHeaders: 'draft-8',
    })
    app.use(limiter);

    // var whitelist = ['http://127.0.0.1:3000', 'http://localhost:4200']
    // var corsOptions = {
    //     origin: function (origin, callback) {
    //         if (whitelist.indexOf(origin) !== -1) {
    //             callback(null, true)
    //         } else {
    //             callback(new Error('Not allowed by CORS'))
    //         }
    //     }
    // }
    // app.use(cors(corsOptions));

    await connectDB()

    app.get('/', (req, res) => res.send('Hello World!'))

    app.use('/auth', authController)
    app.use('/user', userController)
    app.use('/message', messageController)

    app.use('/uploads', express.static(path.resolve('./src/uploads')))

    app.all('{/*dummy}', (req, res) => res.status(404).json({ message: "invalid routing" }))

    app.use(globalErrorHandling)

    app.listen(port, () => {})
}

export default bootstrap

