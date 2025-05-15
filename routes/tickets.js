const { Router } = require("express");
const router = Router();
const ctrlTickets = require("../controllers/ctrlTickets");
const verify = require("../middleware/verifyToken");

router
    .post("/", verify.verifyToken, ctrlTickets.createTicket)
    .get("/", verify.verifyTokenAndAdmin, ctrlTickets.getAllTickets)
    .get("/:id", verify.verifyTokenAndAdmin, ctrlTickets.getTicketById)
    .patch("/:id", verify.verifyTokenAndAdmin, ctrlTickets.updateTicket);

module.exports = router;