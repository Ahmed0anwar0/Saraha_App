import nodemailer from "nodemailer"

const sendEmail = async ({
    from = process.env.OWNER_EMAIL,
    to = "",
    cc = "",
    bcc = "",
    text = "",
    html = "",
    subject = "Saraha-App",
    attachments = [],
} = {}) => {

    const transporter = nodemailer.createTransport({ 
        service: "gmail",
        auth: {
            user: process.env.OWNER_EMAIL,
            pass: process.env.OWNER_PASS,
        },
    });

    const emailMessage = await transporter.sendMail({
        from: `"Saraha-App 👋" <${from}>`,
        to,
        cc,
        bcc,
        text,
        html,
        subject,
        attachments
    });

};

export default sendEmail