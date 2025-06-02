import boto3
import csv
import os
from io import StringIO

dynamo = boto3.resource('dynamodb')
s3 = boto3.client('s3')

TABLE_NAME = 'KPI'
S3_BUCKET = 'sfa-quarterly-reports'
S3_KEY = 'forecast/train-data.csv'

def lambda_handler(event, context):
    table = dynamo.Table(TABLE_NAME)
    
    # Fetch all items (adjust if paginated or filtered by user_id)
    response = table.scan()
    items = response['Items']

    # Sort by quarter from pk field: userID#2023-Q4 → get 2023-Q4
    items_sorted = sorted(items, key=lambda x: x['pk'].split('#')[-1])

    # Construct rows
    rows = []
    for i in range(len(items_sorted) - 1):
        current = items_sorted[i]
        future = items_sorted[i + 1]  # next quarter

        row = [
            current.get("grossMargin", 0),
            current.get("netProfitMargin", 0),
            current.get("revenue", 0),
            current.get("cash_balance", 0),
            future.get("cash_balance", 0),
            future.get("revenue", 0)
        ]
        rows.append(row)

    # Write to CSV in memory
    csv_buffer = StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(["grossMargin", "netProfitMargin", "revenue", "cash_balance", "next_cash", "next_revenue"])
    writer.writerows(rows)

    # Upload to S3
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=S3_KEY,
        Body=csv_buffer.getvalue()
    )

    return {
        'statusCode': 200,
        'body': f"Uploaded CSV to s3://{S3_BUCKET}/{S3_KEY}"
    }
