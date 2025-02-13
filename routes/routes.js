const { Router } = require("express");
const router = Router();
const ctrlRoutes = require("../controllers/ctrlRoutes");
const verify = require("../middleware/verifyToken");

// Route endpoints
router
    .post("/", verify.verifyTokenAndAdmin, ctrlRoutes.createRoute)
    .get("/", verify.verifyTokenAndAuthorization, ctrlRoutes.getAllRoutes)
    .get("/:id", verify.verifyTokenAndAuthorization, ctrlRoutes.getRoute)
    .patch("/:id", verify.verifyTokenAndAdmin, ctrlRoutes.updateRoute)
    .delete("/:id", verify.verifyTokenAndAdmin, ctrlRoutes.deleteRoute);

module.exports = router;