# Manual Tests

1) Create AddressRequest → expect 201 pending
2) Orchestrator sets status=processing and creates MLSListingRequest
3) Rentcast worker creates BonesReportResult
4) Post MLSListingResult manually
5) Orchestrator marks AddressRequest processed
