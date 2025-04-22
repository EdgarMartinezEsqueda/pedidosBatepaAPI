const { Comunidad, Ruta, Municipio } = require("../models/index");
const logger = require("../utils/logger");
const { Sequelize } = require("sequelize");

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

const createCommunity = async (req, res) => {
    try {
        const { nombre, jefa, contacto, direccion, idRuta, idMunicipio } = req.body;
        
        // Validate required fields
        if (!nombre || !idRuta || !idMunicipio) 
            return sendErrorResponse(res, 400, "Missing or invalid fields");

        // Create the order
        const community = await Comunidad.create({
            nombre,
            idMunicipio,
            jefa,
            contacto,
            direccion,
            idRuta
        });

        // Return the created order
        logger.info(`Comunidad successfully registered: ${community.dataValues.id}`);
        return sendSuccessResponse(res, 201, community);
    } catch (e) {
        logger.error(`Error creating comunidad: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getAllCommunities = async (req, res) => {
    try {
        const comunidades = await Comunidad.findAll({
          attributes: ["id", "nombre", "jefa", "contacto", "direccion", "idRuta",
            [Sequelize.col("ruta.nombre"), "nombreRuta"],
            [Sequelize.col("municipio.nombre"), "nombreMunicipio"]
          ],
          include: [
            { model: Ruta, as: "ruta", attributes: [] },
            { model: Municipio, as: "municipio", attributes: [] }
          ],
          distinct: true
        });
    
        return sendSuccessResponse(res, 200, comunidades);
    } catch (e) {
        logger.error(`Error fetching communities: ${e.message}`);
        return sendErrorResponse(res, 500, "Internal server error");
    }
};

const getCommunitiesByCity = async (req, res) => {
    try {
        const municipio = req.params.municipio;
        const communities = await Comunidad.findAll({
            where: { municipio }
        });
        logger.info(`Fetched ${communities.length} communities`); // Log success
        return sendSuccessResponse(res, 200, communities);
    } catch (e) {
        logger.error(`Error fetching all communities for City: ${municipio}\n${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getCommunitiesByRoute = async (req, res) => {
    try {
        const ruta = req.params.ruta;
        const communities = await Comunidad.findAll({
            attributes: [
                "id",
                "nombre",
                "jefa",
                "contacto",
                "direccion",
                [Sequelize.col("municipio.nombre"), "nombreMunicipio"] // Alias en minúsculas (si aplica)
            ],
            include: [
                {
                    model: Municipio,
                    as: "municipio", // Asegúrate que coincida con el alias de la asociación
                    attributes: [],
                    required: true
                }
            ],
            where: { idRuta : ruta }
        });
        logger.info(`Fetched ${communities.length} communities`); // Log success
        return sendSuccessResponse(res, 200, communities);
    } catch (e) {
        logger.error(`Error fetching all communities for Route: ${req.params.ruta}\n${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getCommunity = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        const community = await Comunidad.findByPk(id);

        if (!community) {
            logger.warn(`Community not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Community not found");
        }

        logger.info(`Community fetched successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, community.dataValues);
    } catch (e) {
        logger.error(`Error fetching community: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const updateCommunity = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if community exists
        const community = await Comunidad.findByPk(id);
        if (!community) {
            logger.warn(`Community not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Community not found");
        }

        // Update community
        const [result] = await Comunidad.update(updates, { where: { id } });

        if (result !== 1) {
            logger.error(`Failed to update community with ID: ${id}`); // Log error
            return sendErrorResponse(res, 500, "Failed to update community");
        }

        logger.info(`Community updated successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, { message: "Community updated" });
    } catch (e) {
        logger.error(`Error updating community: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const deleteCommunity = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if community exists
        const community = await Comunidad.findByPk(id);
        if (!community) {
            logger.warn(`Community not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Community not found");
        }

        // Delete community
        const result = await Comunidad.destroy({ where: { id } });

        if (result !== 1) {
            logger.error(`Failed to delete community with ID: ${id}`); // Log error
            return sendErrorResponse(res, 500, "Failed to delete community");
        }

        logger.info(`Community deleted successfully: ${id}`); // Log success
        return res.status(204).end(); // No content for successful deletion
    } catch (e) {
        logger.error(`Error deleting community: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

module.exports= {
    createCommunity,
    getAllCommunities,
    getCommunity,
    getCommunitiesByCity,
    getCommunitiesByRoute,
    updateCommunity,
    deleteCommunity
}