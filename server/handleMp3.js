const { Client } = require("@replit/object-storage");
const object_client = new Client();

module.exports = async (req, res) => {
  const mp3_uuid = req.path.substr(3);
  const { ok, value, error } = await object_client.downloadAsBytes(
    `${mp3_uuid}.mp3`,
  );
  if (!ok) {
    console.error(error);
    res.end("Error reading file\n");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  // res.setHeader("Cache-Control", "public, max-age=31536000");
  res.end(Buffer.from(value[0]), "binary");
};
