const { Router } = require("express");
const router = Router();
const controllerUsuarios = require("../controllers/ctrlUsers");
const verify = require("../middleware/verifyToken");

// All endpoints for user actions
router
    .get("/", verify.verifyTokenAndAdmin, controllerUsuarios.getAllUsers )
    .get("/:id", verify.verifyTokenAndAuthorization, controllerUsuarios.getUser )
    .patch("/:id", verify.verifyTokenAndAuthorization, controllerUsuarios.updateUser )
    .delete("/:id", verify.verifyTokenAndAdmin, controllerUsuarios.deleteUser )
    .patch("/:id/verificar", verify.verifyTokenAndAdmin, controllerUsuarios.verifyUser )
    .get("/todos/pendientes", verify.verifyTokenAndAdmin, controllerUsuarios.getPendingUsers)
    .get("/todos/conPedidos", verify.verifyToken, controllerUsuarios.getUsersWithOrders);

module.exports = router;
