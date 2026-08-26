# HTTP Examples

## AddressRequest
Create
```bash
curl -s POST http://localhost:8080/address-requests  -H "Content-Type: application/json"  -d '{ "address":"123 main st, springfield il" }' | jq
```
Get
```bash
curl -s http://localhost:8080/address-requests/<id> | jq
```
Patch
```bash
curl -s -X PATCH http://localhost:8080/address-requests/<id>  -H "Content-Type: application/json"  -d '{ "status":"processing" }' | jq
```

## BonesReportResult
Create
```bash
curl -s POST http://localhost:8080/bones-report-results  -H "Content-Type: application/json"  -d '{
  "address_request_id":"<id>",
  "report_data": { "rentcast": { "raw": {"example":true} } },
  "status":"completed"
 }' | jq
```

## MLS Listing (man in the middle)
Result create
```bash
curl -s POST http://localhost:8080/mls-listing-results  -H "Content-Type: application/json"  -d '{
  "mls_listing_request_id":"<requestId>",
  "listing_data": { "address":"123 Main St, Springfield, IL", "price":250000, "bedrooms":3, "photo_urls":[] },
  "status":"completed"
 }' | jq
```
