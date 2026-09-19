# Google Apps Script Setup Instructions

This directory contains the code for the Google Apps Script that serves as a REST API between our Next.js application and the Google Sheet.

## 1. Google Sheet Setup
1. Create a new Google Sheet (or open your existing one).
2. Create three tabs (sheets) with exact names:
   - `Objects`
   - `Settings`
   - `SyncLog`
3. In `Objects`, set up your headers in row 1.
   - Columns A-V (Source data): `source_id`, `object_name`, `region_soato`, `district_soato`, `address`, `latitude`, `longitude`, `status`, `status_id`, `sphere_id`, `customer`, `designer`, `builder`, `difficulty`, `floors`, `apartment_count`, `block_count`, `deadline`, `created_at`, `task_id`, `passport_url`, `source_url`
   - Columns W-AH (Internal data): `tjm_name`, `phone`, `sales_office`, `manager_name`, `manager_phone`, `telegram`, `instagram`, `notes`, `priority`, `last_visit`, `visited_by`, `visit_lat_lng`
4. In `Settings`, set headers: `field_name`, `field_type`, `required`, `visible`, `column_letter`

## 2. Deploy Script
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Rename the project to "B2B Samarqand API" (or similar).
3. Copy all the contents of `Code.gs` from this directory and paste them into the Google Apps Script editor (replace any existing code).
4. Save the file (Ctrl+S).
5. Click **Deploy > New deployment** in the top right.
6. Click the gear icon next to "Select type" and choose **Web app**.
7. Set the configuration:
   - **Description**: Initial deploy
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
8. Click **Deploy**.
9. You will be prompted to authorize access. Follow the prompts, click "Advanced", and proceed to your script.
10. Copy the **Web app URL**. This is your API URL.

## 3. Testing the Endpoints
You can easily test GET endpoints in your browser using the URL you copied:

* `[WEB_APP_URL]?action=getMarkers`
* `[WEB_APP_URL]?action=getObject&id=YOUR_SOURCE_ID`
* `[WEB_APP_URL]?action=getStats`

## 4. Updates
If you change the code in Apps Script, you MUST create a new deployment (or manage deployments and edit the active one to point to the new version). Saving the code does not automatically update the published Web App URL.
