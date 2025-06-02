const { Resend } = require("resend");
const logger = require("../logger");
const { generateVerificationTemplate } = require("./templates/verificationEmail");
const { generatePasswordResetTemplate } = require("./templates/resetPassword")
const { generateTicketTemplate } = require("./templates/ticketEmail")

const resend = new Resend(process.env.TOKEN_RESEND);
const emailSupport = process.env.EMAIL_SUPPORT;

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

const sendTicketEmail = async (user, ticket, actionType = "actualizacion") => {
    try {
        const emailHTML = generateTicketTemplate(ticket, actionType);

        // Set para evitar duplicados, si en dado caso el mismo usuario de soporte envía tickets
        const cco = new Set();

        // Solo agregar el correo de soporte si no es el mismo que el del usuario
        if (user.email !== emailSupport)
            cco.add(emailSupport);
        
        const emailOptions = {
            from: "notificaciones@bamxtepatitlan.org",
            to: user.email,
            subject: actionType === "creacion" 
                ? "✅ Ticket creado - BAMX Tepatitlán" 
                : "🔄 Ticket actualizado - BAMX Tepatitlán",
            html: emailHTML
        };

        // Enviar copia oculta a soporte si es necesario
        if( cco.size > 0 )
            emailOptions.bcc = Array.from(cco);

        // Enviar el email
        await resend.emails.send(emailOptions);
        
        logger.info(`Email de ticket enviado a: ${user.email}`);
    } catch (error) {
        logger.error("Error enviando email de ticket:", error);
        throw error;
    }
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendTicketEmail };