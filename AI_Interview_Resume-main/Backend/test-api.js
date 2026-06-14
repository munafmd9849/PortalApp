require("dotenv").config();
const { Mistral } = require("@mistralai/mistralai");

const apiKey = process.env.MISTRAL_API_KEY;
console.log("API Key found in env (length):", apiKey ? apiKey.length : "undefined");
console.log("API Key start:", apiKey ? apiKey.substring(0, 4) : "N/A");

const client = new Mistral({ apiKey });

const model = process.env.MISTRAL_MODEL || "mistral-large-latest";
console.log("Testing model:", model);

async function test() {
  try {
    const response = await client.chat.complete({
      model: model,
      messages: [{ role: "user", content: "Say hello" }],
    });
    console.log("Chat Success! Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("API Test Failed:");
    console.error("Status:", error.status);
    console.error("Data:", JSON.stringify(error.data));
    console.error("Message:", error.message);
  }
}

test();
