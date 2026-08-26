# Systems

- API
- Orchestrator
- RentCast fetcher

## REST API

### Endpoints (noun-based)

**AddressRequest**

CRUD `AddressRequest` -- (not like API request, but a particular data model)

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000", // omit on create, assigned by server
    "address": "123 Main St, Springfield, IL",
    "created_at": "2024-06-01T12:00:00Z", // omit on create, assigned by server
    "status": "pending" // possible values: pending, processing, processed, failed; omit on create, assigned to 'pending'
}
```

**BonesReportResult**

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000", // omit on create, assigned by server
    "address_request_id": "123e4567-e89b-12d3-a456-426614174000",
    "report_data": {
        // TBD
    },
    "created_at": "2024-06-01T12:05:00Z", // omit on create, assigned by server
    "status": "completed" // possible values: completed, failed; omit on create, assigned to 'completed'
}
CRUD `BonesReportResult`

```json
{
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "address_request_id": "123e4567-e89b-12d3-a456-426614174000",
    "report_data": {
        // TBD
    },
    "created_at": "2024-06-01T12:05:00Z",
    "status": "completed" // possible values: completed, failed
}
```

### API Behavior

**Requirements**

- API endpoints should have handlers for each CRUD operation
- Dependencies
-- Redpanda for event streaming
-- Redis for data storage
- Services for data persistence as I intend to replace Redis with a more permanent storage solution in the future
- Event topics should follow the pattern `<noun>.<operation>` e.g., `AddressRequest.create`, `BonesReportResult.update`

## Orchestrator

- The Orchestrator service should listen to events from Redpanda and coordinate the processing of `AddressRequest` and `BonesReportResult` entities.    
- When an `AddressRequest` is created, it is assigned a status of `pending`
- On new AddressRequest, the Orchestrator should trigger the RentCast fetcher event consumer and enable man-in-the-middle MLS listing (create MLSListingRequest via API)
- On completion of the RentCast fetcher and creation of a `BonesReportResult`, the Orchestrator should update the status of the associated `AddressRequest` to `processed`
- Dependencies
-- Redpanda for event streaming
-- Redis for data storage
- Services for data persistence as I intend to replace Redis with a more permanent storage solution in the future
- Event topics should follow the pattern `<noun>.<operation>` e.g., `AddressRequest.create`, `BonesReportResult.update`

## RentCast Fetcher

- The RentCast fetcher service should process `AddressRequest` entities with a status of `pending`
- It should fetch data from the RentCast API and create a corresponding `BonesReportResult` entity with the fetched data
- Upon successful creation of a `BonesReportResult`, the status of the associated `AddressRequest` should be updated to `processed`
- If the fetch fails, the status of the `AddressRequest` should be updated to `failed`
- Dependencies
-- Redpanda for event streaming
-- Redis for data storage
- Services for data persistence as I intend to replace Redis with a more permanent storage solution in the future
- Event topics should follow the pattern `<noun>.<operation>` e.g., `AddressRequest.create`, `BonesReportResult.update`

## MLS Listing Fetcher (man-in-the-middle)

- Additional API endpoints (in my existing API) supporting manual man-in-the-middlde submission of MLS listing data for testing purposes
- API endpoints (CRUD) for `MLSListingRequest` and `MLSListingResult` entities
- The MLS Listing fetcher service should process `MLSListingRequest` entities with a status of `pending`
- MLSListResult submission should update the status of the associated `MLSListingRequest` to `processed` or `failed` based on the outcome
- MLSListResultDataModel:

```
{
    "id": "123e4567-e89b-12d3-a456-426614174000",   // omit on create, assigned by server
    "mls_listing_request_id": "123e4567-e89b-12d3-a456-426614174000",
    "listing_data": {
        "address": "123 Main St, Springfield, IL",
        "price": 250000,
        "bedrooms": 3,
        "photo_urls": [
            "http://example.com/photo1.jpg",
            "http://example.com/photo2.jpg"
        ]
    },
    "created_at": "2024-06-01T12:10:00Z", // omit on create, assigned by server
    "status": "completed" // possible values: completed, failed; omit on create, assigned to 'completed'
}
```

- dependencies
-- Redpanda for event streaming
-- Redis for data storage
- Services for data persistence as I intend to replace Redis with a more permanent storage solution in the future
- Event topics should follow the pattern `<noun>.<operation>` e.g., `MLSListingRequest.create`, `MLSListingResult.update`

# Extra notes

- There should be a shared library for common data models and utilities used across services
-- Data models for `AddressRequest`, `BonesReportResult`, `MLSListingRequest`, and `MLSListingResult`, etc.
-- Function for standardizing address input to as close to a US Standard as possible (when assigning address to AddressRequest)
- TypeScript meant to be run natively (no transpilation step)
- Separate Dockerfiles for each service
- Each service should have its own entry point script
- Use environment variables for configuration (e.g., Redpanda connection details, Redis connection details)
- Use async/await for handling asynchronous operations
- Docker for containerization of services
- Docker Compose for local development and testing environment setup

# Shortcuts taken

- Using Redis for data storage for now instead of a more permanent solution like PostgreSQL or MongoDB
- Multiple services using the same Redis instance for simplicity
- No authentication or authorization implemented yet
- Skip tests
- Skip extensive error handling and logging for brevity
- Simplified event processing logic without retries or dead-letter queues

# Security

For now, security should allow anonymous requests but I do plan at some point to add token based authentication with permission scopes for read/write on each noun of my REST API.

