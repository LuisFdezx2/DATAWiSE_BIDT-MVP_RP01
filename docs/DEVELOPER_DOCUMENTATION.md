# BIM Digital Twin Platform - Developer Documentation

**Version**: 1.0.0
**Last Updated**: February 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Setup and Installation](#setup-and-installation)
5. [Development Workflow](#development-workflow)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Workflow Engine](#workflow-engine)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Contributing](#contributing)

---

## Architecture Overview

The BIM Digital Twin Platform follows a monorepo full-stack architecture with end-to-end type safety:

```text
┌──────────────────────────────────────────────────────────────┐
│                    Client (React 19 + Vite 7)                │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │BIM Processor │  │ Digital Twin  │  │   Analytics &    │  │
│  │  (Workflows) │  │ (3D Viewer)   │  │   Dashboards     │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│                   tRPC Client (Type-safe)                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP (tRPC over Express)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                 Server (Express 4 + tRPC 11)                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  20 Routers  │  │   Services    │  │   Processors     │  │
│  │ (157 procs)  │  │  (Business)   │  │ (IFC, IDS, bSDD) │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ MySQL 8.0 │ │ Neo4j 5.15│ │  Local /  │
       │ (Drizzle) │ │  (Graph)  │ │  S3 Store │
       └───────────┘ └───────────┘ └───────────┘
```

### Key Principles

1. **Type Safety**: End-to-end TypeScript with tRPC — shared types between client and server
2. **Modularity**: Independent services for IFC processing, IDS validation, bSDD enrichment, IoT, and COBie
3. **Performance**: Level of Detail (LOD) rendering, bSDD caching, progressive loading
4. **Standards Compliance**: buildingSMART IFC, IDS, bSDD, and COBie support
5. **Security**: JWT authentication, bcrypt password hashing, role-based access control

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
| ---------------------- | ------- | ---------------------------------------- |
| React | 19.1 | UI framework with concurrent features |
| TypeScript | 5.9 | Static typing |
| Vite | 7.1 | Build tool and dev server |
| Tailwind CSS | 4.1 | Utility-first styling |
| tRPC | 11.6 | Type-safe API client |
| TanStack React Query | 5.90 | Server state management and caching |
| Wouter | 3.3 | Lightweight client-side routing |
| Three.js | 0.181 | 3D rendering (via React Three Fiber 9.4) |
| XYFlow (React Flow) | 12.9 | Node-based workflow editor |
| Recharts | 2.15 | Data visualisation charts |
| Radix UI | — | Accessible component primitives (30+) |
| Framer Motion | 12.23 | Animations |
| Lucide React | 0.453 | Icon library |

### Backend

| Technology | Version | Purpose |
| -------------- | ------- | ---------------------------------------- |
| Node.js | 22+ | Runtime environment |
| Express | 4.21 | HTTP server framework |
| tRPC | 11.6 | Type-safe API layer (20 routers) |
| Drizzle ORM | 0.44 | Database ORM and query builder |
| Zod | 4.1 | Schema validation for API inputs |
| SuperJSON | 1.13 | Enhanced JSON serialisation (dates, etc.) |
| web-ifc | 0.0.74 | IFC file parsing and processing |
| jose / jsonwebtoken | 6.1 / 9.0 | JWT token handling |
| bcryptjs | 3.0 | Password hashing |
| neo4j-driver | 6.0 | Neo4j graph database driver |
| xlsx | 0.18 | Excel file parsing (COBie import) |
| jspdf / pdfkit | 3.0 / 0.17 | PDF report generation |
| xml2js | 0.6 | XML parsing (IDS specifications) |
| axios | 1.12 | HTTP client (bSDD API, sensor APIs) |

### Database and Storage

| Technology | Version | Purpose |
| ---------- | ----------- | ---------------------------------------- |
| MySQL | 8.0 | Relational database (28 tables) |
| Neo4j | 5.15 Community | Knowledge graph (element relationships) |
| Local FS | — | File storage (Docker default) |
| AWS S3 | SDK 3.693 | Cloud file storage (optional) |

### External APIs

| Service | Purpose |
| ----------------------------------------- | ----------------------------------------- |
| bSDD (buildingSMART Data Dictionary) | Semantic classification enrichment |
| buildingSMART IDS | Information Delivery Specification validation |

---

## Project Structure

```text
DW-BDT-MVP_RP_01/
├── client/                          # Frontend application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ui/                  # Radix UI primitives (33+)
│   │   │   ├── ThreeViewer.tsx      # 3D model viewer
│   │   │   ├── CommentsPanel.tsx    # Collaborative annotations
│   │   │   ├── SensorPanel.tsx      # Sensor data display
│   │   │   ├── MeasurementTool.tsx  # 3D measurements
│   │   │   ├── VBE6DDialog.tsx      # OAuth login dialog
│   │   │   └── ...                  # 23+ feature components
│   │   ├── pages/                   # Route page components (19)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── BimProcessor.tsx
│   │   │   ├── DigitalTwinViewer.tsx
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── SensorManagement.tsx
│   │   │   ├── IDSValidation.tsx
│   │   │   ├── BsddEnrichment.tsx
│   │   │   ├── CobieAssetManagement.tsx
│   │   │   ├── ModelComparison.tsx
│   │   │   ├── MultiComparison.tsx
│   │   │   ├── AlertConfiguration.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── GlobalOverview.tsx
│   │   │   ├── ApiHealthDashboard.tsx
│   │   │   ├── AdminUsers.tsx
│   │   │   └── ...
│   │   ├── contexts/                # React contexts (3)
│   │   ├── hooks/                   # Custom hooks (3)
│   │   ├── services/                # Client-side services (5)
│   │   │   ├── workflowExecutor.ts
│   │   │   ├── ifcGeometryLoader.ts
│   │   │   ├── 3d-performance-optimizer.ts
│   │   │   ├── pdfReportGenerator.ts
│   │   │   └── graphExporter.ts
│   │   ├── lib/
│   │   │   ├── trpc.ts              # tRPC client configuration
│   │   │   └── utils.ts             # Utility functions
│   │   ├── App.tsx                  # Root component and routes
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Global styles
│   └── index.html                   # HTML template
│
├── server/                          # Backend application
│   ├── _core/                       # Framework core
│   │   ├── index.ts                 # Express server entry point
│   │   ├── trpc.ts                  # tRPC configuration and procedures
│   │   ├── context.ts               # tRPC context (auth, db, user)
│   │   ├── vite.ts                  # Vite dev server integration
│   │   ├── env.ts                   # Environment variable validation
│   │   └── ...
│   ├── routers/                     # Separated tRPC routers
│   │   ├── local-auth-router.ts     # Local authentication
│   │   └── knowledge-graph-router.ts # Neo4j graph operations
│   ├── routers.ts                   # Main tRPC router (1,935 lines)
│   ├── db.ts                        # Database connection (Drizzle)
│   ├── local-auth.ts                # Authentication logic
│   ├── local-storage.ts             # Local file storage
│   ├── storage.ts                   # S3 storage client
│   ├── ifc-processor.ts             # IFC file parsing (web-ifc)
│   ├── ifc-comparison.ts            # Model version comparison
│   ├── ids-parser.ts                # IDS XML parsing
│   ├── ids-validation-service.ts    # IDS constraint checking
│   ├── ids-library.ts               # IDS template management
│   ├── bsdd-client.ts              # bSDD API client
│   ├── bsdd-cache-service.ts       # bSDD caching layer
│   ├── bsdd-mapping-service.ts     # Element-to-class mapping
│   ├── cobie-parser-service.ts      # COBie file parsing
│   ├── cobie-import-service.ts      # COBie data import
│   ├── cobie-ifc-matching-service.ts # COBie/IFC auto-linking
│   ├── workflow-executor.ts         # Workflow execution engine
│   ├── iot-service.ts               # IoT sensor CRUD
│   ├── sensor-api-client.ts         # External sensor API integration
│   ├── sensor-health-service.ts     # Sensor health monitoring
│   ├── auto-recovery-service.ts     # Automatic sensor recovery
│   ├── alert-service.ts             # Alert rules and notifications
│   ├── neo4j-service.ts             # Neo4j driver and queries
│   ├── knowledge-graph.ts           # Graph construction logic
│   ├── realtime-data-service.ts     # Real-time sensor data
│   ├── pdf-report-service.ts        # PDF generation
│   ├── consolidated-report-generator.ts # Multi-model reports
│   ├── export-service.ts            # CSV/JSON/ZIP export
│   ├── project-analytics.ts         # Project metrics
│   ├── global-metrics-service.ts    # System-wide metrics
│   └── *.test.ts                    # Unit and integration tests (25+)
│
├── drizzle/                         # Database layer
│   ├── schema.ts                    # Table definitions (28 tables, 800+ lines)
│   └── migrations/                  # SQL migration files
│
├── shared/                          # Shared types and constants
│   └── constants.ts
│
├── docs/                            # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── DEVELOPER_DOCUMENTATION.md
│   ├── USER_GUIDE_BIM_PROCESSOR.md
│   ├── USER_GUIDE_DIGITAL_TWIN.md
│   └── ENV_CONFIGURATION.md
│
├── docker-compose.yml               # Docker Compose orchestration
├── Dockerfile.backend               # Backend container image
├── Dockerfile.frontend              # Frontend container image (Nginx)
├── nginx.conf                       # Nginx reverse proxy configuration
├── package.json                     # Dependencies and scripts
├── pnpm-lock.yaml                   # Lock file
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite build configuration
├── vitest.config.ts                 # Test configuration
├── drizzle.config.ts                # Drizzle Kit configuration
└── .gitignore                       # Git ignored files
```

---

## Setup and Installation

### Prerequisites

- **Node.js** 22 or later
- **pnpm** 10 or later
- **MySQL** 8.0 (or Docker)
- **Neo4j** 5.x Community Edition (or Docker)

### Option 1: Docker Deployment (Recommended)

1. **Create `.env` file** in the project root (see [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md))

2. **Start all services**:

   ```bash
   docker-compose up -d
   ```

3. **Access the application**:

   | Service | URL |
   | ----------- | -------------------------- |
   | Frontend | <http://localhost> |
   | Backend API | <http://localhost:3000> |
   | Neo4j Browser | <http://localhost:7474> |

4. **Default credentials**: `admin@localhost` / `admin123` (change immediately)

### Option 2: Local Development

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Create `.env` file** with database connection strings

3. **Run database migrations**:

   ```bash
   pnpm db:push
   ```

4. **Start the development server**:

   ```bash
   pnpm dev
   ```

5. **Access** at `http://localhost:3000` (Express serves both API and frontend via Vite)

---

## Development Workflow

### Available Scripts

| Script | Command | Description |
| ----------- | ------------------------------------------------------------ | ---------------------------------------- |
| `pnpm dev` | `NODE_ENV=development tsx watch server/_core/index.ts` | Start dev server with auto-reload |
| `pnpm build` | `vite build && esbuild server/_core/index.ts ...` | Build frontend and backend for production |
| `pnpm start` | `NODE_ENV=production node dist/index.js` | Run production build |
| `pnpm check` | `tsc --noEmit` | Type-check without emitting files |
| `pnpm test` | `vitest run` | Run all tests |
| `pnpm format` | `prettier --write .` | Auto-format all code |
| `pnpm db:push` | `drizzle-kit generate && drizzle-kit migrate` | Generate and apply DB migrations |

### Adding a New Feature

1. **Define the schema** (if needed):

   ```typescript
   // drizzle/schema.ts
   export const myTable = mysqlTable('my_table', {
     id: int('id').primaryKey().autoincrement(),
     name: varchar('name', { length: 255 }).notNull(),
     createdAt: timestamp('created_at').notNull().defaultNow(),
   });
   ```

2. **Run migrations**:

   ```bash
   pnpm db:push
   ```

3. **Add tRPC procedures**:

   ```typescript
   // server/routers.ts
   myFeature: router({
     list: protectedProcedure.query(async ({ ctx }) => {
       const db = await getDb();
       return db.select().from(myTable).where(eq(myTable.ownerId, ctx.user.id));
     }),
   }),
   ```

4. **Create the UI page**:

   ```typescript
   // client/src/pages/MyFeature.tsx
   export function MyFeature() {
     const { data } = trpc.myFeature.list.useQuery();
     return <div>{/* render data */}</div>;
   }
   ```

5. **Add the route**:

   ```typescript
   // client/src/App.tsx
   <Route path="/my-feature" component={MyFeature} />
   ```

6. **Write tests**:

   ```typescript
   // server/my-feature.test.ts
   import { describe, it, expect } from 'vitest';

   describe('MyFeature', () => {
     it('should return data', async () => {
       // test implementation
     });
   });
   ```

---

## Database Schema

The platform uses MySQL 8.0 with Drizzle ORM. All table definitions are in `drizzle/schema.ts`.

### Table Overview (28 Tables)

#### Core Tables

| Table | Description |
| ---------------------- | ---------------------------------------------------- |
| `users` | User accounts with authentication and role management |
| `bimProjects` | BIM project containers |
| `ifcModels` | IFC file metadata, processing status, and quality scores |
| `ifcElements` | Individual IFC elements with properties and classifications |
| `workflows` | Node-based workflow configurations (JSON) |
| `workflowExecutions` | Workflow execution history and results |
| `elementComments` | Collaborative annotations with threaded replies |

#### IoT and Sensor Tables

| Table | Description |
| ------------------------- | --------------------------------------------------- |
| `iotSensors` | Sensor definitions with API configuration (HTTP, MQTT, Simulator) |
| `sensorReadings` | Historical measurement values |
| `sensorConnectionLogs` | Connection health monitoring logs |
| `sensorRecoveryAttempts` | Automatic recovery attempt history |

#### Alert Tables

| Table | Description |
| ----------------------- | -------------------------------------------------- |
| `alertConfigurations` | Alert rules (critical sensor, low success rate, high latency) |
| `alertHistory` | Triggered alert records |

#### COBie Tables (14 Tables)

The COBie tables implement the international COBie standard for facility and asset data handover:

| Table | Description |
| -------------------- | ------------------------------------------ |
| `cobieFacilities` | Building and facility information |
| `cobieFloors` | Floor and level data |
| `cobieSpaces` | Room and space definitions |
| `cobieZones` | Grouped space zones |
| `cobieTypes` | Equipment and asset type definitions |
| `cobieComponents` | Individual asset instances (linked to IFC) |
| `cobieSystems` | Building systems grouping components |
| `cobieAssemblies` | Hierarchical component grouping |
| `cobieConnections` | Component-to-component connections |
| `cobieSpareParts` | Spare parts catalogue |
| `cobieResources` | Contacts and resource information |
| `cobieJobs` | Maintenance and operational tasks |
| `cobieDocuments` | Associated documents and files |
| `cobieAttributes` | Extended attributes for any COBie entity |
| `cobieCoordinates` | Spatial coordinate information |

### Key Relationships

```text
users ──< bimProjects ──< ifcModels ──< ifcElements
                      │               │
                      ├──< workflows  ├──< elementComments
                      │               ├──< iotSensors ──< sensorReadings
                      │               │                ├──< sensorConnectionLogs
                      │               │                └──< sensorRecoveryAttempts
                      ├──< alertConfigurations ──< alertHistory
                      └──< cobieFacilities ──< cobieFloors ──< cobieSpaces
                                          ├──< cobieTypes ──< cobieComponents
                                          ├──< cobieSystems
                                          └──< ...
```

### Running Migrations

```bash
# Generate migration SQL files and apply them
pnpm db:push
```

This runs `drizzle-kit generate` followed by `drizzle-kit migrate`.

---

## API Design

### Router Architecture

The API consists of 20 tRPC routers with 157 total procedures:

```typescript
export const appRouter = router({
  // Authentication
  system: systemRouter,            // Health check, notifications
  auth: authRouter,                // Session management
  localAuth: localAuthRouter,      // Email/password authentication

  // Projects and Models
  bimProjects: bimProjectsRouter,  // Project CRUD and export
  ifcModels: ifcModelsRouter,      // Model metadata and status
  ifc: ifcRouter,                  // IFC processing and upload

  // Workflows
  workflows: workflowsRouter,     // Workflow CRUD and execution

  // Validation and Enrichment
  ids: idsRouter,                  // IDS validation
  bsdd: bsddRouter,               // bSDD enrichment

  // COBie
  cobie: cobieRouter,              // COBie import and management

  // IoT and Sensors
  iot: iotRouter,                  // Sensor management and alerts
  realtime: realtimeRouter,        // Live sensor data

  // Knowledge Graph
  knowledgeGraph: knowledgeGraphRouter, // Neo4j operations

  // Comparison
  comparison: comparisonRouter,    // Model version comparison

  // Analytics and Metrics
  analytics: analyticsRouter,      // Overview analytics
  projectAnalytics: projectAnalyticsRouter, // Per-project metrics
  globalMetrics: globalMetricsRouter,       // System-wide KPIs

  // Reports and Collaboration
  reports: reportsRouter,          // PDF, HTML, JSON reports
  comments: commentsRouter,        // Element annotations

  // Administration
  admin: adminRouter,              // User management
});
```

### Procedure Types

| Type | Access Check | Description |
| -------------------- | ---------------------------------------- | -------------------------------- |
| `publicProcedure` | None | Open to all requests |
| `protectedProcedure` | `ctx.user` must exist | Requires authenticated session |
| `adminProcedure` | `ctx.user.role === 'admin'` | Requires admin role |

### Context

Every procedure receives:

```typescript
interface TrpcContext {
  req: express.Request;
  res: express.Response;
  user?: {
    id: number;
    name: string;
    role: 'admin' | 'user';
    openId: string;
  };
}
```

For full API reference, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

---

## Workflow Engine

The workflow system allows users to build custom BIM data processing pipelines using a visual node-based editor (XYFlow/React Flow).

### Supported Node Types

| Node Type | Category | Description |
| ------------------ | ---------- | ------------------------------------------- |
| `ifc-loader` | Input | Load IFC model into the pipeline |
| `filter-class` | Processing | Filter elements by IFC class |
| `filter-property` | Processing | Filter elements by property values |
| `ids-validator` | Validation | Validate elements against IDS specification |
| `bsdd-mapper` | Enrichment | Map elements to bSDD classifications |
| `graph-builder` | Analysis | Build Neo4j knowledge graph |
| `quality-score` | Metrics | Calculate data quality score (0-100) |
| `export-csv` | Output | Export results as CSV |
| `export-json` | Output | Export results as JSON |

### Execution Engine

The `WorkflowExecutor` class (`server/workflow-executor.ts`) handles:

1. **Validation**: Checks for connected nodes, circular dependencies
2. **Topological Sort**: Determines execution order (Kahn's algorithm)
3. **Sequential Execution**: Runs nodes in dependency order
4. **Progress Tracking**: Reports node-by-node progress
5. **Result Storage**: Persists execution records to database

For detailed node documentation, see [USER_GUIDE_BIM_PROCESSOR.md](USER_GUIDE_BIM_PROCESSOR.md).

---

## Testing

### Test Framework

- **Vitest** 2.1 with TypeScript support
- 25+ test files covering features, services, and integrations

### Running Tests

```bash
# Run all tests once
pnpm test

# Run a specific test file
npx vitest run server/my-feature.test.ts
```

### Test Categories

| Category | Files | Coverage |
| --------------------- | ----- | ------------------------------------------------ |
| IFC Processing | 3 | Geometry extraction, persistence, processing |
| Workflow Execution | 2 | Execution engine, custom workflows |
| IoT and Sensors | 5 | CRUD, API client, health, connection, recovery |
| Knowledge Graph | 2 | Graph construction, export |
| Model Comparison | 4 | Single, multi, critical changes, visualisation |
| IDS Validation | 2 | Validation logic, system integration |
| bSDD Enrichment | 2 | Client, mapping |
| COBie | 1 | Parsing and import |
| Reports | 1 | PDF generation |
| Analytics | 2 | Project and global metrics |
| Authentication | 1 | Login, logout, session |
| Version History | 1 | Timeline and version tracking |

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyService', () => {
  it('should process data correctly', async () => {
    const result = await myService.process(input);
    expect(result.status).toBe('completed');
    expect(result.items).toHaveLength(5);
  });
});
```

---

## Deployment

### Docker Deployment

The platform ships with Docker Compose for production deployment with four services:

| Service | Image | Port | Purpose |
| ---------- | --------------------- | ----- | ---------------------- |
| `mysql` | `mysql:8.0` | 3306 | Relational database |
| `neo4j` | `neo4j:5.15-community` | 7474, 7687 | Knowledge graph |
| `backend` | Custom (Dockerfile.backend) | 3000 | API server (Node.js) |
| `frontend` | Custom (Dockerfile.frontend) | 80 | Web server (Nginx) |

All services communicate on a `bim-network` bridge network with health checks and automatic restart.

### Build for Production

```bash
pnpm build
```

This generates:

- `dist/public/` — Frontend static files (optimised and minified)
- `dist/index.js` — Backend bundle (ESM, esbuild)

### Production Environment Variables

| Variable | Required | Description |
| -------------- | -------- | --------------------------------------- |
| `DATABASE_URL` | Yes | MySQL connection string |
| `JWT_SECRET` | Yes | Strong random secret (32+ characters) |
| `NEO4J_URI` | Yes | Neo4j Bolt connection URL |
| `NEO4J_USER` | Yes | Neo4j username |
| `NEO4J_PASSWORD` | Yes | Neo4j password |
| `NODE_ENV` | Yes | Must be `production` |
| `LOCAL_STORAGE_PATH` | No | File storage directory (default: `./uploads`) |

For the full list, see [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md).

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

---

## Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **Prettier**: Auto-format with `pnpm format`
- **Naming**: camelCase for variables and functions, PascalCase for components and types

### Commit Messages

Follow conventional commits:

```text
feat: add new sensor alert type
fix: resolve IFC element parsing error
docs: update API documentation
test: add workflow execution tests
refactor: simplify bSDD caching logic
```

### Pull Request Process

1. Create a feature branch from `main`
2. Implement changes with tests
3. Run type checking: `pnpm check`
4. Run tests: `pnpm test`
5. Format code: `pnpm format`
6. Submit PR with a clear description

---

## Resources

- **tRPC Documentation**: <https://trpc.io>
- **Drizzle ORM Documentation**: <https://orm.drizzle.team>
- **React Documentation**: <https://react.dev>
- **Three.js Documentation**: <https://threejs.org/docs>
- **buildingSMART Standards**: <https://www.buildingsmart.org>
- **bSDD API**: <https://api.bsdd.buildingsmart.org>
- **Neo4j Documentation**: <https://neo4j.com/docs>
- **XYFlow (React Flow)**: <https://reactflow.dev>

---

**DATAWiSE BIM Digital Twin Platform**
Copyright 2026 DATAWiSE. All rights reserved.
