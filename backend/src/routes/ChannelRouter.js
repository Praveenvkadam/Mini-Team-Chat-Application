
const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const auth = require('../middleware/AuthMiddleware');

router.get('/channels', auth, channelController.getChannels);
router.post('/channels', auth, channelController.createChannel);


router.get('/channels/:id/members', auth, channelController.getChannelMembers);
router.post('/channels/:id/join', auth, channelController.joinChannel);
router.delete('/channels/:id', auth, channelController.deleteChannel);


router.get('/channels/:id', auth, channelController.getChannel);

router.get('/my-channels', auth, channelController.getMyChannels);
router.post('/channels/:id/invite', auth, channelController.inviteUser);

module.exports = router;
