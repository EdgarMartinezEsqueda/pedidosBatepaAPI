const { Router } = require("express");
const router = Router();
const ctrlPedidos = require("../controllers/ctrlPedidos");
const verify = require("../middleware/verifyToken");

// Order endpoints
router
    .post("/", verify.verifyTokenAndRole, ctrlPedidos.createOrder)
    .get("/", verify.verifyToken, ctrlPedidos.getAllOrders)
    .get("/:id", verify.verifyToken, ctrlPedidos.getOrder)
    .get("/ruta/:id", verify.verifyToken, ctrlPedidos.getOrdersByRoute)
    .patch("/:id", verify.verifyTokenAndRole, ctrlPedidos.updateOrder)
    .delete("/:id", verify.verifyTokenAndRole, ctrlPedidos.deleteOrder); 

module.exports = router;