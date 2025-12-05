const mongoose = require("mongoose");
const PrivateRequest = require("../models/PrivateRequest");
const Channel = require("../models/Channel");

const normalizeKey = (v) => (typeof v === "string" ? v.trim() : "");

const getUserId = (req) => {
  if (req.userId && mongoose.isValidObjectId(req.userId)) {
    return req.userId.toString();
  }
  if (req.user && req.user._id && mongoose.isValidObjectId(req.user._id)) {
    return req.user._id.toString();
  }
  return null;
};

async function createPrivateRequest(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const rawKey = normalizeKey(req.body.channelKey);
    if (!rawKey) {
      return res
        .status(400)
        .json({ error: "Channel ID or name is required" });
    }

    let channel = null;

    if (mongoose.isValidObjectId(rawKey)) {
      channel = await Channel.findOne({ _id: rawKey, isPrivate: true });
    }

    if (!channel) {
      channel = await Channel.findOne({
        name: rawKey,
        isPrivate: true,
      }).collation({ locale: "en", strength: 2 });
    }

    if (!channel) {
      return res.status(404).json({
        error: "Private channel not found with given id or name",
      });
    }

    const isAlreadyMember =
      Array.isArray(channel.members) &&
      channel.members.some((m) => m.toString() === userId.toString());

    if (isAlreadyMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this channel" });
    }

    const creatorId = channel.createdBy;
    if (!creatorId) {
      return res.status(400).json({ error: "Channel creator not found" });
    }

    const request = await PrivateRequest.create({
      channel: channel._id,
      requester: userId,
      creator: creatorId,
    });

    const populated = await PrivateRequest.findById(request._id)
      .populate("channel", "name isPrivate capacity members createdBy")
      .populate("requester", "username email")
      .populate("creator", "username email");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("createPrivateRequest error:", err);
    return res.status(500).json({
      error: "Server error creating request",
      detail: err.message || String(err),
    });
  }
}

async function listPrivateRequestsForUser(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = (req.query.role || "").toLowerCase();
    const status = (req.query.status || "").toLowerCase();

    let filter = {};
    if (role === "creator") {
      filter.creator = userId;
    } else if (role === "requester") {
      filter.requester = userId;
    } else {
      filter.$or = [{ creator: userId }, { requester: userId }];
    }

    if (status) {
      filter.status = status;
    }

    const requests = await PrivateRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("channel", "name isPrivate capacity members createdBy")
      .populate("requester", "username email")
      .populate("creator", "username email");

    return res.json({ requests });
  } catch (err) {
    console.error("listPrivateRequestsForUser error:", err);
    return res
      .status(500)
      .json({ error: "Server error listing requests" });
  }
}

async function getPrivateRequestForUser(req, res) {
  try {
    const userId = getUserId(req);
    const requestId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ error: "Invalid request id" });
    }

    const request = await PrivateRequest.findById(requestId)
      .populate("channel", "name isPrivate capacity members createdBy")
      .populate("requester", "username email")
      .populate("creator", "username email");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const creatorId = request.creator?._id || request.channel?.createdBy;
    const requesterId = request.requester?._id;

    const isCreator =
      creatorId && creatorId.toString() === userId.toString();
    const isRequester =
      requesterId && requesterId.toString() === userId.toString();

    if (!isCreator && !isRequester) {
      return res
        .status(403)
        .json({ error: "Not allowed to view this request" });
    }

    return res.json(request);
  } catch (err) {
    console.error("getPrivateRequestForUser error:", err);
    return res
      .status(500)
      .json({ error: "Server error fetching request" });
  }
}

async function updatePrivateRequestStatus(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestId = req.params.id;
    const action = (req.params.action || "").toLowerCase();

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ error: "Invalid request id" });
    }

    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({ error: "Invalid action" });
    }

    let request = await PrivateRequest.findById(requestId)
      .populate("channel", "name isPrivate capacity members createdBy")
      .populate("requester", "username email")
      .populate("creator", "username email");

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const creatorId = request.creator?._id || request.channel?.createdBy;

    if (!creatorId || creatorId.toString() !== userId.toString()) {
      return res.status(403).json({
        error: "Only channel creator can update this request",
      });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ error: `Request already ${request.status}` });
    }

    if (action === "reject") {
      request.status = "rejected";
      await request.save();
      return res.json(request);
    }

    const channel = await Channel.findById(request.channel._id);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const capacity = channel.capacity;
    if (
      typeof capacity === "number" &&
      capacity > 0 &&
      Array.isArray(channel.members) &&
      channel.members.length >= capacity
    ) {
      return res.status(400).json({ error: "Channel is at full capacity" });
    }

    const alreadyMember =
      Array.isArray(channel.members) &&
      channel.members.some(
        (m) => m.toString() === request.requester._id.toString()
      );

    if (!alreadyMember) {
      channel.members = channel.members || [];
      channel.members.push(request.requester._id);
      await channel.save();
    }

    request.status = "approved";
    await request.save();

    return res.json(request);
  } catch (err) {
    console.error("updatePrivateRequestStatus error:", err);
    return res
      .status(500)
      .json({ error: "Server error updating request" });
  }
}

module.exports = {
  createPrivateRequest,
  listPrivateRequestsForUser,
  getPrivateRequestForUser,
  updatePrivateRequestStatus,
};
