const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Ruta = sequelize.define("rutas", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    nombre: { type: DataTypes.STRING(50), allowNull: false, }
});

module.exports = Ruta;