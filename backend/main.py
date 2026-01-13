from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import service_account
from googleapiclient.discovery import build
import openpyxl
import io
import os, json
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


creds_info = json.loads(
    os.environ["SEARCH_APPLICATION"]
)

creds = service_account.Credentials.from_service_account_info(
    creds_info,
    scopes=[
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly"
    ]
)


drive = build("drive", "v3", credentials=creds)
sheets = build("sheets", "v4", credentials=creds)
# 1️⃣ List subfolders
@app.get("/folders/{parent_id}")
def list_subfolders(parent_id: str):
    result = drive.files().list(
        q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder'",
        fields="files(id,name)"
    ).execute()

    return result.get("files", [])

# 2️⃣ List Excel files
@app.get("/files/{folder_id}")
def list_files(folder_id: str):
    result = drive.files().list(
        q=(
            f"'{folder_id}' in parents and "
            f"(mimeType='application/vnd.google-apps.spreadsheet' or "
            f"mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')"
        ),
        fields="files(id,name,mimeType)"
    ).execute()

    return result.get("files", [])


# 3️⃣ Read Excel data
# @app.get("/read-excel/{sheet_id}")
# def read_google_sheet(sheet_id: str):
#     try:
#         result = sheets.spreadsheets().values().get(
#             spreadsheetId=sheet_id,
#             range="A1:Z10000"  # adjust if needed
#         ).execute()

#         values = result.get("values", [])
#         if not values:
#             return []

#         header_index = None
#         for i, row in enumerate(values):
#             if any(cell.strip() for cell in row if isinstance(cell, str)):
#                 header_index = i
#                 break

#         if header_index is None:
#             return []

#         headers = values[header_index]
#         data = []

#         for row in values[header_index + 1:]:
#             if not any(row):
#                 continue

#             record = {}
#             for i, h in enumerate(headers):
#                 record[h] = row[i] if i < len(row) else ""

#             data.append(record)

#         return data

#     except Exception as e:
#         return {"error": str(e)}
@app.get("/read-excel/{sheet_id}")
def read_google_sheet(sheet_id: str):
    try:
        result = sheets.spreadsheets().values().batchGet(
            spreadsheetId=sheet_id,
            ranges=["A1:ZZ5000"],  # limit rows for safety
            valueRenderOption="UNFORMATTED_VALUE"
        ).execute()

        value_ranges = result.get("valueRanges", [])
        if not value_ranges:
            return []

        values = value_ranges[0].get("values", [])
        if not values:
            return []

        header_index = None
        for i, row in enumerate(values):
            if any(cell not in ("", None) for cell in row):
                header_index = i
                break

        if header_index is None:
            return []

        headers = [
            str(h).strip() if h not in (None, "") else f"Column_{i}"
            for i, h in enumerate(values[header_index])
        ]

        data = []

        for row in values[header_index + 1:]:
            if not any(row):
                continue

            record = {}
            for i, header in enumerate(headers):
                record[header] = row[i] if i < len(row) else ""

            data.append(record)

        return data

    except Exception as e:
        print("Read sheet error:", e)
        return []


@app.get("/columns/{sheet_id}")
def get_columns(sheet_id: str):
    try:
        result = sheets.spreadsheets().values().batchGet(
            spreadsheetId=sheet_id,
            ranges=["A1:ZZ10"],  # wide but shallow
            valueRenderOption="UNFORMATTED_VALUE"
        ).execute()

        value_ranges = result.get("valueRanges", [])
        if not value_ranges:
            return []

        values = value_ranges[0].get("values", [])

        for row in values:
            if any(cell not in ("", None) for cell in row):
                return [str(cell).strip() for cell in row]

        return []

    except Exception as e:
        print("Columns error:", e)
        return []

# 4️⃣ Get column headers
# @app.get("/columns/{sheet_id}")
# def get_columns(sheet_id: str):
#     try:
#         result = sheets.spreadsheets().values().get(
#             spreadsheetId=sheet_id,
#             range="A1:Z10"   # small range → very fast
#         ).execute()

#         values = result.get("values", [])

#         for row in values:
#             if any(cell.strip() for cell in row if isinstance(cell, str)):
#                 return row

#         return []

#     except Exception as e:
#         return {"error": str(e)}
