const { Op } = require("sequelize");
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
                observaciones: comunidad.observaciones,
                comite: comunidad.comite,
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
        const { fechaEntrega, devoluciones, pedidoComunidad, estado, horaLlegada, ...otrosUpdates } = req.body;
        
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
        if (horaLlegada !== undefined) updateFields.horaLlegada = horaLlegada;
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
                    observaciones: pc.observaciones || "",
                    comite: pc.comite || 0
                })), 
                { transaction }
            );
        }

        await transaction.commit(); 
       
        return sendSuccessResponse(res, 200, "successfully updated order");

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

const getOrdersByTs = async (req, res) => {
    try {
        const id = req.params.id;
        const orders = await Pedido.findAll({
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
            where: { idTs : id }
        });
        logger.info(`Fetched ${orders.length} orders`); // Log success
        return sendSuccessResponse(res, 200, orders);
    } catch (e) {
        logger.error(`Error fetching all orders for Route: ${req.params.ruta}\n${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

// En tu controlador de pedidos
const getAllOrdersForExport = async (req, res) => {
  try {
    const { 
      usuarios = [], 
      rutas = [], 
      estatusPedido = [], 
      startDate, 
      endDate 
    } = req.body.params;
    
    const where = {};
    
    // Filtros para usuarios, rutas y estado
    if (usuarios.length > 0) where['$usuario.username$'] = { [Op.in]: usuarios };
    if (rutas.length > 0) where['$ruta.nombre$'] = { [Op.in]: rutas };
    if (estatusPedido.length > 0) where.estado = { [Op.in]: estatusPedido };
    
    // Manejo preciso de fechas
    if (startDate || endDate) {
      const startOfDay = (dateStr) => new Date(new Date(dateStr).setUTCHours(0, 0, 0, 0));
      const endOfDay = (dateStr) => new Date(new Date(dateStr).setUTCHours(23, 59, 59, 999));

      if (startDate && endDate) {
        where.fechaEntrega = {
            [Op.between]: [startOfDay(startDate), endOfDay(endDate)]
        };
      } else if (startDate) {
        where.fechaEntrega = { [Op.gte]: startOfDay(startDate) };
      } else if (endDate) {
        where.fechaEntrega = { [Op.lte]: endOfDay(endDate) };
      }
    }

    const pedidos = await Pedido.findAll({
      where,
      include: [
        {
            model: Usuario,
            as: "usuario",
            attributes: ["username"],
        },
        {
            model: Ruta,
            as: "ruta",
            attributes: ["nombre"],
        },
        {
            model: PedidoComunidad,
            as: "pedidoComunidad",
            include: [{
                model: Comunidad,
                as: "comunidad",
                include: [{
                    model: Municipio,
                    as: "municipio",
                    attributes: ["nombre"],
                }]
            }]
        }
      ],
      order: [["id", "DESC"]]
    });

    return sendSuccessResponse(res, 200, pedidos);
  } catch (e) {
    console.log(e)
    logger.error(`Error exporting orders: ${e.message}`);
    return sendErrorResponse(res, 500, "Error al exportar pedidos");
  }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrder,
    getOrdersByRoute,
    getOrdersByTs,
    getAllOrdersForExport,
    updateOrder,
    deleteOrder,
};