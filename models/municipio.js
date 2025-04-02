const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Municipio = sequelize.define("municipios", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true }
});

module.exports = Municipio;