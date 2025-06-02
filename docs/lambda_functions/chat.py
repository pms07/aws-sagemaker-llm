import os
import json
import boto3
from decimal import Decimal

region = "us-east-1"
table_name = os.environ["KPI_TABLE"]
forecast_fn = os.environ["FORECAST_FN_NAME"]
llm_endpoint = os.environ["LLM_ENDPOINT_NAME"]

# DynamoDB client & table handle
dynamo = boto3.resource("dynamodb", region_name=region)
table = dynamo.Table(table_name)

# SageMaker runtime client
sm = boto3.client("sagemaker-runtime", region_name=region)

# Lambda client to invoke the “forecast” function
lambda_client = boto3.client("lambda", region_name=region)

# Allow CORS from any origin (adjust if you only want certain domains)
CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
}

def lambda_handler(event, context):
    # 1) Parse the incoming HTTP body (API Gateway -> Lambda)
    try:
        raw_body = event.get("body", "{}")
        body     = json.loads(raw_body)
        user_id  = body.get("user_id")
        question = body.get("question")
    except Exception as e:
        return {
            "statusCode": 400,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"Invalid JSON body: {str(e)}"})
        }

    if not user_id or not question:
        return {
            "statusCode": 400,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": "Missing user_id or question"})
        }

    # 2) Fetch *all* KPI rows whose partition key begins with “user_id#”
    #    (because the actual pk is stored as "<user_id>#<period>")
    try:
        from boto3.dynamodb.conditions import Attr

        scan_resp = table.scan(
            FilterExpression=
                Attr("pk").begins_with(f"{user_id}#")
                & Attr("sk").eq("KPI")
        )
        raw_kpis = scan_resp.get("Items", [])
        latest   = raw_kpis[-1] if raw_kpis else {}
    except Exception as e:
        return {
            "statusCode": 500,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"DynamoDB scan failed: {str(e)}"})
        }

    # 3) Call the “forecast” Lambda (if you have one)
    try:
        forecast_resp  = lambda_client.invoke(
            FunctionName = forecast_fn,
            Payload      = json.dumps({"user_id": user_id})
        )
        raw_forecast   = forecast_resp["Payload"].read().decode()
        forecast_body  = json.loads(raw_forecast)
        forecast       = json.loads(forecast_body.get("body", "{}"))
    except Exception as e:
        print("⚠️ Forecast Lambda error:", e)
        forecast = {}

    # ─────────────────────────────────────────────────────────────────────────
    # *** DEBUGGING STEP: if the user literally asks “show me my raw data”,
    #     just return the raw rows we pulled from DynamoDB.
    # ─────────────────────────────────────────────────────────────────────────
    if question.strip().lower() == "show me my raw data":
        debug_payload = {
            "rawKPIs":     raw_kpis,
            "rawForecast": forecast
        }
        return {
            "statusCode": 200,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"debug": debug_payload}, default=Decimal)
        }

    # 4) Build LLM prompt as before
    prompt = f"""
User Question: {question}

Latest KPIs:
  revenue           = {latest.get("revenue",             "N/A")}
  net_profit_margin = {latest.get("netProfitMargin",     "N/A")}
  gross_margin      = {latest.get("grossMargin",          "N/A")}
  cash_balance      = {latest.get("cash_balance",         "N/A")}

Forecast (next quarter):
  revenue           = {forecast.get("predicted_revenue",      "N/A")}
  cash_balance      = {forecast.get("predicted_cash_balance", "N/A")}

Explain in simple English:
"""
    print("📢 LLM Prompt:\n", prompt)

    # 5) Call SageMaker LLM endpoint (same as before—return_full_text=False)
    try:
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens":   200,
                "return_full_text": False,
                "temperature":      0.7
            }
        }
        llm_resp   = sm.invoke_endpoint(
            EndpointName = llm_endpoint,
            ContentType  = "application/json",
            Body         = json.dumps(payload)
        )
        raw_output = llm_resp["Body"].read().decode()
        result     = json.loads(raw_output)
        print("📢 LLM Result:", result)
    except Exception as e:
        return {
            "statusCode": 500,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"LLM invocation failed: {str(e)}"})
        }

    # 6) Extract “generated_text”
    answer_text = ""
    if isinstance(result, list) and result and "generated_text" in result[0]:
        answer_text = result[0]["generated_text"].strip()
    elif isinstance(result, dict) and "generated_text" in result:
        answer_text = result["generated_text"].strip()
    else:
        answer_text = json.dumps(result)

    print("✅ answer_text:", answer_text)

    # 7) Return the final answer (CORS headers)
    return {
        "statusCode": 200,
        "headers":  CORS_HEADERS,
        "body":     json.dumps({"answer": answer_text}, default=Decimal)
    }
