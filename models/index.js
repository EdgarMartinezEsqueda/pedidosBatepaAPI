const sequelize = require("../config/database");

// Import models
const Comunidad = require("./comunidad");
const Pedido = require("./pedido");
const PedidoComunidad = require("./pedidoComunidad");
const Ruta = require("./ruta");
const Usuario = require("./usuario");
const Municipio = require("./municipio");
const Tickets = require("./tickets");

// Define relationships

// Ruta has many Comunidades
Ruta.hasMany(Comunidad, { foreignKey: "idRuta", as: "comunidad"});
Comunidad.belongsTo(Ruta, { foreignKey: "idRuta", as: "ruta" });

// Usuario has many Pedidos
Usuario.hasMany(Pedido, { foreignKey: "idTs", as: "pedido" });
Pedido.belongsTo(Usuario, { foreignKey: "idTs", as: "usuario" });

// Ruta has many Pedidos
Ruta.hasMany(Pedido, { foreignKey: "idRuta", as: "pedido" });
Pedido.belongsTo(Ruta, { foreignKey: "idRuta",  as: "ruta" });

// Pedido has many Comunidades through PedidoComunidad
Pedido.belongsToMany(Comunidad, { through: PedidoComunidad, foreignKey: "idPedido", as: "comunidad" });
Comunidad.belongsToMany(Pedido, { through: PedidoComunidad, foreignKey: "idComunidad", as: "pedido" });

// Comunidad belongs to Municipio and Municipio has many Comunidades
Comunidad.belongsTo(Municipio, { foreignKey: "idMunicipio", as: "municipio" });
Municipio.hasMany(Comunidad, { foreignKey: "idMunicipio", as: "comunidad" });

Pedido.hasMany(PedidoComunidad, { foreignKey: "idPedido", as: "pedidoComunidad" });
PedidoComunidad.belongsTo(Pedido, { foreignKey: "idPedido", as: "pedido" });

Comunidad.hasMany(PedidoComunidad, { foreignKey: "idComunidad", as: "pedidoComunidad" });
PedidoComunidad.belongsTo(Comunidad, { foreignKey: "idComunidad", as: "comunidad" });

// Relacion para la tabla tabla tickets
Tickets.belongsTo(Usuario, { foreignKey: "idUsuario" });

// Export models
module.exports = {
    sequelize,
    Comunidad,
    Pedido,
    Ruta,
    Usuario,
    PedidoComunidad,
    Municipio,
    Tickets
};