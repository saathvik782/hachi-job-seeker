var express = require('express');
var router = express.Router();

//LinkedIn
var linkedInRoutes = require('./requests');
router.use('/jobRequest',jobRequestRoutes);

module.exports = router;
