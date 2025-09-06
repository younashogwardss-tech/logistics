const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

// === Google Sheets Setup ===
const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const client = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/spreadsheets"]
);
const sheets = google.sheets({ version: "v4", auth: client });

// Temporary merchant → sheet mapping (edit this for each merchant)
const merchantSheets = {
  "yourstore.myshopify.com": "YOUR_SHEET_ID_HERE"
};

// === Shopify Webhook: Orders Create ===
app.post("/webhook/orders", async (req, res) => {
  try {
    const shop = req.headers["x-shopify-shop-domain"];
    const order = req.body;

    const sheetId = merchantSheets[shop];
    if (!sheetId) {
      console.log("No sheet mapped for", shop);
      return res.status(200).send("No sheet mapped");
    }

    const values = [
      [
        order.id,
        order.customer?.first_name + " " + order.customer?.last_name,
        order.shipping_address?.address1,
        order.shipping_address?.phone,
        order.total_price,
        order.financial_status,
        new Date().toISOString()
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Orders!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    console.log("Order written to sheet:", order.id);
    res.status(200).send("OK");
  } catch (err) {
    console.error("Error writing order:", err);
    res.status(500).send("Error");
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("OK Logistics App is running ✅");
});

app.listen(3000, () => console.log("App running on port 3000"));
