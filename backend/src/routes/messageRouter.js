const express = require('express');
const router = express.Router();
const auth = require('../middleware/AuthMiddleware');
const msgCtrl = require('../controllers/messageController');

router.get('/:channelId', auth, msgCtrl.getMessages);
router.post('/', auth, msgCtrl.postMessage);
router.delete('/:messageId', auth, msgCtrl.deleteMessage);
router.put('/:messageId', auth, msgCtrl.editMessage);

module.exports = router;
