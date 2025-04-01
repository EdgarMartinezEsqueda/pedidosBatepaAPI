const { Router } = require("express");
const router = Router();
const ctrlPedidos = require("../controllers/ctrlPedidos");
const verify = require("../middleware/verifyToken");

// Order endpoints
router
    .post("/", verify.verifyTokenAndAuthorization, ctrlPedidos.createOrder)
    .get("/", verify.verifyToken, ctrlPedidos.getAllOrders)
    .get("/:id", verify.verifyToken, ctrlPedidos.getOrder)
    .patch("/:id", verify.verifyTokenAndAuthorization, ctrlPedidos.updateOrder)
    .delete("/:id", verify.verifyTokenAndAdmin, ctrlPedidos.deleteOrder); 

module.exports = router;