const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PedidoComunidad = sequelize.define("pedidoComunidad", {
    idPedido: { type: DataTypes.BIGINT, primaryKey: true, references: { model: "pedidos",  key: "id"} },
    idComunidad: { type: DataTypes.INTEGER, primaryKey: true, references: {  model: "comunidades", key: "id" } },
    despensasCosto: DataTypes.INTEGER,
    despensasMedioCosto: DataTypes.INTEGER,
    despensasSinCosto: DataTypes.INTEGER,
    despensasApadrinadas: DataTypes.INTEGER,
    comite: DataTypes.INTEGER,
    arpilladas: DataTypes.BOOLEAN,
    observaciones: DataTypes.TEXT,
}, { tableName: "pedidoComunidad" });

module.exports = PedidoComunidad;