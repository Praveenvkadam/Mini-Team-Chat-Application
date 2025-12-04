const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const auth = require('../middleware/AuthMiddleware');

// GET /api/channels
router.get('/', auth, channelController.getChannels);

// POST /api/channels
router.post('/', auth, channelController.createChannel);

// GET /api/channels/my-channels
router.get('/my-channels', auth, channelController.getMyChannels);

// GET /api/channels/:id/members
router.get('/:id/members', auth, channelController.getChannelMembers);

// POST /api/channels/:id/join
router.post('/:id/join', auth, channelController.joinChannel);

// POST /api/channels/:id/invite
router.post('/:id/invite', auth, channelController.inviteUser);

// DELETE /api/channels/:id
router.delete('/:id', auth, channelController.deleteChannel);

// GET /api/channels/:id   (id OR name)
router.get('/:id', auth, channelController.getChannel);

module.exports = router;
