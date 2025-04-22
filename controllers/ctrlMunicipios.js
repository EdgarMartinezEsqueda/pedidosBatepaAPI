const { Municipio } = require("../models/index");
const logger = require("../utils/logger");

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

const getAllMunicipios = async (req, res) => {
    try {
        const municipios = await Municipio.findAll({
            order: [["nombre", "ASC"]] // Orden alfabético
        });
        
        logger.info(`Fetched ${municipios.length} municipios`);
        return sendSuccessResponse(res, 200, municipios);
    } catch (e) {
        logger.error(`Error fetching municipios: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getMunicipioById = async (req, res) => {
    try {
        const id = req.params.id;
        const municipio = await Municipio.findByPk(id);
        
        if (!municipio) return sendErrorResponse(res, 404, "Municipio not found");
        
        return sendSuccessResponse(res, 200, municipio);
    } catch (e) {
        logger.error(`Error fetching municipio: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

module.exports = {
    getAllMunicipios,
    getMunicipioById
}