const { Router } = require("express");
const router = Router();
const ctrlCommunities = require("../controllers/ctrlCommunities");
const verify = require("../middleware/verifyToken");

// Community endpoints
router
    .post("/", verify.verifyTokenAndLeadership, ctrlCommunities.createCommunity)
    .get("/", verify.verifyToken, ctrlCommunities.getAllCommunities)
    .get("/:id", verify.verifyToken, ctrlCommunities.getCommunity)
    .patch("/:id", verify.verifyTokenAndLeadership, ctrlCommunities.updateCommunity)
    .delete("/:id", verify.verifyTokenAndLeadership, ctrlCommunities.deleteCommunity)
    .get("/paginadas/todas", verify.verifyToken, ctrlCommunities.getAllCommunitiesPaginated)
    .get("/ruta/:ruta", verify.verifyToken, ctrlCommunities.getCommunitiesByRoute)
    .get("/ciudad/:municipio", verify.verifyToken, ctrlCommunities.getCommunitiesByCity);

module.exports = router;