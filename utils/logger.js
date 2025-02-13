require("dotenv").config();
const winston = require("winston");
const { combine, timestamp, printf, colorize } = winston.format;

// Define a custom log format
const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

// Create a logger instance
const logger = winston.createLogger({
    level: "info", // Set the default log level
    format: combine(
        timestamp({ format: "DD-MM-YYYY HH:mm:ss" }), // Add timestamp
        logFormat // Apply the custom log format
    ),
    transports: [
        // Log to the console
        new winston.transports.Console({
            format: combine(
                colorize(), // Add colors to console output
                logFormat
            ),
        }),
        // Log to a file
        new winston.transports.File({
            filename: `logs/audit_${process.env.NODE_ENV}.log`, // Save logs to a file
            level: "info", // Log only info-level messages and above
        }),
    ],
});

module.exports = logger;