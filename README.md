# Swimmeret - Stability Help (PoC)

## Run

```bash
node server.js
```

Open:
- http://localhost:3000/ (main flow)
- http://localhost:3000/p/heavy-agent-builders-stable-lane (public pool page)
- http://localhost:3000/lab/pools/pool_1 (lab view)

## Webforms REST API (SQLite)

No auth required. Backed by `data/forms.db` using Node's experimental `node:sqlite`.

Create a form:

```bash
curl -X POST http://localhost:3000/api/forms \\
  -H \"Content-Type: application/json\" \\
  -d '{\"name\":\"Onboarding\",\"description\":\"Basic intake\",\"fields\":[{\"label\":\"Email\",\"type\":\"email\"}]}'\n```

List forms:

```bash
curl http://localhost:3000/api/forms
```

Get a form:

```bash
curl http://localhost:3000/api/forms/1
```

Update a form:

```bash
curl -X PUT http://localhost:3000/api/forms/1 \\
  -H \"Content-Type: application/json\" \\
  -d '{\"name\":\"Onboarding v2\",\"fields\":[{\"label\":\"Name\",\"type\":\"text\"}]}'\n```

Delete a form:

```bash
curl -X DELETE http://localhost:3000/api/forms/1
```

## Notes
- Swimmeret flow data is stored in `data/db.json` and seeded on first run.
- Webforms are stored in `data/forms.db`.
- No external dependencies.
