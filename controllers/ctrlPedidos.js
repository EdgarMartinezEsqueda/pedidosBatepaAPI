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
        // Parámetros de paginación
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        // Filtros específicos para pedidos
        const trabajadoresFilter = req.query.trabajadores ? req.query.trabajadores.split(',') : [];
        const rutasFilter = req.query.rutas ? req.query.rutas.split(',') : [];
        const estatusFilter = req.query.estatus ? req.query.estatus.split(',') : [];
        const fechaInicio = req.query.fechaInicio; // Formato YYYY-MM-DD
        const fechaFin = req.query.fechaFin; // Formato YYYY-MM-DD

        // Construcción del WHERE
        const where = {};
        const include = [
            { 
                model: Usuario,
                as: "usuario",
                attributes: ["username"],
                required: false
            },
            { 
                model: Ruta,
                as: "ruta",
                attributes: ["nombre"],
                required: false
            }
        ];

        // Aplicar filtros
        if (trabajadoresFilter.length > 0) {
            where['$usuario.username$'] = { [Op.in]: trabajadoresFilter };
            include[0].required = true; // Hacer INNER JOIN al filtrar
        }

        if (rutasFilter.length > 0) {
            where['$ruta.nombre$'] = { [Op.in]: rutasFilter };
            include[1].required = true; // Hacer INNER JOIN al filtrar
        }

        if (estatusFilter.length > 0) {
            where.estado = { [Op.in]: estatusFilter };
        }

        if (fechaInicio || fechaFin) {
            where.fechaEntrega = { 
                [Op.between]: [
                    new Date(fechaInicio ?? `${new Date().getFullYear()}-01-01`),
                    new Date(fechaFin === "" ?  `${new Date().getFullYear()}-12-31` : fechaFin)
                ]
            };
        }

        // Consulta con paginación
        const { count, rows } = await Pedido.findAndCountAll({
            where,
            include,
            distinct: true, // Para conteo correcto con JOINs
            order: [["id", "DESC"]],
            limit: pageSize,
            offset: offset
        });

        return sendSuccessResponse(res, 200, {
            pedidos: rows,
            total: count,
        });

    } catch (e) {
        logger.error(`Error fetching orders: ${e.message}`);
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
                            attributes: ["nombre", "jefa", "contacto", "costoPaquete"],
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

        // Convertir a objeto plano para manipulación
        const pedidoPlain = pedido.toJSON();
        
        // Calcular el valor total del pedido
        let total = 0;
        if (pedidoPlain.pedidoComunidad && pedidoPlain.pedidoComunidad.length > 0) {
            pedidoPlain.pedidoComunidad.forEach(item => {
                const costo = item.comunidad?.costoPaquete || 170.00; // Default 170.00 si no existe
                
                // Asegurar que los valores sean numéricos
                const completo = Number(item.despensasCosto) || 0;
                const medio = Number(item.despensasMedioCosto) || 0;
                
                // Cálculo: completo * costo + medio * (costo / 2)
                total += (completo * costo) + (medio * (costo / 2));
            });
        }
        
        // Redondear a 2 decimales
        total = Math.round(total * 100) / 100;
        
        // Agregar el total al objeto de respuesta
        pedidoPlain.total = total;
        
        return sendSuccessResponse(res, 200, pedidoPlain);
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
        logger.info(`Fetched ${orders.length} orders for 'My Orders' view`); // Log success
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
    logger.error(`Error exporting orders: ${e.message}`);
    return sendErrorResponse(res, 500, "Error al exportar pedidos");
  }
};

// Actualizar el estado de un pedido a "pendiente"
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const pedido = await Pedido.findByPk(id);

        if (!pedido) {
            return sendErrorResponse(res, 404, "Pedido no encontrado");
        }

        // Actualizar el estado del pedido a 'pendiente'
        pedido.estado = "pendiente";
        await pedido.save();

        return sendSuccessResponse(res, 200, "Estado del pedido actualizado a 'pendiente'");
    } catch (e) {
        logger.error(`Error al actualizar el estado del pedido: ${e.message}`);
        return sendErrorResponse(res, 500, "Error interno del servidor");
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
    updateOrderStatus
};