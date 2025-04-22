const { Resend } = require("resend");
const logger = require("../logger");
const { generateVerificationTemplate } = require("./templates/verificationEmail");

const resend = new Resend(process.env.TOKEN_RESEND);

const sendVerificationEmail = async (user) => {
    try {
        const emailHTML = generateVerificationTemplate(user);
        
        await resend.emails.send({
            from: "notificaciones@bamxtepatitlan.org",
            to: user.email,
            subject: "✅ Cuenta verificada - BAMX Tepatitlán",
            html: emailHTML
        });
        
        logger.info(`Correo enviado a: ${user.email}`);
    } catch (error) {
        logger.error("Error enviando correo:", error);
        throw error; 
    }
};

module.exports = { sendVerificationEmail };