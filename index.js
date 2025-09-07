import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// Authenticate Google Sheets API using service account
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ----------------------
// 🔹 Helper: Get Sheet ID for a Shopify store
// ----------------------
function getSheetIdForStore(shopDomain) {
  // Shopify sends domains like "client-a.myshopify.com"
  // We need to turn this into the ENV VAR key format
  const key = "SHEET_ID_" + shopDomain.replace(/\./g, "_").toUpperCase();
  return process.env[key];
}

// ----------------------
// 🔹 Shopify Order Webhook
// ----------------------
app.post("/webhook/orders", async (req, res) => {
  const shopDomain = req.get("x-shopify-shop-domain");
  // 🔍 Debug logging
console.log("Store domain received:", shopDomain);
console.log(
  "Looking for env var:",
  `SHEET_ID_${shopDomain.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`
);
  const sheetId = getSheetIdForStore(shopDomain);

  if (!sheetId) {
    console.error(`❌ No sheet mapped for store: ${shopDomain}`);
    return res.status(400).send("No sheet mapped for this store");
  }

  try {
    const order = req.body;

    const values = [
      [
        order.id,
        order.customer?.first_name || "",
        order.customer?.last_name || "",
        order.customer?.email || "",
        order.shipping_address?.phone || "",
        order.total_price,
        order.financial_status,
        new Date().toISOString(),
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Orders!A:G",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });

    console.log(`✅ Order ${order.id} written to sheet for ${shopDomain}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error writing order:", err);
    res.status(500).send("Error");
  }
});

// ----------------------
// 🔹 Default Route
// ----------------------
app.get("/", (req, res) => {
  res.send("✅ Logistics App is running with multi-client mapping");
});

// ----------------------
// 🔹 Start Server
// ----------------------
app.listen(3000, () => {
  console.log("🚀 App running on port 3000");
});

