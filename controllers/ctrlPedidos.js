const { Pedido, Ruta, PedidoComunidad, Usuario, Comunidad, Municipio } = require("../models");
const logger = require("../utils/logger");
const sequelize = require("../config/database")

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

// Create a new order
const createOrder = async (req, res) => {
    try {
        const { idTs, idRuta, fechaEntrega, comunidades } = req.body;

        // Validate required fields
        if (!idTs || !idRuta || !fechaEntrega || !comunidades || !Array.isArray(comunidades)) 
            return sendErrorResponse(res, 400, "Missing or invalid fields");

        // Create the order
        const pedido = await Pedido.create({
            idTs,
            idRuta,
            fechaEntrega
        });
        // Add orders to the order
        for (const comunidad of comunidades) {
            await PedidoComunidad.create({
                idPedido: pedido.id,
                idComunidad: comunidad.idComunidad,
                despensasCosto: comunidad.despensasCosto,
                despensasMedioCosto: comunidad.despensasMedioCosto,
                despensasSinCosto: comunidad.despensasSinCosto,
                despensasApadrinadas: comunidad.despensasApadrinadas,
                arpilladas: comunidad.arpilladas,
                observaciones: comunidad.observaciones
            });
        }

        // Return the created order
        return sendSuccessResponse(res, 201, pedido);
    } catch (e) {
        logger.error(`Error creating order: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Fetch all orders
const getAllOrders = async (req, res) => {
    try {
        const pedidos = await Pedido.findAll( {
            include: [
                {
                    model: Usuario,  // Modelo de Usuario
                    attributes: ["username"],  // Solo el campo nombre del usuario
                    as: "usuario"  // Alias para el modelo de Usuario
                },
                {
                    model: Ruta,  // Modelo de Ruta
                    attributes: ["nombre"],  // Solo el campo nombre de la ruta
                    as: "ruta"  // Alias para el modelo de Ruta
                } ],
            order: [["id", "DESC" ]], // Obtener los pedidos mas recientes al inicio
        } );

        return sendSuccessResponse(res, 200, pedidos);
    } catch (e) {
        logger.error(`Error fetching all orders: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Fetch a specific order by ID
const getOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await Pedido.findByPk(id, {
            include: [
                {
                    model: Usuario,
                    attributes: ["username"],
                    as: "usuario"
                },
                {
                    model: Ruta,
                    attributes: ["nombre"],
                    as: "ruta"
                },
                {   
                    model: PedidoComunidad,
                    include: [
                        {
                            model: Comunidad,
                            attributes: ["nombre", "jefa", "contacto"],
                            include: [
                                {
                                    model: Municipio,
                                    attributes: ["nombre"],
                                    as: "municipio"
                                }
                            ],
                            as: "comunidad"
                        }
                    ],
                    as: "pedidoComunidad"
                } ]
        } );

        if (!pedido) 
            return sendErrorResponse(res, 404, "Order not found");
        return sendSuccessResponse(res, 200, pedido);
    } catch (e) {
        logger.error(`Error fetching order: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

// Update an order
const updateOrder = async (req, res) => {
    let transaction;
    try {
        const { id } = req.params;
        const { fechaEntrega, devoluciones, pedidoComunidad, estado, ...otrosUpdates } = req.body;
        
        if (isNaN(id)) return sendErrorResponse(res, 400, "ID inválido");

        transaction = await sequelize.transaction();

        // 1. Actualizar pedido principal
        const pedido = await Pedido.findByPk(id, { transaction });
        if (!pedido) {
            await transaction.rollback();
            return sendErrorResponse(res, 404, "Pedido no encontrado");
        }

        // Actualizar campos permitidos
        const updateFields = {};
        if (fechaEntrega) updateFields.fechaEntrega = fechaEntrega;
        if (devoluciones !== undefined) updateFields.devoluciones = devoluciones;
        if (estado) updateFields.estado = estado;
        
        await pedido.update(updateFields, { transaction });

        // 2. Manejar pedidoComunidad
        if (pedidoComunidad) {
            if (!Array.isArray(pedidoComunidad)) {
                await transaction.rollback();
                return sendErrorResponse(res, 400, "Formato inválido para pedidoComunidad");
            }

            // Eliminar existentes y crear nuevas
            await PedidoComunidad.destroy({ where: { idPedido: id }, transaction });
            
            await PedidoComunidad.bulkCreate(
                pedidoComunidad.map(pc => ({
                    idPedido: id,
                    idComunidad: pc.idComunidad,
                    despensasCosto: pc.despensasCosto || 0,
                    despensasMedioCosto: pc.despensasMedioCosto || 0,
                    despensasSinCosto: pc.despensasSinCosto || 0,
                    despensasApadrinadas: pc.despensasApadrinadas || 0,
                    arpilladas: pc.arpilladas || false,
                    observaciones: pc.observaciones || ""
                })), 
                { transaction }
            );
        }

        await transaction.commit(); 

        // 3. Obtener datos actualizados SIN TRANSACCIÓN
        const updatedOrder = await Pedido.findByPk(id, {
            include: [{
                model: PedidoComunidad,
                include: [{
                    model: Comunidad,
                    as: "comunidad"
                }],
                as: "pedidoComunidad"
            }]
        });

        return sendSuccessResponse(res, 200, updatedOrder);

    } catch (e) {
        // Verificar si la transacción sigue activa
        if (transaction && !transaction.finished) 
            await transaction.rollback();
        
        logger.error(`Error actualizando pedido: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
    }
};

// Delete an order
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (isNaN(id)) {
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if the order exists
        const pedido = await Pedido.findByPk(id);
        if (!pedido) {
            return sendErrorResponse(res, 404, "Order not found");
        }

        // Delete the order
        const result = await Pedido.destroy({ where: { id } });

        if (result !== 1) {
            return sendErrorResponse(res, 500, "Failed to delete order");
        }

        return sendSuccessResponse(res, 204); // No content for successful deletion
    } catch (e) {
        logger.error(`Error deleting order: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

const getOrdersByRoute = async (req, res) => {
    try {
        const ruta = req.params.ruta;
        const orders = await Pedido.findAll({
            where: { idRuta : ruta }
        });
        logger.info(`Fetched ${orders.length} orders`); // Log success
        return sendSuccessResponse(res, 200, orders);
    } catch (e) {
        logger.error(`Error fetching all orders for Route: ${req.params.ruta}\n${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    getOrdersByRoute,
    updateOrder,
    deleteOrder,
};
/*
// EJEMPLO DE createOrder
POST /pedidos
{
    "idTs": 1,
    "idRuta": 1,
    "fechaEntrega": "2023-12-01",
    "comunidades": [
        {
            "idComunidad": 1,
            "despensasCosto": 10,
            "despensasMedioCosto": 5,
            "despensasSinCosto": 2,
            "despensasApadrinadas": 3,
            "arpilladas": true
        },
        {
            "idComunidad": 2,
            "despensasCosto": 8,
            "despensasMedioCosto": 4,
            "despensasSinCosto": 1,
            "despensasApadrinadas": 2,
            "arpilladas": false
        }
    ]
}

// EJEMPLO DE RESPUESTA
{
    "status": "success",
    "data": {
        "id": 1,
        "idTs": 1,
        "idRuta": 1,
        "fechaEntrega": "2023-12-01",
        "estado": "creado",
        "createdAt": "2023-10-10T12:34:56.000Z"
    }
}
*/