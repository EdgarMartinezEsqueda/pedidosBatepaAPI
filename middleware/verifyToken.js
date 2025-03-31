require("dotenv").config();
const jwt = require("jsonwebtoken");

// Utility function for error responses
const sendErrorResponse = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "error",
        error: { code: statusCode, message },
        meta: { request_time: new Date().toLocaleString() },
    });
};

// Verify token
const verifyToken = (req, res, next) => {
    const token = req.cookies.jwt;

    if (!token) {
        return sendErrorResponse(res, 401, "No token provided");
    }

    jwt.verify(token, process.env.FRASE_JWT, (err, user) => {
        if (err) {
            console.error("Token verification failed:", err); // Log the error for debugging
            return sendErrorResponse(res, 403, "Failed to authenticate token");
        }
        req.user = user; // Attach the decoded user to the request object
        next();
    });
};

// Verify token and authorization
const verifyTokenAndAuthorization = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.id === req.params.id || req.user.rol === "Direccion" ) {
            next();
        } else {
            return sendErrorResponse(res, 403, "You are not authorized to perform this action");
        }
    });
};

// Verify token and admin role
const verifyTokenAndAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if ( req.user.rol === "Direccion" ) {
            next();
        } else {
            return sendErrorResponse(res, 403, "You are not authorized to perform this action");
        }
    });
};

module.exports = {
    verifyToken,
    verifyTokenAndAuthorization,
    verifyTokenAndAdmin,
};