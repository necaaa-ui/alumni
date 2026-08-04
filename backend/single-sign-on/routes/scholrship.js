const express = require("express");
const router = express.Router();
const { handleScholarshipSSO
  } = require("../controller/scholarship.controller");

router.get("/sso", handleScholarshipSSO);

module.exports = router;