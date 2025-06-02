const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Ticket = sequelize.define("ticket", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idUsuario: { type: DataTypes.INTEGER, references: { model: "usuarios", key: "id" } },
  estatus: { type: DataTypes.ENUM("abierto", "en_proceso", "cerrado", "cancelado"), defaultValue: "abierto" },
  prioridad: { type: DataTypes.ENUM("baja", "media", "alta"), defaultValue: "baja" },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  comentarios: { type: DataTypes.TEXT }
});

module.exports = Ticket;