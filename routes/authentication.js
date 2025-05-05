const { Router } = require("express");
const router = Router();
const controllerAuthentication = require("../controllers/ctrlAuthentication");
const verify = require("../middleware/verifyToken");

// All endpoints for user authentication
router
    .get("/me", verify.verifyToken, controllerAuthentication.getCurrentUser)
    .post("/registro", controllerAuthentication.registerUsers)
    .post("/login", controllerAuthentication.loginUsers)
    .post("/logout", controllerAuthentication.logoutUser)
    .post("/forgotPassword", controllerAuthentication.requestPasswordReset)
    .post("/resetPassword/:token", controllerAuthentication.resetPassword);

module.exports = router;
