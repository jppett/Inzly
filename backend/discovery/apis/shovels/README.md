## Shovels API Discovery

I used an example address that was randomly selected on Zillow in Minneapolis: `407 Turner`

*Steps*

1. Lookup Shovels GEO_ID for a particular address
2. Lookup permit information for that GEO_ID

### 1. Lookup Shovels GEO_ID for a particular address

**Endpoint**

```
curl --location 'https://api.shovels.ai/v2/addresses/search?q=407%20Turner' \
--header 'X-API-Key: <api_key>'
```

**Response**

```json
{
    "items": [
        {
            "street_no": "407",
            "street": "TURNERS XRD N",
            "city": "GOLDEN VALLEY",
            "county": null,
            "zip_code": "55422",
            "zip_code_ext": "5061",
            "state": "MN",
            "jurisdiction": null,
            "lat": 44.98216,
            "long": -93.350149,
            "geo_id": "Fwdt2PPS5os",
            "name": "407 Turners Xrd N, Golden Valley, MN"
        }
    ],
    "size": 1,
    "next_cursor": null
}
```

### 2. Lookup permit information for that GEO_ID

**Endpoint**

```
curl --location 'https://api.shovels.ai/v2/permits/search?geo_id=Fwdt2PPS5os&permit_from=2000-01-01&permit_to=2026-01-01' \
--header 'X-API-Key: <api_key>'
```

**Response**

[See permit response example](./permit-response_407-turners-xrd-n.json)