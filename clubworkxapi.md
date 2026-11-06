# ClubWorx API v2 Documentation

## Authentication

- **Method**: URL Parameter
- **Parameter**: `account_key`
- **Value**: `YOUR_ACCOUNT_KEY` (set as `CLUBWORX_ACCOUNT_KEY` in the app)
- **Format**: `https://app.clubworx.com/api/v2/endpoint?account_key=YOUR_API_KEY`

## Base URL

```
https://app.clubworx.com/api/v2/
```

## Content Type

- **Request**: `application/x-www-form-urlencoded`
- **Response**: `application/json`

## Available Endpoints

### Bookings

- **List Bookings for a Contact**: `GET /api/v2/bookings`
- **List Bookings for all Contacts**: `GET /api/v2/bookings`
- **List all Bookings for an Event**: `GET /api/v2/bookings`
- **Add Booking for Member**: `POST /api/v2/bookings`
- **Cancel booking**: `DELETE /api/v2/bookings/:id`

### Events

- **List Events**: `GET /api/v2/events`

### Locations

- **List Locations**: `GET /api/v2/locations`

### Member Styles

- **List Styles for a Member**: `GET /api/v2/member_styles`
- **List Styles for all Members**: `GET /api/v2/member_styles`
- **Show Member Style Details**: `GET /api/v2/member_styles/:id`
- **Add Style to Member**: `POST /api/v2/member_styles`
- **Update belt size** (used by this app): `PUT /api/v2/member_styles/:id` with form body `belt_size=...` and `account_key` query param. If ClubWorx returns 404, contact ClubWorx support — the list/show endpoints work but update may not be enabled on all accounts.
- **Gi size dropdown options** (this app): unique `belt_size` values are read from `GET /api/v2/member_styles` (see `/api/clubworx/gi-sizes` in this repo).

### Members

- **List Members**: `GET /api/v2/members`
- **Show Member Details**: `GET /api/v2/members/:contact_key`
- **Add Member**: `POST /api/v2/members`
- **Update Member**: `PUT /api/v2/members/:contact_key`

### Membership Plans

- **List Membership Plans**: `GET /api/v2/membership_plans`

### Memberships

- **List Memberships for a Contact**: `GET /api/v2/memberships`
- **List Memberships for all Contacts**: `GET /api/v2/memberships`
- **Add Membership**: `POST /api/v2/memberships`

### Non-attending Contacts

- **List Non-attending Contacts**: `GET /api/v2/non_attending_contacts`
- **Show Non-attending Contact Details**: `GET /api/v2/non_attending_contacts/:contact_key`
- **Add Non-attending Contact**: `POST /api/v2/non_attending_contacts`
- **Update Non-attending Contact**: `PUT /api/v2/non_attending_contacts/:contact_key`

### Payments

- **List Payments for a Contact**: `GET /api/v2/payments`
- **List Payments for all Contacts**: `GET /api/v2/payments`

### Prospects Statuses

- **List Prospects Statuses**: `GET /api/v2/prospect_statuses`

### Prospects

- **List Prospects**: `GET /api/v2/prospects`
- **Show Prospect Details**: `GET /api/v2/prospects/:contact_key`
- **Add Prospect**: `POST /api/v2/prospects`
- **Update Prospect**: `PUT /api/v2/prospects/:contact_key`

### Styles

- **List all Styles and Ranks**: `GET /api/v2/styles`

### Suspensions

- **List Suspensions for a Contact**: `GET /api/v2/suspensions`
- **List Suspensions for all Contacts**: `GET /api/v2/suspensions`

## Prospects API (Detailed)

### Create Prospect

- **Endpoint**: `/api/v2/prospects`
- **Method**: `POST`
- **Authentication**: account_key parameter
- **Content-Type**: `application/x-www-form-urlencoded`

#### Required Parameters

- `account_key`: Your gym's unique API key
- `first_name`: Contact First name
- `last_name`: Contact Last name
- `email`: Contact Email

#### Optional Parameters

- `phone`: Contact Phone
- `dob`: Contact Date of Birth
- `status`: Contact Status
- `address_line_1`: Contact Address (Line 1)
- `address_line_2`: Contact Address (Line 2)
- `address_city`: Contact Address (City)
- `address_state`: Contact Address (State)
- `address_postcode`: Contact Address (Postal / Zip Code)

#### Available Prospect Statuses

- "Almost Ready"
- "Follow-up Call"
- "Follow-up Email"
- "Initial Contact"
- "Not Ready"
- "Not interested"

#### Example Request (Form Data)

```
account_key=YOUR_ACCOUNT_KEY
first_name=Bravo
last_name=Bravo
email=bravo@bravo.org
phone=0422224693
status=Follow-up Email
```

#### Example Success Response (200)

```json
{
  "first_name": "Bravo",
  "last_name": "Bravo",
  "email": "bravo@bravo.org",
  "phone": "0422224693",
  "status": "Follow-up Email",
  "dob": null,
  "address": "",
  "contact_key": "12f9c424-2140-453f-ad5a-5479e5acf72c",
  "last_attended": null,
  "source": "API",
  "created_on": "2025-02-25",
  "created": 1740527493
}
```

#### Example Error Response (500)

```json
{
  "error": "Error creating new prospect: please provide an email address."
}
```

### Update Prospect

