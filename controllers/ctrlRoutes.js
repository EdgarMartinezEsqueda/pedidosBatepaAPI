const { Ruta } = require("../models/index");
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

const createRoute = async (req, res) => {
    try {
        const { nombre } = req.body;

        // Validate required fields
        if (!nombre) 
            return sendErrorResponse(res, 400, "Missing or invalid fields");

        // Create the route
        const newRuta = await Ruta.create({ nombre });
        
        logger.info(`Ruta successfully registered: ${newRuta.dataValues.id}`);
        return sendSuccessResponse(res, 201, newRuta.dataValues);
    } catch (e) {
        console.error(e); // Log the error for debugging
        if (e.name === "SequelizeUniqueConstraintError") 
            return sendErrorResponse(res, 422, "El correo electrónico ya está registrado");
        
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getAllRoutes = async (req, res) => {
    try {
        const routes = await Ruta.findAll();

        logger.info(`Fetched ${routes.length} routes`); // Log success
        return sendSuccessResponse(res, 200, routes);
    } catch (e) {
        logger.error(`Error fetching all routes: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const getRoute = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        const route = await Ruta.findByPk(id);

        if (!route) {
            logger.warn(`Route not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Route not found");
        }

        logger.info(`Route fetched successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, route.dataValues);
    } catch (e) {
        logger.error(`Error fetching route: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const updateRoute = async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if route exists
        const route = await Ruta.findByPk(id);
        if (!route) {
            logger.warn(`Route not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Route not found");
        }

        // Update route
        const [result] = await Ruta.update(updates, { where: { id } });

        if (result !== 1) {
            logger.error(`Failed to update route with ID: ${id}`); // Log error
            return sendErrorResponse(res, 500, "Failed to update route");
        }

        logger.info(`Route updated successfully: ${id}`); // Log success
        return sendSuccessResponse(res, 200, { message: "Route updated" });
    } catch (e) {
        logger.error(`Error updating route: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

const deleteRoute = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate ID
        if (isNaN(id)) {
            logger.warn(`Invalid ID provided: ${id}`); // Log warning
            return sendErrorResponse(res, 400, "Invalid ID");
        }

        // Check if route exists
        const route = await Ruta.findByPk(id);
        if (!route) {
            logger.warn(`Route not found with ID: ${id}`); // Log warning
            return sendErrorResponse(res, 404, "Route not found");
        }

        // Delete route
        const result = await Ruta.destroy({ where: { id } });

        if (result !== 1) {
            logger.error(`Failed to delete route with ID: ${id}`); // Log error
            return sendErrorResponse(res, 500, "Failed to delete route");
        }

        logger.info(`Route deleted successfully: ${id}`); // Log success
        return res.status(204).end(); // No content for successful deletion
    } catch (e) {
        logger.error(`Error deleting route: ${e.message}`); // Log error
        return sendErrorResponse(res, 500, "Internal server error");
    }
}

module.exports= {
    createRoute,
    getAllRoutes,
    getRoute,
    updateRoute,
    deleteRoute
}