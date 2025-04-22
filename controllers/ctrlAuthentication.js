require("dotenv").config();
const { Usuario } = require("../models/index");
const logger = require("../utils/logger");

const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

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

module.exports = {
    registerUsers,
    loginUsers,
    logoutUser,
    getCurrentUser
};