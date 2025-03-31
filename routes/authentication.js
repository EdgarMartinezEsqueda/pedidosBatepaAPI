const { Router } = require("express");
const router = Router();
const controllerAuthentication = require("../controllers/ctrlAuthentication");

// All endpoints for user authentication
router
    .post("/registro", controllerAuthentication.registerUsers)
    .post("/login", controllerAuthentication.loginUsers)
    .post("/logout", controllerAuthentication.logoutUser);

module.exports = router;
