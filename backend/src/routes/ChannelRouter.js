const express = require('express');
const router = express.Router();
const auth = require('../middleware/AuthMiddleware');
const ctrl = require('../controllers/channelController');

router.post('/', auth, ctrl.createChannel);
router.post('/:id/join', auth, ctrl.joinChannel);
router.get('/', auth, ctrl.getChannels);
router.get('/mine', auth, ctrl.getMyChannels);
router.delete('/:id', auth, ctrl.deleteChannel);
router.get("/:id/members", auth, ctrl.getChannelMembers);



module.exports = router;
