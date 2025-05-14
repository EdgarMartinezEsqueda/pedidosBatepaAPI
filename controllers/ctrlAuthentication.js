require("dotenv").config();
const crypto = require("crypto");
const { Op } = require("sequelize");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { Usuario } = require("../models/index");
const { sendPasswordResetEmail } = require("../utils/email/emailService");

// Utility functions for responses
const sendErrorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "error",
        error: { code: statusCode, message },
        meta: { request_time: new Date().toLocaleString() },
    });
};

const sendSuccessResponse = (res, statusCode, data) => {
    return res.status(statusCode).json({
        status: "success",
        data,
        meta: { request_time: new Date().toLocaleString() },
    });
};

// Register a new user
const registerUsers = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validate password fields
        if (!password || !confirmPassword) 
            return sendErrorResponse(res, 422, "Ingrese una contraseña y confírmela");
        if (password.length < 6) 
            return sendErrorResponse(res, 400, "La contraseña debe tener al menos 6 caracteres");
        
        // Check if passwords match
        if (password !== confirmPassword) 
            return sendErrorResponse(res, 400, "Las contraseñas no coinciden");
        
        // Hash the password
        const hashedPassword = await argon2.hash(password);
        
        // Create the user
        const newUser = await Usuario.create({
            username,
            email,
            password: hashedPassword,
        });
        
        logger.info(`User successfully registered (pending approval): ${username}`);
        return sendSuccessResponse(res, 201, { message: "Account pending admin approval", userId: newUser.dataValues.id } );
    } catch (e) {
        console.error(e); // Log the error for debugging
        if (e.name === "SequelizeUniqueConstraintError") 
            return sendErrorResponse(res, 422, "El correo electrónico ya está registrado");
        
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Login user
const loginUsers = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await Usuario.findOne({ where: { email } });
        if (!user) 
            return sendErrorResponse(res, 422, "Credenciales incorrectas");

        // Verify the password
        const isPasswordValid = await argon2.verify(user.password, password);
        if (!isPasswordValid) 
            return sendErrorResponse(res, 422, "Credenciales incorrectas");
        
        if (!user.verificado) 
            return sendErrorResponse(res, 403, "Account pending approval. Please contact support.");

        // Exclude password from the response
        const { password: _, ...userData } = user.dataValues;

        // Generate JWT token
        const accessToken = jwt.sign( { id: user.id, rol: user.rol }, process.env.FRASE_JWT );

    	// Configurar cookie HTTP-Only
        res.cookie("jwt", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Solo HTTPS en prod
            sameSite: "strict",
            path: "/"
        });

        logger.info(`User successfully logged in: ${user.id}`);
        return sendSuccessResponse(res, 200, /*{ ...userData, accessToken }*/ userData );
    } catch (e) {
        console.error(e); // Log the error for debugging
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// logout user
const logoutUser = (req, res) => {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });
    return sendSuccessResponse(res, 200, { message: "Logout exitoso" });
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user || !req.user.id) 
          return sendErrorResponse(res, 401, "No autenticado");

        const user = await Usuario.findByPk(req.user.id, {
        attributes: { exclude: ["password"] }
    });
      
    if (!user) return sendErrorResponse(res, 404, "Usuario no encontrado");
      
    return sendSuccessResponse(res, 200, user);
    } catch (e) {
        console.error(e);
        return sendErrorResponse(res, 500, "Error del servidor");
    }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await Usuario.findOne({ 
            where: { 
                email,
                activo: true,
                verificado: true 
            } 
        });

        if (!user) 
            return sendErrorResponse(res, 404, "Si el email existe, te enviaremos un enlace de recuperación NO JALA");

        // Generar token seguro con expiración
        const token = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hora

        await Usuario.update({
            resetPasswordToken: token,
            resetPasswordExpires: expiresAt
        }, { where: { id: user.dataValues.id } });

        // Enviar email con el token
        await sendPasswordResetEmail(user, token);

        logger.info(`Password reset requested for: ${email}`);
        return sendSuccessResponse(res, 200, { message: "Si el email existe, te enviaremos un enlace de recuperación" });

    } catch (e) {
        console.error(e);
        return sendErrorResponse(res, 500, "Error al procesar la solicitud");
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        // Validaciones
        if (password !== confirmPassword) 
            return sendErrorResponse(res, 400, "Las contraseñas no coinciden");
        
        if (password.length < 6) 
            return sendErrorResponse(res, 400, "La contraseña debe tener al menos 6 caracteres");
        
        const user = await Usuario.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) 
            return sendErrorResponse(res, 400, "El enlace de recuperación es inválido o ha expirado");

        // Actualizar contraseña y limpiar token
        const hashedPassword = await argon2.hash(password);
        
        await Usuario.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        }, { where: { id: user.id } });

        logger.info(`Password reset successful for user: ${user.id}`);
        return sendSuccessResponse(res, 200, { message: "Contraseña actualizada exitosamente" });

    } catch (e) {
        console.error(e);
        return sendErrorResponse(res, 500, "Error al actualizar la contraseña");
    }
};

module.exports = {
    registerUsers,
    loginUsers,
    logoutUser,
    getCurrentUser,
    requestPasswordReset,
    resetPassword
};