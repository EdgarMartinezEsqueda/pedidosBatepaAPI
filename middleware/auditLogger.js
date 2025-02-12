// middleware/auditLogger.js
const logger = require("../utils/logger");

const auditLogger = (req, res, next) => {
    const userId = req.user?.id || "anonymous"; // Get the user ID or default to "anonymous"
    const actionType = `${req.method} ${req.originalUrl}`; // e.g., "POST /users"
    const details = JSON.stringify({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    // Log the action
    logger.info(`User ID: ${userId}, Action: ${actionType}, Details: ${details}`);

    next();
};

module.exports = auditLogger;