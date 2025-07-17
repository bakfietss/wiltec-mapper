# Wiltec Mapper Backend Service

This is the backend service for Wiltec Mapper that handles Firebird database connections and provides a REST API for the frontend application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file in the backend directory with the following content:
```env
PORT=3000
FIREBIRD_HOST=10.10.57.41
FIREBIRD_PORT=27017
FIREBIRD_DATABASE=new_rotra_int
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=SYSDBA
FIREBIRD_CHARSET=UTF8
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Query Endpoint
`POST /api/query`

Handles all database operations through a single endpoint. The operation type is specified in the request body.

Request body format:
```json
{
  "table": "string",
  "operation": "select" | "insert" | "update" | "delete",
  "columns": "string" | "*",
  "data": "object",
  "where": "object",
  "orderBy": {
    "column": "string",
    "ascending": "boolean"
  },
  "limit": "number"
}
```

### Health Check
`GET /health`

Returns the service status.

Response:
```json
{
  "status": "ok"
}
```