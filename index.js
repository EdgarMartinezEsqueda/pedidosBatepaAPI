require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser")
let app = express();

//Para que acepte JSON, formularios HTML y el CORS
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: process.env.ORIGIN.split(","),
    credentials: true, // Permitir cookies
    allowedHeaders: ["Content-Type", "X-Requested-With", "Authorization"], // Cabeceras permitidas
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] // Métodos permitidos
}));
app.use(cookieParser());
// Routes
app.use("/auth", require("./routes/authentication"));
app.use("/usuarios", require("./routes/users"));
app.use("/pedidos", require("./routes/orders"));
app.use("/comunidades", require("./routes/communities"));
app.use("/rutas", require("./routes/routes"));
app.use("/municipios", require("./routes/municipality"));
app.use("/reportes", require("./routes/reports"));
app.use("/tickets", require("./routes/tickets"));
app.use("/cobranzas", require("./routes/cobranzas"));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };