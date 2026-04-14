# PostgreSQL Setup Guide

## Overview
NepalTrex uses PostgreSQL as its primary database, running in a Docker container for easy local development and deployment.

---

## 🐘 PostgreSQL Docker Setup

### Prerequisites
- Docker Desktop (or Docker Engine + Docker Compose)
- Port 5432 available (or update `docker-compose.yml` to use a different port)

### Starting PostgreSQL

```bash
# Start PostgreSQL in background
docker compose up -d

# Verify it's running
docker ps | grep nepaltrex-postgres

# Check logs
docker logs nepaltrex-postgres
```

### Stopping PostgreSQL

```bash
# Stop the container
docker compose down

# Remove container (keeps data in volume)
docker compose down -v
```

### Access PostgreSQL CLI

```bash
# Connect to database directly
docker exec -it nepaltrex-postgres psql -U nepaltrex -d nepaltrex

# Common psql commands:
# \dt                    - List all tables
# \d users               - Describe users table
# SELECT * FROM users;   - Query users
# \q                     - Quit
```

---

## 📊 Database Schema

### Tables
- **users**: Stores user accounts
  - `id UUID` - Primary key
  - `username TEXT` - Unique username
  - `email TEXT` - Unique email
  - `password_hash TEXT` - Bcrypt hashed password
  - `provider TEXT` - Auth provider (credentials, google)
  - `provider_account_id TEXT` - OAuth account ID
  - `display_name TEXT` - User's display name
  - `created_at TIMESTAMPTZ` - Account creation time
  - `updated_at TIMESTAMPTZ` - Last update time

- **treks**: Trekking routes
  - `id UUID` - Primary key
  - `name TEXT` - Trek name (unique)
  - `duration_days INT` - Length of trek in days
  - `level TEXT` - Difficulty level
  - `region TEXT` - Geographic region
  - `description TEXT` - Trek description
  - `is_featured BOOLEAN` - Featured on landing page
  - `created_at`, `updated_at` - Timestamps

- **user_treks**: User-Trek relationships
  - `id UUID` - Primary key
  - `user_id UUID` - References users
  - `trek_id UUID` - References treks
  - `status TEXT` - 'interested', 'booked', 'completed'
  - `created_at` - Booking time

### Database Initialization

The schema is automatically initialized when the Docker container starts via `/db/init.sql`.

To manually re-initialize:
```bash
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex -f /docker-entrypoint-initdb.d/init.sql
```

---

## 🔐 Environment Variables

**Local Development** (`.env`):
```env
DATABASE_URL=postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex
```

**Production**:
```env
DATABASE_URL=postgres://[user]:[password]@[host]:[port]/[dbname]
```

---

## 📝 API Endpoints Using Database

### User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Credentials Login
Uses NextAuth.js CredentialsProvider which queries the database:
- Validates username/email + password
- Returns user if credentials match
- Falls back to in-memory auth if database unavailable (dev feature)

### Google OAuth
Automatically creates/updates user record in database on first login.

---

## 🚀 Connecting from Application

The app uses the `pg` client connected via:

**File:** `app/src/lib/db.js`
```javascript
import { Pool } from 'pg';

const connectionString = 
  process.env.DATABASE_URL ||
  'postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex';

export const pool = new Pool({ connectionString });

export async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

### Usage in API Routes

```javascript
import { query } from '../../../lib/db';

export default async function handler(req, res) {
  try {
    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
      ['john', 'john@example.com', 'hashed_pw']
    );
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
```

---

## 🐛 Troubleshooting

### "Connection refused" Error
```bash
# Check if container is running
docker ps | grep nepaltrex

# Start it
docker start nepaltrex-postgres

# Check logs
docker logs nepaltrex-postgres
```

### "Database already in use" Error
```bash
# Remove and recreate container
docker compose down --remove-orphans
docker compose up -d
```

### "Table does not exist" Error
Schema may not have initialized. Verify:
```bash
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex -c "\dt"
```

If no tables shown, re-initialize:
```bash
# Check init.sql was executed
docker logs nepaltrex-postgres | grep "init.sql"

# Manually run schema
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex < db/init.sql
```

### Port 5432 Already in Use
Update `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use 5433 locally, update DATABASE_URL accordingly
```

---

## 📦 Backup & Restore

### Backup Database
```bash
docker exec nepaltrex-postgres pg_dump -U nepaltrex nepaltrex > backup.sql
```

### Restore Database
```bash
docker exec -i nepaltrex-postgres psql -U nepaltrex nepaltrex < backup.sql
```

---

## 🔄 Auto-Connect in Development

The app will automatically:
1. Initialize database on first run (via init.sql)
2. Create schema and sample data
3. Connect all API routes to PostgreSQL
4. Use database for user authentication

No additional setup needed beyond `docker compose up -d`!

---

## 📚 Files

- `docker-compose.yml` - PostgreSQL container definition
- `db/init.sql` - Database schema & sample data
- `app/src/lib/db.js` - Database connection pool
- `app/src/pages/api/auth/register.js` - Registration with database
- `app/src/lib/auth-options.js` - NextAuth with database queries

---

## Next Steps
- ✅ PostgreSQL running
- ✅ Schema initialized
- ✅ User registration with database
- ⏳ Add migrations system (optional)
- ⏳ Add database fixtures/seeds (optional)
- ⏳ Set up query logging (optional)
