const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Pedido = sequelize.define("pedidos", {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    idTs: { type: DataTypes.INTEGER, references: { model: "Usuarios", key: "id" } },
    idRuta: { type: DataTypes.INTEGER, references: { model: "Rutas", key: "id" } },
    fechaEntrega: DataTypes.DATEONLY,
    estado: { type: DataTypes.ENUM ("pendiente", "creado", "finalizado"), defaultValue: "creado" },
    devoluciones: DataTypes.INTEGER,
});

module.exports = Pedido;