// index.js

"use strict";

const AWS = require("aws-sdk");
const XLSX = require("xlsx");

const s3 = new AWS.S3();
const sm = new AWS.SageMakerRuntime();

const BUCKET_NAME = process.env.BUCKET_NAME;       // e.g. "sfa-quarterly-reports"
const EMBED_ENDPOINT = process.env.EMBED_ENDPOINT;  // e.g. "financial-embed-endpoint" or leave undefined

/**
 * Helper: locate a row in sheetData (array of arrays) where any cell exactly equals `label`,
 * then return the numeric value from the very next column to the right.
 * If no match or parsing fails, returns null.
 */
function findNumericValueInSheet(sheetData, label) {
  for (let r = 0; r < sheetData.length; r++) {
    const row = sheetData[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === "string" && cell.trim() === label) {
        const val = row[c + 1];
        // Strip out any non-numeric chars before parsing
        const num = parseFloat(
          typeof val === "string" ? val.replace(/[^0-9.\-]/g, "") : val
        );
        return isNaN(num) ? null : num;
      }
    }
  }
  return null;
}

exports.handler = async (event, context) => {
  try {
    // 1) Extract bucket & key from the incoming S3 event
    const record = event.Records && event.Records[0] && event.Records[0].s3;
    if (!record) {
      throw new Error("No S3 event record found");
    }
    const bucket = record.bucket.name;   // should be BUCKET_NAME
    const key = decodeURIComponent(record.object.key.replace(/\+/g, " "));
    if (!key.toLowerCase().endsWith(".xlsx")) {
      console.log(`Skipping non-.xlsx key: ${key}`);
      return { statusCode: 200, body: "Not an .xlsx file, skipping." };
    }

    // 2) Extract userSub and base filename from the key
    //    Expecting key format: "<userSub>/<filename>.xlsx"
    const parts = key.split("/");
    if (parts.length < 2) {
      throw new Error(`Unexpected key format (no userSub folder): ${key}`);
    }
    const userSub = parts[0];                      // e.g. "145874f8-6031-7024-9aa5-b660bba88700"
    const fullFilename = parts[parts.length - 1];  // e.g. "test_file.xlsx"
    const baseName = fullFilename.replace(/\.xlsx$/i, ""); // e.g. "test_file"

    // 3) Download the Excel file into a Buffer
    const s3obj = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    if (!s3obj.Body) {
      throw new Error(`Empty S3 object for key: ${key}`);
    }
    const excelBuffer = s3obj.Body;

    // 4) Parse the workbook with XLSX
    const workbook = XLSX.read(excelBuffer, { type: "buffer" });
    const sheets = workbook.SheetNames;

    // Our new sheet names: "balancesheet" and "pnl"
    if (!sheets.includes("balancesheet") || !sheets.includes("pnl")) {
      throw new Error(
        `Workbook must contain "balancesheet" and "pnl" sheets; found: ${sheets.join(
          ", "
        )}`
      );
    }

    // Convert each sheet to a 2D array (header: 1)
    const bsSheet = XLSX.utils.sheet_to_json(workbook.Sheets["balancesheet"], {
      header: 1,
      raw: false,
      defval: null,
    });
    const plSheet = XLSX.utils.sheet_to_json(workbook.Sheets["pnl"], {
      header: 1,
      raw: false,
      defval: null,
    });

    // 5) Extract "Capital Account" from balancesheet
    const capital = findNumericValueInSheet(bsSheet, "Capital Account");

    // 6) Extract "By Gross Profit" from pnl (this row has "By Gross Profit" in column E, amount in F)
    const grossProfit = findNumericValueInSheet(plSheet, "By Gross Profit");

    // 7) Extract "To Net Profit" from pnl (amount in column C)
    const netProfit = findNumericValueInSheet(plSheet, "To Net Profit");

    // 8) Extract "By Gross Income" as revenue, if present
    const revenue = findNumericValueInSheet(plSheet, "By Gross Income");

    // 9) Compute KPIs (guard against null/zero divisions)
    const kpis = {
      return_on_equity:
        capital && netProfit != null && capital !== 0
          ? netProfit / capital
          : null,
      gross_profit_margin:
        grossProfit != null && revenue && revenue !== 0
          ? grossProfit / revenue
          : null,
      net_profit_margin:
        netProfit != null && revenue && revenue !== 0
          ? netProfit / revenue
          : null,
    };

    const parsedValues = {
      capital_account: capital,
      gross_profit: grossProfit,
      net_profit: netProfit,
      revenue: revenue,
    };

    // 10) (Optional) Call SageMaker embedding endpoint if configured
    let vectorEmbedding = null;
    if (EMBED_ENDPOINT) {
      try {
        const payload = {
          user_sub: userSub,
          file: baseName,
          kpis: kpis,
        };
        const invokeParams = {
          EndpointName: EMBED_ENDPOINT,
          Body: JSON.stringify({ inputs: payload }),
          ContentType: "application/json",
        };
        const smResult = await sm.invokeEndpoint(invokeParams).promise();
        const smBody = smResult.Body ? smResult.Body.toString("utf-8") : "{}";
        const smJson = JSON.parse(smBody);
        vectorEmbedding = smJson.embeddings || null;
      } catch (embedErr) {
        console.warn(
          "SageMaker embedding failed or not configured:",
          embedErr.message
        );
        vectorEmbedding = null;
      }
    }

    // 11) Assemble final JSON object
    const outputObj = {
      source_s3_key: key,
      parsed_values: parsedValues,
      kpis: kpis,
      embedding: vectorEmbedding,
      timestamp: new Date().toISOString(),
    };

    // 12) Write JSON to s3://BUCKET_NAME/processed/{userSub}/{baseName}.json
    const processedKey = `processed/${userSub}/${baseName}.json`;
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: processedKey,
        Body: JSON.stringify(outputObj),
        ContentType: "application/json",
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Processed Excel successfully",
        processed_key: processedKey,
      }),
    };
  } catch (err) {
    console.error("Error in Lambda handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error during Excel processing",
        error: err.message,
      }),
    };
  }
};
