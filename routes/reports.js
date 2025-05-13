const { Router } = require("express");
const router = Router();
const ctrlReports = require("../controllers/ctrlReport");
const verify = require("../middleware/verifyToken");

// All endpoints for reports
router
    .get("/", verify.verifyToken, ctrlReports.getResumen  )
    .get("/despensas", verify.verifyToken, ctrlReports.getReporteDespensas  )
    .get("/rutas", verify.verifyToken, ctrlReports.getReporteRutas  )
    .get("/comunidades", verify.verifyToken, ctrlReports.getReporteComunidades  )
    .get("/apadrinadas", verify.verifyToken, ctrlReports.getReporteApadrinadas  )
    .get("/ts", verify.verifyToken, ctrlReports.getReporteTS  )
    .get("/economicos", verify.verifyToken, ctrlReports.getReporteEconomico  )
    .get("/calendario", verify.verifyToken, ctrlReports.getCalendario);

module.exports = router;
