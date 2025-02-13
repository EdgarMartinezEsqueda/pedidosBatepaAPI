const sequelize = require("../config/database");

// Import models
const Comunidad = require("./comunidad");
const Pedido = require("./pedido");
const PedidoComunidad = require("./pedidoComunidad");
const Ruta = require("./ruta");
const Usuario = require("./usuario");

// Define relationships

// Ruta has many Comunidades
Ruta.hasMany(Comunidad, { foreignKey: "idRuta" });
Comunidad.belongsTo(Ruta, { foreignKey: "idRuta" });

// Usuario has many Pedidos
Usuario.hasMany(Pedido, { foreignKey: "idTs" });
Pedido.belongsTo(Usuario, { foreignKey: "idTs" });

// Ruta has many Pedidos
Ruta.hasMany(Pedido, { foreignKey: "idRuta" });
Pedido.belongsTo(Ruta, { foreignKey: "idRuta" });

// Pedido has many Comunidades through PedidoComunidad
Pedido.belongsToMany(Comunidad, { through: PedidoComunidad, foreignKey: "idPedido" });
Comunidad.belongsToMany(Pedido, { through: PedidoComunidad, foreignKey: "idComunidad" });

// Export models
module.exports = {
    sequelize,
    Comunidad,
    Pedido,
    Ruta,
    Usuario,
    PedidoComunidad,
};