- **Endpoint**: `/api/v2/prospects/:contact_key`
- **Method**: `PUT`
- **Same parameters as Create Prospect**

## Members API (Detailed)

### Create Member

- **Endpoint**: `/api/v2/members`
- **Method**: `POST`

#### Required Parameters

- `account_key`: Your gym's unique API key
- `first_name`: Contact First name
- `last_name`: Contact Last name
- `email`: Contact Email

#### Optional Parameters

- `phone`: Contact Phone
- `dob`: Contact Date of Birth
- `member_number`: Unique Member Number
- `address_line_1`: Contact Address (Line 1)
- `address_line_2`: Contact Address (Line 2)
- `address_city`: Contact Address (City)
- `address_state`: Contact Address (State)
- `address_postcode`: Contact Address (Postal / Zip Code)
- `membership_plan_id`: Membership Plan ID

## Bookings API (Detailed)

### List Bookings

- **Endpoint**: `/api/v2/bookings`
- **Method**: `GET`

#### Parameters

- `account_key`: Required - Your gym's unique API key
- `contact_key`: Optional - The contact's unique key (leave blank for all contacts)
- `state`: Optional - Booking status ('attended', 'absent', 'not_attended')
- `event_id`: Optional - Event ID
- `location_id`: Optional - Location ID
- `event_starts_after`: Optional - Filter bookings by event date
- `event_ends_before`: Optional - Filter bookings by event date
- `page`: Optional - For pagination (defaults to 1)
- `page_size`: Optional - For pagination (defaults to 50)

### Add Booking

- **Endpoint**: `/api/v2/bookings`
- **Method**: `POST`

#### Required Parameters

- `account_key`: Your Gym's unique API key
- `contact_key`: The contact's unique key
- `event_id`: The ID of the Event

### Cancel Booking

- **Endpoint**: `/api/v2/bookings/:id`
- **Method**: `DELETE`

#### Required Parameters

- `account_key`: Your gym's unique API key
- `contact_key`: The contact's unique key
- `id`: The ID of the Booking (in URL path)

## Key Differences from v1

1. **Base URL**: Changed from `/api/` to `/api/v2/`
2. **Authentication**: Uses `account_key` URL parameter instead of `Authorization: Bearer` header
3. **Content-Type**: Uses `application/x-www-form-urlencoded` instead of `application/json`
4. **Request Body**: Form-encoded data instead of JSON payload

## Implementation Notes

- Always include the `account_key` as a URL parameter
- Encode form data properly using `encodeURIComponent()`
- Set Content-Type header to `application/x-www-form-urlencoded`
- Response will be JSON format even though request is form-encoded

## Rate Limiting

ClubWorx API has rate limits to prevent excessive requests. When syncing large datasets:

### Environment Variables for Rate Limit Control

- `CLUBWORX_INCREMENTAL_SYNC`: Enable/disable incremental sync (default: enabled, set to `"0"` to disable)
  - When enabled, only syncs records that changed since the last sync
  - Dramatically reduces API calls for regular syncs
  
- `CLUBWORX_PAGE_DELAY_MS`: Delay between page requests in milliseconds (default: `500`)
  - Increase this value if you're hitting rate limits
  - Recommended: `1000` or higher for large syncs
  
- `CLUBWORX_PAGE_SIZE`: Number of records per page (default: `50`)
  - Lower values = more requests but smaller responses
  - Higher values = fewer requests but may hit other limits
  
- `CLUBWORX_MAX_RETRIES`: Maximum retry attempts for failed requests (default: `4`)
  - Rate limit errors (429) automatically get up to 8 retries with exponential backoff
  
- `CLUBWORX_UPDATED_AFTER_PARAM`: Query parameter name for incremental sync (default: `"updated_after"`)
  - Some ClubWorx instances may use different parameter names

### Handling 429 Errors

When you receive a 429 "Too Many Requests" error:

1. **Wait before retrying**: The sync will automatically retry with exponential backoff
2. **Enable incremental sync**: Ensures only changed records are fetched
3. **Increase page delay**: Set `CLUBWORX_PAGE_DELAY_MS=1000` or higher
4. **Don't force full sync**: The system will not fall back to full sync on rate limits to avoid making the problem worse

### Best Practices

- Run syncs during off-peak hours
- Use incremental sync for regular updates (default behavior)
- Only disable incremental sync for initial setup or troubleshooting
- Monitor sync frequency to avoid excessive API calls

## Common Errors

- **404 Not Found**: Usually indicates wrong endpoint or missing `/v2/` in path
- **401 Unauthorized**: Invalid or missing account_key
- **400 Bad Request**: Invalid form data or missing required fields
- **422 Unprocessable Entity**: Validation errors (e.g., missing event_id for bookings)
- **500 Internal Server Error**: Server-side errors (e.g., missing required fields like email)

## Test Data

For testing purposes, use:

```
Name: Bravo Bravo
Email: bravo@bravo.org
Phone: 0422224693
```

## JavaScript Implementation Example

```javascript
const url =
  "https://app.clubworx.com/api/v2/prospects?account_key=YOUR_ACCOUNT_KEY";
const data =
  "first_name=Bravo&last_name=Bravo&email=bravo@bravo.org&phone=0422224693&status=Follow-up Email";

fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  },
  body: data,
});
```
