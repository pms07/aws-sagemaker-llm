import os
import json
import boto3
from decimal import Decimal

# ─────────────────────────────────────────────────────────────────────────────
#  Environment variables (configured in Lambda → Configuration → Environment vars)
# ─────────────────────────────────────────────────────────────────────────────
region       = "us-east-1"
table_name   = os.environ["KPI_TABLE"]         # e.g. "KPI"
forecast_fn  = os.environ["FORECAST_FN_NAME"]  # e.g. "export-kpi-to-s3"
llm_endpoint = os.environ["LLM_ENDPOINT_NAME"] # e.g. "chat-llama-endpoint"

# ─────────────────────────────────────────────────────────────────────────────
#  Boto3 clients/resources
# ─────────────────────────────────────────────────────────────────────────────
dynamo         = boto3.resource("dynamodb", region_name=region)
table          = dynamo.Table(table_name)            # DynamoDB table handle
sm             = boto3.client("sagemaker-runtime", region_name=region)  # SageMaker runtime
lambda_client  = boto3.client("lambda", region_name=region)             # Invoke other Lambdas

# ─────────────────────────────────────────────────────────────────────────────
#  CORS headers – returned on every response
# ─────────────────────────────────────────────────────────────────────────────
CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}


def lambda_handler(event, context):
    """
    1) Parse the incoming HTTP body (API Gateway -> Lambda)
    2) Query DynamoDB for latest KPI row (pk=user_id, sk="KPI")
    3) Invoke the “forecast” Lambda (if configured)
    4) Build a concise prompt for the LLM
    5) Invoke the SageMaker LLM endpoint
    6) Extract “generated_text” from the response
    7) Return a JSON with {"answer": "..."} plus CORS headers
    """

    # ─────────────────────────────────────────────────────────────────────────
    # 1) Parse the incoming HTTP body as JSON
    # ─────────────────────────────────────────────────────────────────────────
    try:
        raw_body = event.get("body", "{}")
        print("📥 Raw event body:", raw_body)
        body = json.loads(raw_body)
        user_id  = body.get("user_id")
        question = body.get("question")
        print(f"📝 Parsed user_id: {user_id}, question: {question}")
    except Exception as e:
        # Return HTTP 400 if JSON is invalid
        return {
            "statusCode": 400,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"Invalid JSON body: {str(e)}"})
        }

    if not user_id or not question:
        # Missing one of the required fields
        return {
            "statusCode": 400,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": "Missing user_id or question"})
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 2) Fetch the latest KPI row from DynamoDB (if any)
    #    Partition Key = user_id, Sort Key = "KPI"
    # ─────────────────────────────────────────────────────────────────────────
    try:
        dynamo_resp = table.query(
            KeyConditionExpression    = "pk = :pkval AND sk = :skval",
            ExpressionAttributeValues = {
                ":pkval": user_id,
                ":skval": "KPI"
            }
        )
        items  = dynamo_resp.get("Items", [])
        latest = items[-1] if items else {}
        print("📊 Retrieved latest KPI item:", latest)
    except Exception as e:
        # Return HTTP 500 if DynamoDB query fails
        return {
            "statusCode": 500,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"DynamoDB query failed: {str(e)}"})
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 3) Invoke the “forecast” Lambda (if configured)
    #    If it fails, fall back to empty forecast = {}
    # ─────────────────────────────────────────────────────────────────────────
    try:
        forecast_resp = lambda_client.invoke(
            FunctionName = forecast_fn,
            Payload      = json.dumps({"user_id": user_id})
        )
        raw_forecast = forecast_resp["Payload"].read().decode()
        print("📥 Raw forecast response:", raw_forecast)
        forecast_body = json.loads(raw_forecast)
        forecast      = json.loads(forecast_body.get("body", "{}"))
        print("🌦️ Parsed forecast:", forecast)
    except Exception as e:
        print("⚠️ Forecast Lambda error:", e)
        forecast = {}

    # ─────────────────────────────────────────────────────────────────────────
    # 4) Build a concise prompt for the LLM.
    #    We supply only the numeric values, not the entire textual instruction.
    # ─────────────────────────────────────────────────────────────────────────
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

    # ─────────────────────────────────────────────────────────────────────────
    # 5) Call the SageMaker LLM endpoint
    #    Configure parameters so the model returns the continuation only
    # ─────────────────────────────────────────────────────────────────────────
    try:
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens":   200,   # Increase if you need more output
                "return_full_text": False, # Only return newly generated portion
                "temperature":      0.7    # Slightly creative output
            }
        }
        llm_resp = sm.invoke_endpoint(
            EndpointName = llm_endpoint,
            ContentType  = "application/json",
            Body         = json.dumps(payload)
        )
        raw_output = llm_resp["Body"].read().decode()
        result     = json.loads(raw_output)
        print("📢 LLM Result:", result)
    except Exception as e:
        # Return HTTP 500 if the LLM invocation fails
        return {
            "statusCode": 500,
            "headers":  CORS_HEADERS,
            "body":     json.dumps({"error": f"LLM invocation failed: {str(e)}"})
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 6) Extract “generated_text” from the result
    #    Typical shapes:
    #      • [ { "generated_text": "..." } ]
    #      • { "generated_text": "..." }
    # ─────────────────────────────────────────────────────────────────────────
    answer_text = ""
    if isinstance(result, list) and result and "generated_text" in result[0]:
        answer_text = result[0]["generated_text"].strip()
    elif isinstance(result, dict) and "generated_text" in result:
        answer_text = result["generated_text"].strip()
    else:
        # Fallback: serialize the entire JSON
        answer_text = json.dumps(result)

    print("✅ Final answer_text:", answer_text)

    # ─────────────────────────────────────────────────────────────────────────
    # 7) Return HTTP 200 with a JSON body { "answer": "<text>" } plus CORS headers
    # ─────────────────────────────────────────────────────────────────────────
    return {
        "statusCode": 200,
        "headers":  CORS_HEADERS,
        "body":     json.dumps({"answer": answer_text}, default=Decimal)
    }
