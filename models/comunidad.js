const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Comunidad = sequelize.define("comunidades", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(200), allowNull: false }, // De TEXT a STRING
    idMunicipio: { type: DataTypes.INTEGER, allowNull: false }, // Nuevo campo relacional
    jefa: DataTypes.STRING(100), // De TEXT a STRING
    contacto: DataTypes.STRING(50), // De TEXT a STRING
    direccion: DataTypes.TEXT,
    idRuta: { type: DataTypes.INTEGER, references: { model: "rutas", key: "id" } },
    costoPaquete: { type: DataTypes.DECIMAL(10, 2), defaultValue: 170.00 },
    notas: DataTypes.STRING(50), // De TEXT a STRING
});

module.exports = Comunidad;