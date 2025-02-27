const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PedidoComunidad = sequelize.define("pedidoComunidad", {
    idPedido: { type: DataTypes.BIGINT, primaryKey: true, references: { model: "Pedidos",  key: "id"} },
    idComunidad: { type: DataTypes.INTEGER, primaryKey: true, references: {  model: "Comunidades", key: "id" } },
    despensasCosto: DataTypes.INTEGER,
    despensasMedioCosto: DataTypes.INTEGER,
    despensasSinCosto: DataTypes.INTEGER,
    despensasApadrinadas: DataTypes.INTEGER,
    arpilladas: DataTypes.BOOLEAN,
    observaciones: DataTypes.TEXT,
});

module.exports = PedidoComunidad;