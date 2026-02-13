# Environment Configuration Guide

**Version**: 1.0.0
**Last Updated**: February 2026

---

## Required Environment Variables

### Database Configuration (MySQL 8.0)

```bash
MYSQL_ROOT_PASSWORD=root_password_change_me
MYSQL_DATABASE=bim_digital_twin
MYSQL_USER=bim_user
MYSQL_PASSWORD=bim_password_change_me
MYSQL_PORT=3306

# Full connection string (used by the application)
DATABASE_URL=mysql://bim_user:bim_password_change_me@localhost:3306/bim_digital_twin
```

### Neo4j Graph Database (v5.15 Community)

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password_change_me
NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687
```

### Application Settings

```bash
# JWT secret for local authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Node environment
NODE_ENV=development

# Server ports
BACKEND_PORT=3000
FRONTEND_PORT=80

# Local file storage path (used for IFC uploads)
LOCAL_STORAGE_PATH=./uploads
```

---

## Optional Configuration

### External Services

```bash
# bSDD API (buildingSMART Data Dictionary) - public endpoint, no key required
BSDD_API_URL=https://api.bsdd.buildingsmart.org/api/v1
```

### Development Settings

```bash
# Enable debug logging
DEBUG=false

# CORS configuration for local development
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:5173
```

---

## Setup Instructions

### Option 1: Docker Deployment (Recommended)

1. Create a `.env` file in the project root with the variables listed above
2. Update all passwords and the JWT secret
3. Run:

   ```bash
   docker-compose up -d
   ```

4. Access the services:

   - Frontend: <http://localhost>
   - Backend API: <http://localhost:3000>
   - Neo4j Browser: <http://localhost:7474>

### Option 2: Local Development

1. Install MySQL 8.0 and Neo4j 5.x locally
2. Create a `.env` file in the project root with the variables listed above
3. Update connection strings to match your local setup
4. Run:

   ```bash
   pnpm install && pnpm dev
   ```

5. The development server starts on <http://localhost:3000>

---

## Default Credentials

The system creates a default administrator account on first run:

- **Email**: `admin@localhost`
- **Password**: `admin123`

**IMPORTANT**: Change these credentials immediately after first login.

---

## Security Recommendations

1. **JWT Secret**: Generate a random string of at least 32 characters
2. **Strong Passwords**: Use minimum 16 characters with mixed case, numbers, and symbols
3. **HTTPS**: Enable TLS termination in production environments
4. **Database Access**: Restrict connections to localhost or internal network
5. **Regular Backups**: Schedule automated backups of MySQL and Neo4j data
6. **Firewall Rules**: Only expose ports 80 (HTTP) and 443 (HTTPS) externally
7. **Dependency Updates**: Keep all packages up to date with `pnpm update`

---

## Troubleshooting

### Database Connection Issues

If you see "Database not available" errors:

1. Verify MySQL is running: `mysql -u root -p`
2. Check that `DATABASE_URL` format is correct
3. Ensure the database user has proper permissions
4. Check that port 3306 is not blocked by a firewall

### Neo4j Connection Issues

If you see "Failed to connect to Neo4j" errors:

1. Verify Neo4j is running: visit <http://localhost:7474>
2. Check that `NEO4J_URI` uses the format `bolt://host:port`
3. Verify credentials match the Neo4j configuration
4. Check that port 7687 is not blocked by a firewall

### File Upload Issues

If file uploads fail:

1. Verify the `LOCAL_STORAGE_PATH` directory exists and is writable
2. Check available disk space
3. For Docker deployments, verify the `uploads_data` volume is mounted
4. Check the Nginx `client_max_body_size` setting if using the reverse proxy

---

## Additional Resources

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [Neo4j 5.x Documentation](https://neo4j.com/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)

---

**DATAWiSE BIM Digital Twin Platform**
Copyright 2025 DATAWiSE. All rights reserved.
