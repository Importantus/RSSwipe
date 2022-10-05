var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  let datetime = new Date().toISOString()
  res.json({someDateTime: datetime});
});

module.exports = router;
