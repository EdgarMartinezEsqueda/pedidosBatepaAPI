const { Cobranza, Pedido, Usuario, Ruta, PedidoComunidad, Comunidad, Municipio } = require("../models/index");
const sequelize = require("../config/database")
const logger = require("../utils/logger");
const pdfGenerator = require("../utils/pdf/pdfGenerator");
//const { subirPDFaDrive } = require("../services/driveServices");
const fs = require("fs"); // quitar cuando se agregue la subida a drive
const path = require('path');

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

const generateCobranza = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const pedidoId = req.params.idPedido;
        const { usuarioId, arpillasCantidad, arpillasImporte, excedentes, excedentesImporte } = req.body;

        // Obtener el pedido
        const pedido = await Pedido.findByPk(pedidoId, {
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

        // Verificar si el pedido existe
        if (!pedido)
            return sendErrorResponse(res, 404, "Pedido no encontrado");

        // Generar el PDF
        const buffer = await pdfGenerator(pedido, { arpillasCantidad, arpillasImporte, excedentes, excedentesImporte });

        // Verificar si el PDF está vacío
        if (!buffer || buffer.length === 0) {
            logger.error("El PDF generado está vacío");
            throw new Error("El PDF generado está vacío");
        }

        // Preparar parametros para la subida a Drive
        const nombreRuta = pedido.ruta.nombre;
        const fechaActual = new Date();
        const mes = fechaActual.toLocaleString('es-ES', { month: 'long' });
        const anio = fechaActual.getFullYear();
        const nombreMes = `${mes} ${anio}`;

        // Subir el PDF a Drive
        const nombreArchivo = `cobranza_pedido#${pedido.id}_${pedido.ruta.nombre}_${new Date().toISOString().split("T")[0]}.pdf`;
        const urlDrive = await subirPDFaDrive(buffer, nombreArchivo, nombreRuta, nombreMes);

        // Actualizar el pedido con la URL de la cobranza
        await pedido.update({
            cobranzaGenerada: true,
            urlCobranza: urlDrive
        }, { 
            where: { id: pedidoId },
            transaction 
        });
        await Cobranza.create({
            idPedido: pedidoId,
            urlArchivo: urlDrive,
            generadoPor: usuarioId
        }, { transaction });

        await transaction.commit();
        logger.info(`Cobranza generada correctamente: ${pedidoId}`);

        return sendSuccessResponse(res, 200, {
            message: "Cobranza generada correctamente",
            url: urlDrive.url
        });
        //  // Crear directorio si no existe
        //  const cobranzasDir = path.join(__dirname, '..', 'cobranzas');
        //  if (!fs.existsSync(cobranzasDir)) {
        //      fs.mkdirSync(cobranzasDir, { recursive: true });
        //  }
         
        //  // Guardar PDF localmente
        //  const fileName = `cobranza_pedido#${pedido.id}_${pedido.ruta.nombre}_${new Date().toISOString().split("T")[0]}.pdf`;
        //  const filePath = path.join(cobranzasDir, fileName);
        //  fs.writeFileSync(filePath, buffer);
        
        //  return sendSuccessResponse(res, 200, "Cobranza generada correctamente");
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al generar la cobranza: ${error.message}`);
        return sendErrorResponse(res, 500, "Error al generar la cobranza");
    }
};

const getAllCobranzas = async (req, res) => {
    try {
        const cobranzas = await Cobranza.findAll({
            include: [
                {
                    model: Pedido,
                    include: [
                        {
                            model: Usuario,
                            attributes: ["username"],
                            as: "usuario"
                        }
                    ]
                }
            ]
        });

        return sendSuccessResponse(res, 200, cobranzas);
    } catch (error) {
        logger.error(`Error al obtener las cobranzas: ${error.message}`);
        return sendErrorResponse(res, 500, "Error al obtener las cobranzas");
    }
};

const getCobranzaById = async (req, res) => {
    try {
        const { id } = req.params.id;
        const cobranza = await Cobranza.findByPk(id, {
            include: [
                {
                    model: Pedido,
                }
            ]
        });

        if (!cobranza)
            return sendErrorResponse(res, 404, "Cobranza no encontrada");

        return sendSuccessResponse(res, 200, cobranza);
    } catch (error) {
        logger.error(`Error al obtener la cobranza: ${error.message}`);
        return sendErrorResponse(res, 500, "Error al obtener la cobranza");
    }
};

const getCobranzasByPedido = async (req, res) => {
    try {
        const { id } = req.params.id;
        const cobranzas = await Cobranza.findAll({
            where: { idPedido: id }
        });

        if (!cobranzas)
            return sendErrorResponse(res, 404, "Cobranzas no encontradas");

        return sendSuccessResponse(res, 200, cobranzas);
    } catch (error) {
        logger.error(`Error al obtener las cobranzas por pedido: ${error.message}`);
        return sendErrorResponse(res, 500, "Error al obtener las cobranzas por pedido");
    }
};

const deleteCobranza = async (req, res) => {
    try {
        const { id } = req.params.id;

        const cobranza = await Cobranza.findByPk(id);
        if (!cobranza)
            return sendErrorResponse(res, 404, "Cobranza no encontrada");

        const result = await Cobranza.destroy( { where: { id } } );

        if (result !== 1)
            return sendErrorResponse(res, 500, "Error al eliminar la cobranza");

        logger.info(`Cobranza eliminada correctamente: ${id}`);
        return sendSuccessResponse(res, 204);
    } catch (error) {
        logger.error(`Error al eliminar la cobranza: ${error.message}`);
        return sendErrorResponse(res, 500, "Error al eliminar la cobranza");
    }
};

module.exports = {
    generateCobranza,
    getAllCobranzas,
    getCobranzaById,
    getCobranzasByPedido,
    deleteCobranza
}