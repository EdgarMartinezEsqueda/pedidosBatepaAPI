require("dotenv").config();
const { Sequelize } = require("sequelize");

const DBNAME = process.env.NODE_ENV === "production" 
    ? process.env.DBNAME
    : process.env.DBNAME_TEST;

const sequelize = new Sequelize( DBNAME, process.env.DBUSERNAME, process.env.DBPASSWORD, {
    host: process.env.DBHOST,
    dialect: "mysql",
    logging: false
});

(async () => { 
    try {
        await sequelize.authenticate();
        console.log("Conexión exitosa a la base de datos");
    } catch (error) {
        console.error("No se pudo conectar a la base de datos:", error);
    }
})();

module.exports = sequelize;