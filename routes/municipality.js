const { Router } = require("express");
const router = Router();
const ctrlMunicipality = require("../controllers/ctrlMunicipios");
const verify = require("../middleware/verifyToken");

// Municipality endpoints
router
    .get("/", verify.verifyToken, ctrlMunicipality.getAllMunicipios)
    .get("/:id", verify.verifyToken, ctrlMunicipality.getMunicipioById);

module.exports = router;