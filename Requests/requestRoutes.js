var express = require('express');
var router = express.Router();

var jobRequestRoutes = require('./jobRequestRoutes');
router.use('/jobRequest',jobRequestRoutes);

module.exports = router;
