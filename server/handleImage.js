const { Client } = require("@replit/object-storage");
const object_client = new Client();

module.exports = async (req, res) => {
  const image_uuid = req.path.substr(5);
  const { ok, value, error } = await object_client.downloadAsBytes(
    `${image_uuid}.png`,
  );
  if (!ok) {
    console.error(error);
    res.end("Error reading file\n");
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  const base64_string = Buffer.from(value[0]).toString("utf-8");
  const base64_data = base64_string.replace(/^data:image\/png;base64,/, "");
  res.end(base64_data, "base64");
};
