const { Usuario, Pedido } = require("../models/index");
const logger = require("../utils/logger");
const { sendVerificationEmail } = require("../utils/email/emailService");

const argon2 = require("argon2");

// Utility function for error responses
const sendErrorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "error",
        error: { code: statusCode, message },
        meta: { request_time: new Date().toLocaleString() },
    });
};

// Utility function for success responses
const sendSuccessResponse = (res, statusCode, data) => {
    return res.status(statusCode).json({
        status: "success",
        data,
        meta: { request_time: new Date().toLocaleString() },
    });
};

// Update user
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if user exists
        const user = await Usuario.findOne({
            where: {
                id,
                activo: true
            }
        });

        if (!user) {
            logger.warn(`User not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "User not found");
        }

        // Check if there are fields to update
        if (Object.keys(updates).length === 0) {
            logger.warn(`There are no updates for the user with ID: ${id}`); // Log error
            return sendErrorResponse(res, 400, "No fields to update");
        }

        // Hash password if provided
        if (updates.password) {
            updates.password = await argon2.hash(updates.password);
        }

        // Update user
        const [result] = await Usuario.update(updates, { where: { id } });
        
        if (result !== 1) {
            logger.error(`Failed to update user with ID: ${id}`); // Log error
            return sendErrorResponse(res, 500, "Failed to update user");
        }

        if(updates.verificado) {
            await sendVerificationEmail(user);
            logger.info(`Verification email sent to: ${user.email}`); // Log success
        }

        logger.info(`User updated successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, { message: "User updated" });
    } catch (e) {
        logger.error(`Error updating user: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;

        // Validar ID
        if (isNaN(id)) {
            logger.warn(`ID inválido proporcionado: ${id}`);
            return sendErrorResponse(res, 400, "ID inválido");
        }

        // Buscar usuario
        const user = await Usuario.findByPk(id);
        if (!user) {
            logger.warn(`Usuario no encontrado con ID: ${id}`);
            return sendErrorResponse(res, 404, "Usuario no encontrado");
        }

        // Verificar si es de Dirección
        if (user.rol === "Direccion") {
            logger.warn(`Intento de borrar usuario de Dirección con ID: ${id}`);
            return sendErrorResponse(res, 403, "No se puede eliminar usuarios de Dirección");
        }

        // Actualizar campos para borrado lógico
        const [result] = await Usuario.update(
            {
                verificado: false,
                activo: false
            },
            {
                where: { id },
                individualHooks: true
            }
        );

        if (result !== 1) {
            logger.error(`Error al eliminar usuario con ID: ${id}`);
            return sendErrorResponse(res, 500, "Error al eliminar usuario");
        }

        logger.info(`Usuario desactivado exitosamente: ${id}`);
        return res.status(200).json({ message: "Usuario desactivado correctamente" });
    } catch (e) {
        logger.error(`Error eliminando usuario: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

// Get a specific user
const getUser = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        const user = await Usuario.findOne({
            where:{
                id,
                activo: true
            }
        });

        if (!user) {
            logger.warn(`User not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "User not found");
        }

        // Exclude password from the response
        const { password, ...others } = user.dataValues;

        logger.info(`User fetched successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, others);
    } catch (e) {
        logger.error(`Error fetching user: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
};
// Get a specific user

const getUsersWithOrders = async (req, res) => {
    try {
        const usuariosConPedidos = await Usuario.findAll({
            include: [{
                model: Pedido,
                as: "pedido",
                attributes: [],
                required: true // hace INNER JOIN, así solo trae usuarios que tengan pedidos
            }],
            attributes: ["id", "username"]
            });

        if (!usuariosConPedidos || usuariosConPedidos.length === 0) {
            logger.warn(`No hay usuarios que hayan hecho pedidos`); // Log warning
            return sendErrorResponse(res, 404, "No hay usuarios que hayan hecho pedidos");
        }

        logger.info(`Users fetched successfully for order filter`); // Log success
        return sendSuccessResponse(res, 200, usuariosConPedidos);
    } catch (e) {
        logger.error(`Error fetching users for order filter: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await Usuario.findAll({
            attributes: { exclude: ["password"] }, // Exclude sensitive fields
            where: { activo: true }
        });

        logger.info(`Fetched ${users.length} users`); // Log success
        return sendSuccessResponse(res, 200, users);
    } catch (e) {
        logger.error(`Error fetching all users: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

const verifyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { verificado } = req.body ?? true; // true or false
        
        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Update the user's verification status
        const user = await Usuario.update(
            { verificado },
            { where: { 
                id,
                activo: true
            } }
        );

        if (user[0] === 0) { // No rows updated
            return sendErrorResponse(res, 404, "User not found");
        }

        if(verificado) {
            const user = await Usuario.findByPk(id);
            await sendVerificationEmail(user);
            logger.info(`Verification email sent to: ${user.email}`); // Log success
        }

        return sendSuccessResponse(res, 200, { message: `User verification status updated to ${verificado}` });
    } catch (e) {
        console.error("Error verifying user:", e);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

const getPendingUsers = async (req, res) => {
    try {
        const users = await Usuario.findAll({
            where: { 
                verificado: false,
                activo: true
             },
            attributes: { exclude: ["password"] }, // Exclude sensitive data
        });

        return sendSuccessResponse(res, 200, users);
    } catch (e) {
        console.error("Error fetching pending users:", e);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

module.exports = {
    updateUser,
    deleteUser,
    getUser,
    getAllUsers,
    verifyUser,
    getPendingUsers,
    getUsersWithOrders
};