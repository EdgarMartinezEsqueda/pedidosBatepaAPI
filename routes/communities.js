const { Router } = require("express");
const router = Router();
const ctrlCommunities = require("../controllers/ctrlCommunities");
const verify = require("../middleware/verifyToken");

// Community endpoints
router
    .post("/", verify.verifyTokenAndAdmin, ctrlCommunities.createCommunity)
    .get("/", verify.verifyToken, ctrlCommunities.getAllCommunities)
    .get("/:id", verify.verifyTokenAndAuthorization, ctrlCommunities.getCommunity)
    .patch("/:id", verify.verifyTokenAndAdmin, ctrlCommunities.updateCommunity)
    .delete("/:id", verify.verifyTokenAndAdmin, ctrlCommunities.deleteCommunity)
    .get("/ciudad/:municipio", verify.verifyToken, ctrlCommunities.getCommunitiesByCity);

module.exports = router;