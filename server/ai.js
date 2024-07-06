const prompts = require("./prompts");
const OpenAI = require("openai");

module.exports = {
  init() {
    this.openai = new OpenAI({
      apiKey: process.env["OPENAI_API_KEY"],
    });
  },
  async ask(messages, prompt = "common") {
    const ai_response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: [
            {
              text: prompts[prompt],
              type: "text",
            },
          ],
        },
        ...messages,
      ],
      temperature: 1,
      max_tokens: 520,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    return (
      ai_response.choices[0].message.content[0].text ||
      ai_response.choices[0].message.content
    );
  },
  async generateImage(prompt){
    const ai_response = await this.openai.images.generate({
      model: "dall-e-3",
      quality: "hd",
      style: "vivid",
      prompt: prompt,
    });
    return ai_response.data[0].url;
  },
};
