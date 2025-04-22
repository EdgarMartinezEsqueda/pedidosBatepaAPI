const { Router } = require("express");
const router = Router();
const ctrlRoutes = require("../controllers/ctrlRoutes");
const verify = require("../middleware/verifyToken");

// Route endpoints
router
    .post("/", verify.verifyTokenAndLeadership, ctrlRoutes.createRoute)
    .get("/", verify.verifyToken, ctrlRoutes.getAllRoutes)
    .get("/:id", verify.verifyToken, ctrlRoutes.getRoute)
    .patch("/:id", verify.verifyTokenAndLeadership, ctrlRoutes.updateRoute)
    .delete("/:id", verify.verifyTokenAndLeadership, ctrlRoutes.deleteRoute);

module.exports = router;