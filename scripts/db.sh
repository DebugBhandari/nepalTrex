#!/bin/bash

# NepalTrex Database Setup Script
# Handles Docker PostgreSQL container and database initialization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Command handlers
start_postgres() {
    print_header "Starting PostgreSQL"
    
    if docker ps | grep -q nepaltrex-postgres; then
        print_success "PostgreSQL is already running"
        return 0
    fi
    
    if docker ps -a | grep -q nepaltrex-postgres; then
        print_info "Starting existing container..."
        docker start nepaltrex-postgres
        sleep 2
    else
        print_info "Creating new container..."
        docker compose up -d
    fi
    
    print_success "PostgreSQL started"
}

stop_postgres() {
    print_header "Stopping PostgreSQL"
    
    docker compose down
    print_success "PostgreSQL stopped"
}

status_postgres() {
    print_header "PostgreSQL Status"
    
    if docker ps | grep -q nepaltrex-postgres; then
        print_success "PostgreSQL is running"
        docker ps | grep nepaltrex-postgres
    else
        print_error "PostgreSQL is not running"
        exit 1
    fi
}

reset_database() {
    print_header "Resetting Database"
    print_error "WARNING: This will delete all data!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return 0
    fi
    
    docker compose down -v
    docker compose up -d
    sleep 3
    
    print_success "Database reset complete"
}

list_users() {
    print_header "Database Users"
    
    docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex \
        -c "SELECT id, username, email, provider, created_at FROM users ORDER BY created_at DESC;" || {
        print_error "Failed to query users"
        exit 1
    }
}

query_db() {
    print_header "Database Query"
    
    if [ -z "$1" ]; then
        print_error "No query provided"
        exit 1
    fi
    
    docker exec nepaltrex-postgres psql -U nepaltrex -d nepaltrex -c "$1"
}

backup_db() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/nepaltrex_backup_${TIMESTAMP}.sql"
    
    print_header "Backing up Database"
    
    mkdir -p backups
    docker exec nepaltrex-postgres pg_dump -U nepaltrex nepaltrex > "$BACKUP_FILE"
    
    print_success "Database backed up to $BACKUP_FILE"
}

restore_db() {
    print_header "Restoring Database"
    
    if [ -z "$1" ]; then
        print_error "No backup file specified"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        print_error "Backup file not found: $1"
        exit 1
    fi
    
    print_error "WARNING: This will overwrite current database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Cancelled"
        return 0
    fi
    
    docker exec -i nepaltrex-postgres psql -U nepaltrex nepaltrex < "$1"
    print_success "Database restored from $1"
}

logs() {
    print_header "PostgreSQL Logs"
    docker logs nepaltrex-postgres "$@"
}

connect_cli() {
    print_header "Connecting to PostgreSQL CLI"
    print_info "Type \\q to exit"
    docker exec -it nepaltrex-postgres psql -U nepaltrex -d nepaltrex
}

show_help() {
    cat << EOF
${BLUE}NepalTrex Database Manager${NC}

Usage: ./scripts/db.sh <command> [options]

Commands:
  ${GREEN}start${NC}           Start PostgreSQL container
  ${GREEN}stop${NC}            Stop PostgreSQL container  
  ${GREEN}status${NC}          Show PostgreSQL status
  ${GREEN}reset${NC}           Reset database (⚠️  deletes all data)
  ${GREEN}users${NC}           List all users
  ${GREEN}query${NC} <SQL>     Execute SQL query
  ${GREEN}backup${NC}          Backup database to file
  ${GREEN}restore${NC} <file>  Restore from backup file
  ${GREEN}logs${NC} [options]  Show PostgreSQL logs
  ${GREEN}cli${NC}             Connect to PostgreSQL interactive shell
  ${GREEN}help${NC}            Show this help message

Examples:
  ./scripts/db.sh start
  ./scripts/db.sh query "SELECT COUNT(*) FROM users;"
  ./scripts/db.sh backup
  ./scripts/db.sh restore backups/nepaltrex_backup_20260414_120000.sql
  ./scripts/db.sh logs -f

${YELLOW}Note:${NC} PostgreSQL must be running before using queries or restore.

EOF
}

# Main script
COMMAND="${1:-help}"

case "$COMMAND" in
    start)
        start_postgres
        ;;
    stop)
        stop_postgres
        ;;
    status)
        status_postgres
        ;;
    reset)
        reset_database
        ;;
    users|list)
        start_postgres
        list_users
        ;;
    query)
        start_postgres
        query_db "$2"
        ;;
    backup)
        start_postgres
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    logs)
        logs "${@:2}"
        ;;
    cli|psql|connect)
        start_postgres
        connect_cli
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
