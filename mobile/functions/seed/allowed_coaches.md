# Coach allowlist

Create this Firestore document (or let `pollClassPromotions` seed it on first run):

Collection: `allowed_coaches`  
Document ID: `andy@onlyjonesy.com.au`

```json
{
  "email": "andy@onlyjonesy.com.au"
}
```

Only these emails can sign in and call Functions.
