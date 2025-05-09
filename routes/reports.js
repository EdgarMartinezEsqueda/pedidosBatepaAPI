const { Router } = require("express");
const router = Router();
const ctrlReports = require("../controllers/ctrlReport");
const verify = require("../middleware/verifyToken");

// All endpoints for reports
router
    .get("/", verify.verifyTokenAndAdmin, ctrlReports.getResumen  )
    .get("/despensas", verify.verifyTokenAndAdmin, ctrlReports.getReporteDespensas  )
    .get("/rutas", verify.verifyTokenAndAdmin, ctrlReports.getReporteRutas  )
    .get("/comunidades", verify.verifyTokenAndAdmin, ctrlReports.getReporteComunidades  )
    .get("/apadrinadas", verify.verifyTokenAndAdmin, ctrlReports.getReporteApadrinadas  )
    .get("/ts", verify.verifyTokenAndAdmin, ctrlReports.getReporteTS  )
    .get("/economicos", verify.verifyTokenAndAdmin, ctrlReports.getReporteEconomico  );

module.exports = router;
