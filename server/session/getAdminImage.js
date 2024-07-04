const ai = require("../ai");

module.exports = async (req, res) => {
  if (
    !req.writeableEnded &&
    req.session.user_id &&
    req.session.admin &&
    req.body.path &&
    req.body.path === "/image"
  ) {
    req.results.path = "/image";
    if (req.body.prompt) {
      const image = await ai.generateImage(req.body.prompt);
      req.results.image = image;
    }
  }
};
