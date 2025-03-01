const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Comunidad = sequelize.define("comunidades", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.TEXT, allowNull: false },
    municipio: { type: DataTypes.TEXT, allowNull: false },
    jefa: DataTypes.TEXT,
    contacto: DataTypes.TEXT,
    direccion: DataTypes.TEXT,
    idRuta: { type: DataTypes.INTEGER, references: { model: "Rutas", key: "id" } }
});

module.exports = Comunidad;