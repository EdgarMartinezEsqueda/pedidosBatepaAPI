const { Tickets, Usuario } = require("../models/index");
const logger = require("../utils/logger");
const { sendTicketEmail } = require("../utils/email/emailService");

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

// POST /tickets - Crear ticket (usuario autenticado)
const createTicket = async (req, res) => {
    try {
        const { idUsuario, descripcion, prioridad = "baja" } = req.body;
        
        if (!idUsuario || !descripcion) 
            return sendErrorResponse(res, 400, "Faltan campos requeridos");

        // Verificar que el usuario exista
        const usuario = await Usuario.findByPk(idUsuario);
        if (!usuario) 
            return sendErrorResponse(res, 404, "Usuario no encontrado");

        const nuevoTicket = await Tickets.create({
            idUsuario,
            descripcion,
            prioridad,
            estatus: "abierto" // Valor por defecto
        });

        // Enviar email de confirmación
        await sendTicketEmail(usuario, nuevoTicket, "creacion");

        logger.info(`Ticket creado: ${nuevoTicket.id}`);
        return sendSuccessResponse(res, 201, nuevoTicket);
    } catch (e) {
        logger.error(`Error creando ticket: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

// GET /tickets - Listar tickets (admin: todos, usuario: solo los suyos)
const getAllTickets = async (req, res) => {
    try {
        const tickets = await Tickets.findAll({
            include: [{
                model: Usuario,
                as: "usuario",
                attributes: ["id", "username", "email"]
            }],
            order: [["createdAt", "DESC"]]
        });

        return sendSuccessResponse(res, 200, tickets);
    } catch (e) {
        logger.error(`Error obteniendo tickets: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

// GET /tickets/:id - Obtener ticket específico
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await Tickets.findByPk(id, {
            include: [{
                model: Usuario,
                as: "usuario",
                attributes: ["id", "username", "email"]
            }]
        });

        if (!ticket) 
            return sendErrorResponse(res, 404, "Ticket no encontrado");

        // Autorización: solo admin o dueño del ticket
        if (!req.user.rol === "Direccion" && ticket.idUsuario !== req.user.id) 
            return sendErrorResponse(res, 403, "No autorizado");

        return sendSuccessResponse(res, 200, ticket);
    } catch (e) {
        logger.error(`Error obteniendo ticket: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

// PATCH /tickets/:id - Actualizar (solo admin)
const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { estatus, prioridad, comentarios } = req.body;
        
        const ticket = await Tickets.findByPk(id);

        if (!ticket) 
            return sendErrorResponse(res, 404, "Ticket no encontrado");

        // Validar campos permitidos
        const updates = {};
        if (estatus && ["abierto", "en_proceso", "cerrado", "cancelado"].includes(estatus)) 
            updates.estatus = estatus;
        
        if (prioridad && ["baja", "media", "alta"].includes(prioridad)) 
            updates.prioridad = prioridad;

        if (comentarios)
            updates.comentarios = comentarios;

        await ticket.update(updates);
        
        // Notificar al usuario por email
        const usuario = await Usuario.findByPk(ticket.idUsuario);
        
        await sendTicketEmail(usuario, ticket, "actualizacion");

        return sendSuccessResponse(res, 200, ticket);
    } catch (e) {
        logger.error(`Error actualizando ticket: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket
};