const { Pedido, Ruta, PedidoComunidad, Comunidad } = require("../models");
const logger = require("../utils/logger");

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

        // Add communities to the order
        for (const comunidad of comunidades) {
            await PedidoComunidad.create({
                idPedido: pedido.id,
                idComunidad: comunidad.idComunidad,
                despensasCosto: comunidad.despensasCosto,
                despensasMedioCosto: comunidad.despensasMedioCosto,
                despensasSinCosto: comunidad.despensasSinCosto,
                despensasApadrinadas: comunidad.despensasApadrinadas,
                arpilladas: comunidad.arpilladas,
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
            include: [ {
                    model: Comunidad,
                    through: { attributes: [] }, // Exclude junction table attributes
            } ]
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
            include: [ {
                    model: Comunidad,
                    through: { attributes: [] }, // Exclude junction table attributes
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
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate ID
        if (isNaN(id)) {
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if the order exists
        const pedido = await Pedido.findByPk(id);
        if (!pedido) {
            return sendErrorResponse(res, 404, "Order not found");
        }

        // Update the order
        const [result] = await Pedido.update(updates, { where: { id } });

        if (result !== 1) {
            return sendErrorResponse(res, 500, "Failed to update order");
        }

        return sendSuccessResponse(res, 200, { message: "Order updated" });
    } catch (e) {
        logger.error(`Error updating order: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
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

module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
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