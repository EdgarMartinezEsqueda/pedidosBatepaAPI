const { Resend } = require("resend");
const logger = require("../logger");
const { generateVerificationTemplate } = require("./templates/verificationEmail");
const { generatePasswordResetTemplate } = require("./templates/resetPassword")

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

const sendPasswordResetEmail = async (user, token) => {
    try {
        const emailHTML = generatePasswordResetTemplate(token);
        
        await resend.emails.send({
            from: "notificaciones@bamxtepatitlan.org",
            to: user.email,
            subject: "🔒 Restablece tu contraseña - BAMX Tepatitlán",
            html: emailHTML
        });
        
        logger.info(`Password reset email sent to: ${user.email}`);
    } catch (error) {
        logger.error("Error sending password reset email:", error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };