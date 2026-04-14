# PostgreSQL on VPS - Production Deployment

This guide explains how to set up PostgreSQL on your VPS for production.

---

## 🚀 Option 1: Docker on VPS (Recommended)

### Prerequisites
- Docker and Docker Compose installed on VPS
- SSH access to VPS

### Steps

1. **Copy docker-compose.yml to VPS**
```bash
scp docker-compose.yml root@77.237.242.237:/root/nepalTrex/
```

2. **SSH into VPS and start PostgreSQL**
```bash
ssh root@77.237.242.237
cd /root/nepalTrex
docker compose up -d
```

3. **Verify PostgreSQL is running**
```bash
docker ps | grep postgres
docker logs nepaltrex-postgres
```

4. **Update environment variables**
Ensure `.env` on VPS has:
```env
DATABASE_URL=postgres://nepaltrex:nepaltrex@127.0.0.1:5432/nepaltrex
```

5. **Restart app**
```bash
cd /root/nepalTrex/app
pm2 restart nepaltrex
```

---

## 🐘 Option 2: Native PostgreSQL (If Docker not available)

### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database
```bash
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE nepaltrex;
CREATE USER nepaltrex WITH PASSWORD 'nepaltrex';
ALTER ROLE nepaltrex SET client_encoding TO 'utf8';
ALTER ROLE nepaltrex SET default_transaction_isolation TO 'read committed';
ALTER ROLE nepaltrex SET default_transaction_deferrable TO on;
ALTER ROLE nepaltrex SET default_transaction_level TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE nepaltrex TO nepaltrex;
\c nepaltrex
\i /path/to/db/init.sql
\q
```

### Update DATABASE_URL
```bash
# In .env on VPS
DATABASE_URL=postgres://nepaltrex:nepaltrex@localhost:5432/nepaltrex
```

---

## 🔒 Security Best Practices

### Change Default Password
```bash
# In PostgreSQL shell (as postgres user)
ALTER USER nepaltrex WITH PASSWORD 'strong_unique_password';
```

### Restrict Network Access
```bash
# Edit /etc/postgresql/15/main/postgresql.conf
listen_addresses = 'localhost'  # Only local connections

# Edit /etc/postgresql/15/main/pg_hba.conf
# Only allow connections from localhost or docker network
local   all             nepaltrex                                 md5
host    all             nepaltrex    127.0.0.1/32                md5
host    all             nepaltrex    ::1/128                     md5
```

### Enable Backups
```bash
# Create backup script
sudo cat > /usr/local/bin/backup-nepaltrex-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
sudo -u postgres pg_dump nepaltrex > $BACKUP_DIR/nepaltrex_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

# Make executable
sudo chmod +x /usr/local/bin/backup-nepaltrex-db.sh

# Add to crontab (daily 2 AM backup)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-nepaltrex-db.sh
```

---

## 📊 Monitoring

### Check PostgreSQL Status
```bash
# With Docker
docker exec nepaltrex-postgres pg_isready

# Native
sudo systemctl status postgresql
```

### Monitor Disk Usage
```bash
# Check database size
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex \
  -c "SELECT pg_size_pretty(pg_database_size('nepaltrex')) as size;"

# Native
sudo -u postgres psql -d nepaltrex \
  -c "SELECT pg_size_pretty(pg_database_size('nepaltrex')) as size;"
```

---

## 🔄 Backup & Recovery

### Backup
```bash
# Docker
docker exec nepaltrex-postgres pg_dump -U nepaltrex nepaltrex > backup.sql

# Native
sudo -u postgres pg_dump nepaltrex > backup.sql
```

### Restore
```bash
# Docker
docker exec -i nepaltrex-postgres psql -U nepaltrex nepaltrex < backup.sql

# Native
sudo -u postgres psql nepaltrex < backup.sql
```

### Transfer Backup to Local Machine
```bash
scp root@77.237.242.237:/root/nepalTrex/backup.sql ./backups/
```

---

## 🚨 Troubleshooting

### Connection Refused
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# or
sudo systemctl status postgresql

# Check logs
docker logs nepaltrex-postgres
# or
sudo tail -f /var/log/postgresql/postgresql.log
```

### Failed to Connect from App
```bash
# Verify DATABASE_URL
cat .env | grep DATABASE_URL

# Test connection manually
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex -c "SELECT 1;"

# Check pg_hba.conf rules
sudo cat /etc/postgresql/15/main/pg_hba.conf
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Check database size
docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size DESC;"
```

---

## 🔗 Deployment Checklist

- [ ] PostgreSQL installed/running on VPS
- [ ] Database created with schema initialized
- [ ] Database user created with secure password
- [ ] DATABASE_URL set in `.env` on VPS
- [ ] Backups configured and tested
- [ ] Firewall rules appropriate (if behind UFW)
- [ ] SSL/TLS for PostgreSQL (optional)
- [ ] Monitoring set up
- [ ] Test registration/login working

---

## 📝 Next Steps

1. Set up automated backups to S3 or external service
2. Enable PostgreSQL SSL for remote connections (if needed)
3. Set up monitoring with Prometheus/Grafana
4. Configure log rotation
5. Document recovery procedures for team

---

## Current VPS Status

**Host:** 77.237.242.237  
**PostgreSQL:** Running (Docker)  
**Database:** `nepaltrex`  
**Admin User:** `nepaltrex`  
**Port:** 5432 (Docker) / 5432 (native)

To verify on VPS:
```bash
docker ps | grep postgres
docker logs nepaltrex-postgres | tail -20
```
