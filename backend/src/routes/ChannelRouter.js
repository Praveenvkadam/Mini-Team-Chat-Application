const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const auth = require('../middleware/AuthMiddleware');

router.get('/', auth, channelController.getChannels);
router.post('/', auth, channelController.createChannel);

router.get('/my-channels', auth, channelController.getMyChannels);

router.get('/:id/members', auth, channelController.getChannelMembers);
router.post('/:id/join', auth, channelController.joinChannel);
router.post('/:id/leave', auth, channelController.leaveChannel);
router.post('/:id/invite', auth, channelController.inviteUser);
router.delete('/:id', auth, channelController.deleteChannel);
router.get('/:id', auth, channelController.getChannel);

module.exports = router;
