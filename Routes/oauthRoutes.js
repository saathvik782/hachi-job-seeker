var express = require('express');
var router = express.Router();

//LinkedIn
var linkedInRoutes = require('./linkedInRoutes');
router.use('/linkedin',linkedInRoutes);

//Google+
var googlePlusRoutes = require('./googlePlusRoutes');
router.use('/googlePlus',googlePlusRoutes);


module.exports = router;
