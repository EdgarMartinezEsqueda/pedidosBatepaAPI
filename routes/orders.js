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
    .get("/ts/:id", verify.verifyToken, ctrlPedidos.getOrdersByTs)
    .post("/export", verify.verifyToken, ctrlPedidos.getAllOrdersForExport)
    .patch("/rollback/:id", verify.verifyTokenAndAdmin, ctrlPedidos.updateOrderStatus)
    .patch("/:id", verify.verifyTokenAndRole, ctrlPedidos.updateOrder)
    .delete("/:id", verify.verifyTokenAndRole, ctrlPedidos.deleteOrder); 

module.exports = router;