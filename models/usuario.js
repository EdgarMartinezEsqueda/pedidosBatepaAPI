const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // import the db conection

const Usuario = sequelize.define( "usuarios", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(256), allowNull: false },
    email: { type: DataTypes.STRING(256), validate: { isEmail : true }, unique: true, allowNull: false },
    password: { type: DataTypes.STRING(256), allowNull: false },
    rol: { type: DataTypes.ENUM("Direccion", "Almacen", "Ts", "Coordinadora"), default: "Almacen" },
    verificado: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {} );

module.exports = Usuario;