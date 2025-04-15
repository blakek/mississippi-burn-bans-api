# mississippi-burn-bans-api

> 🔥 A lightweight API to fetch and serve burn ban data for Mississippi counties.

## Overview

This API provides endpoints to retrieve burn ban data for Mississippi counties. The data is fetched from the Mississippi Forestry Commission's website and cached for efficient access.

### Endpoints

#### `GET /api/burn-bans`

- Returns a list of all burn bans.
- Example response:
  ```json
  [
    {
      "counties": "Hinds",
      "issued": "2025-04-01T00:00:00.000Z",
      "expires": "2025-04-15T00:00:00.000Z",
      "exemptions": "Agricultural burns"
    }
  ]
  ```

#### `GET /api/burn-bans/:county`

- Returns burn ban data for a specific county.
- Example response:
  ```json
  {
    "counties": "Hinds",
    "issued": "2025-04-01T00:00:00.000Z",
    "expires": "2025-04-15T00:00:00.000Z",
    "exemptions": "Agricultural burns"
  }
  ```

## Contributing

### Prerequisites

- [Bun.sh](https://bun.sh/) >=v1.2

### Setup

1. Clone the repository:

```bash
git clone https://github.com/blakek/mississippi-burn-bans-api
cd mississippi-burn-bans-api
```

2. Install dependencies:

```bash
bun install
```

### Running the Project

To start the API server:

```bash
# for production
bun start

# or with hot reloading for development
bun dev
```

The server will start and display the URL where it is running (e.g., `http://localhost:3000`).

### Useful Commands

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `bun install`   | Install project dependencies.        |
| `bun start`     | Start the API server.                |
| `bun dev`       | Start the server with hot reloading. |
| `bun test`      | Run tests.                           |
| `bun typecheck` | Check TypeScript types.              |
