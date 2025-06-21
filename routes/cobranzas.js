const { Router } = require("express");
const router = Router();
const ctrlCobranza = require("../controllers/ctrlCobranzas");
const verify = require("../middleware/verifyToken");

// Cobranza endpoints
router
    .get("/", verify.verifyToken, ctrlCobranza.getAllCobranzas)
    .get("/:id", verify.verifyToken, ctrlCobranza.getCobranzaById)
    .get("/pedido/:id", verify.verifyToken, ctrlCobranza.getCobranzasByPedido)
    .post("/generar/:idPedido", verify.verifyToken, ctrlCobranza.generateCobranza)
    .delete("/:id", verify.verifyToken, ctrlCobranza.deleteCobranza);

module.exports = router;