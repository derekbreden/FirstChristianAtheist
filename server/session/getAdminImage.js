const ai = require("../ai");
const crypto = require("node:crypto");
const { Client } = require("@replit/object-storage");
const object_client = new Client();

module.exports = async (req, res) => {
  if (
    !req.writeableEnded &&
    req.session.user_id &&
    req.session.admin &&
    req.body.path &&
    req.body.path === "/image"
  ) {
    req.results.path = "/image";
    if (
      req.body.prompt &&
      (req.body.model === "dall-e-2" || req.body.model === "dall-e-3")
    ) {
      const image = await ai.generateImage(req.body.prompt, req.body.model);
      req.results.image = image;
    }
    if (
      req.body.prompt &&
      (req.body.model === "tts-1" || req.body.model === "tts-1-hd")
    ) {
      const mp3 = await ai.generateSpeech(req.body.prompt, req.body.model);
      const mp3_uuid = crypto.randomUUID();
      const { ok, error } = await object_client.uploadFromBytes(
        `${mp3_uuid}.mp3`,
        mp3,
      );
      req.results.mp3 = `/mp3/${mp3_uuid}`;
    }
  }
};
