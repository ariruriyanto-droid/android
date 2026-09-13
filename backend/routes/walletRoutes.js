const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/balance', walletController.getMyBalance);
router.get('/mutations', walletController.getMyMutations);
router.post('/topup-simulasi', walletController.simulateTopup);
router.post('/deduct-simulasi', walletController.simulateDeduct);

module.exports = router;
