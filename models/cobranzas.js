const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Cobranza = sequelize.define("cobranzas", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idPedido: { type: DataTypes.BIGINT, allowNull: false },
    urlArchivo: { type: DataTypes.STRING(255), allowNull: false },
    generadoPor: { type: DataTypes.INTEGER, allowNull: true },
    fechaGeneracion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

module.exports = Cobranza;