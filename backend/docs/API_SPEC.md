# REST API Spec (POC)

Base URL: http://localhost:8080

## AddressRequest
- POST /address-requests — body: { "address": "string" } → 201 with { id, created_at, status: pending }
- GET /address-requests
- GET /address-requests/:id
- PATCH /address-requests/:id — partial { address?, status? }
- DELETE /address-requests/:id

## BonesReportResult
- POST /bones-report-results — body: { address_request_id, report_data, status? } → emits create
- GET /bones-report-results
- GET /bones-report-results/:id
- DELETE /bones-report-results/:id

## MLS
- POST /mls-listing-requests — body: { address }
- GET /mls-listing-requests[/:id]
- PATCH /mls-listing-requests/:id — { status? }
- POST /mls-listing-results — body per schema → emits create
- GET /mls-listing-results[/:id]
- DELETE /mls-listing-results/:id
