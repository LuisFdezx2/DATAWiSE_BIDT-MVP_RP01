# BIM Digital Twin Platform - API Documentation

**Version**: 1.0.0
**Last Updated**: February 2026
**Protocol**: tRPC v11

---

## Overview

The BIM Digital Twin Platform exposes a type-safe API through tRPC v11. All endpoints are accessible via the `/api/trpc/*` route. The API uses Zod for input validation and SuperJSON for enhanced serialisation.

### Base URL

- **Development**: `http://localhost:3000/api/trpc`
- **Production (Docker)**: `http://localhost/api/trpc` (proxied through Nginx)

### Authentication

The platform supports two authentication modes:

1. **Local Authentication (JWT)**: Email/password login with bcrypt-hashed passwords and JWT session tokens stored as HTTP cookies
2. **OAuth (VBE6D Platform)**: External OAuth provider for managed deployments

Protected procedures require a valid JWT token passed as a session cookie.

### Procedure Types

| Type | HTTP Semantics | Description |
| -------- | -------------- | -------------------------------- |
| Query | GET | Read-only data retrieval |
| Mutation | POST | Data creation, update, or delete |

### Access Levels

| Level | Description |
| --------- | --------------------------------------------------- |
| Public | No authentication required |
| Protected | Requires an authenticated session (valid JWT token) |
| Admin | Requires `role: 'admin'` on the authenticated user |

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Local Authentication](#2-local-authentication)
3. [BIM Projects](#3-bim-projects)
4. [IFC Models](#4-ifc-models)
5. [IFC Processing](#5-ifc-processing)
6. [Workflows](#6-workflows)
7. [IDS Validation](#7-ids-validation)
8. [bSDD Enrichment](#8-bsdd-enrichment)
9. [COBie Management](#9-cobie-management)
10. [IoT Sensors](#10-iot-sensors)
11. [Real-Time Data](#11-real-time-data)
12. [Knowledge Graph](#12-knowledge-graph)
13. [Model Comparison](#13-model-comparison)
14. [Analytics](#14-analytics)
15. [Project Analytics](#15-project-analytics)
16. [Global Metrics](#16-global-metrics)
17. [Reports](#17-reports)
18. [Collaboration (Comments)](#18-collaboration-comments)
19. [Administration](#19-administration)
20. [System](#20-system)

---

## 1. Authentication

**Router**: `auth`

| Procedure | Type | Access | Description |
| --------- | -------- | ------ | ---------------------------------------------- |
| `me` | Query | Public | Get current authenticated user info |
| `logout` | Mutation | Public | Clear session cookie and terminate the session |

### Get Current User

```typescript
trpc.auth.me.useQuery()
```

**Returns** (when authenticated):

```typescript
{
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}
```

Returns `null` when no session is active.

---

## 2. Local Authentication

**Router**: `localAuth`

| Procedure | Type | Access | Description |
| ---------------- | -------- | ------ | ------------------------------------------------ |
| `register` | Mutation | Public | Register a new user account |
| `login` | Mutation | Public | Authenticate with email and password |
| `changePassword` | Mutation | Public | Change an existing user password |
| `getAuthMode` | Query | Public | Get authentication mode and available features |

### Register

```typescript
trpc.localAuth.register.useMutation({
  email: string;       // Valid email address
  password: string;    // Minimum 6 characters
  name: string;        // Display name
})
```

### Login

```typescript
trpc.localAuth.login.useMutation({
  email: string;
  password: string;
})
```

Sets a JWT session cookie on success.

### Get Auth Mode

```typescript
trpc.localAuth.getAuthMode.useQuery()
```

**Returns**:

```typescript
{
  mode: 'local';
  features: {
    registration: boolean;
    passwordReset: boolean;
    socialLogin: boolean;
  };
}
```

---

## 3. BIM Projects

**Router**: `bimProjects`

| Procedure | Type | Access | Input | Description |
| --------------- | -------- | --------- | ------------------------------ | -------------------------------- |
| `list` | Query | Protected | — | List all projects owned by user |
| `create` | Mutation | Protected | `name`, `description?` | Create a new project |
| `get` | Query | Protected | `id` | Get project details |
| `update` | Mutation | Protected | `id`, `name?`, `description?` | Update project metadata |
| `delete` | Mutation | Protected | `id` | Delete project and related data |
| `exportProject` | Mutation | Protected | `projectId` | Export project as ZIP (base64) |

### Create Project

```typescript
trpc.bimProjects.create.useMutation({
  name: string;          // 1-255 characters
  description?: string;
})
```

**Returns**:

```typescript
{
  id: number;
  name: string;
  description: string | null;
  ownerId: number;
  createdAt: Date;
}
```

---

## 4. IFC Models

**Router**: `ifcModels`

| Procedure | Type | Access | Input | Description |
| -------------- | -------- | --------- | ----------- | --------------------------------------------- |
| `list` | Query | Protected | `projectId` | List all IFC models in a project |
| `get` | Query | Protected | `id` | Get model details with elements and statistics |
| `updateStatus` | Mutation | Protected | `id`, `status`, `qualityScore?` | Update model processing status |

### Get Model

```typescript
trpc.ifcModels.get.useQuery({ id: number })
```

**Returns**:

```typescript
{
  id: number;
  projectId: number;
  name: string;
  ifcSchema: string;          // 'IFC2X3' | 'IFC4'
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  qualityScore: number | null;
  elementCount: number | null;
  fileSize: number | null;
  statistics: object | null;
  createdAt: Date;
}
```

---

## 5. IFC Processing

**Router**: `ifc`

| Procedure | Type | Access | Description |
| --------------- | -------- | --------- | ------------------------------------------------- |
| `processFile` | Mutation | Protected | Download, parse, and store IFC elements |
| `extractElements` | Query | Protected | Extract elements without persisting |
| `filterByType` | Query | Protected | Filter elements by IFC class |
| `getStatistics` | Query | Protected | Get element counts and schema info |
| `listSavedModels` | Query | Protected | List processed models |
| `getSavedModel` | Query | Protected | Get model with parsed elements |
| `uploadFile` | Mutation | Protected | Upload IFC file (base64, max 100 MB) |
| `getFileUrl` | Query | Protected | Get download URL for stored IFC file |

### Process File

```typescript
trpc.ifc.processFile.useMutation({
  fileUrl: string;             // URL to IFC file
  projectId?: number;
  includeGeometry?: boolean;
})
```

**Returns**:

```typescript
{
  schema: string;
  statistics: {
    totalElements: number;
    elementsByType: Record<string, number>;
  };
  elements: Array<{
    expressId: number;
    type: string;
    name: string | null;
    globalId: string | null;
    properties: object;
  }>;
}
```

### Upload File

```typescript
trpc.ifc.uploadFile.useMutation({
  projectId: number;
  fileName: string;
  fileData: string;            // Base64-encoded content
  description?: string;
})
```

Maximum file size: 100 MB.

---

## 6. Workflows

**Router**: `workflows`

| Procedure | Type | Access | Description |
| -------------- | -------- | --------- | ------------------------------------------ |
| `list` | Query | Protected | List workflows for a project |
| `create` | Mutation | Protected | Create a new workflow |
| `get` | Query | Protected | Get workflow configuration |
| `update` | Mutation | Protected | Update workflow nodes and edges |
| `delete` | Mutation | Protected | Delete a workflow |
| `listCustom` | Query | Protected | List current user's custom workflows |
| `saveCustom` | Mutation | Protected | Save a custom workflow |
| `updateCustom` | Mutation | Protected | Update a custom workflow (owner only) |
| `deleteCustom` | Mutation | Protected | Delete a custom workflow (owner only) |
| `execute` | Mutation | Protected | Execute a workflow |

### Create Workflow

```typescript
trpc.workflows.create.useMutation({
  projectId: number;
  name: string;              // 1-255 characters
  description?: string;
  flowConfig: string;        // JSON: { nodes: [], edges: [] }
})
```

### Execute Workflow

```typescript
trpc.workflows.execute.useMutation({
  workflowId: number;
  config: {
    nodes: Array<{
      id: string;
      type: string;
      data: object;
      position: { x: number; y: number };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
})
```

**Returns**:

```typescript
{
  success: boolean;
  executionId: number;
  duration: number;          // Milliseconds
  summary: object;
  errors: string[];
}
```

---

## 7. IDS Validation

**Router**: `ids`

| Procedure | Type | Access | Description |
| ---------------------- | -------- | --------- | ------------------------------------------- |
| `getTemplates` | Query | Public | List all predefined IDS templates |
| `getTemplateById` | Query | Public | Get a specific IDS template |
| `getTemplatesByCategory` | Query | Public | Filter templates by category |
| `validate` | Mutation | Protected | Validate model against IDS specification |
| `generateSummary` | Mutation | Protected | Generate validation summary |
| `exportJSON` | Mutation | Protected | Export validation report as JSON |
| `exportHTML` | Mutation | Protected | Export validation report as HTML |
| `getChartData` | Mutation | Protected | Generate chart data from report |
| `getSampleIDS` | Query | Public | Get sample IDS XML for testing |

### Validate Model

```typescript
trpc.ids.validate.useMutation({
  modelId: number;
  idsXml: string;            // IDS XML specification
})
```

**Returns**:

```typescript
{
  totalSpecifications: number;
  passedSpecifications: number;
  failedSpecifications: number;
  complianceRate: number;
  details: Array<{
    specificationName: string;
    status: 'passed' | 'failed';
    passedElements: number;
    failedElements: number;
    issues: string[];
  }>;
}
```

### Template Categories

| Category | Description |
| --------------------------- | ------------------------------------------- |
| `building_codes` | National building code requirements |
| `iso_standards` | ISO standard compliance checks |
| `industry_best_practices` | Industry best practice validations |
| `custom` | User-defined specifications |

---

## 8. bSDD Enrichment

**Router**: `bsdd`

| Procedure | Type | Access | Description |
| ------------------- | -------- | --------- | ------------------------------------------ |
| `searchClasses` | Query | Protected | Search bSDD classes by keyword |
| `getClass` | Query | Protected | Get bSDD class details with properties |
| `getDomains` | Query | Protected | List available bSDD domains |
| `mapModelElements` | Mutation | Protected | Auto-map all elements in a model |
| `getMappingStats` | Query | Protected | Get mapping statistics for a model |
| `getElementMapping` | Query | Protected | Get bSDD mapping for a specific element |
| `saveMapping` | Mutation | Protected | Save manual bSDD mapping |
| `removeMapping` | Mutation | Protected | Remove bSDD mapping from element |
| `enrichElement` | Query | Protected | Enrich a single element with bSDD data |
| `suggestClasses` | Query | Protected | Get class suggestions for an IFC type |
| `getCacheStats` | Query | Protected | Get API cache statistics |
| `clearCache` | Mutation | Protected | Clear bSDD cache |

### Auto-Map Model

```typescript
trpc.bsdd.mapModelElements.useMutation({
  modelId: number;
  domainUri?: string;
})
```

**Returns**:

```typescript
{
  totalElements: number;
  mappedElements: number;
  unmappedElements: number;
  coverageRate: number;
}
```

### Search Classes

```typescript
trpc.bsdd.searchClasses.useQuery({
  searchText: string;
  domainUri?: string;
  languageCode?: string;     // Default: 'en-GB'
})
```

---

## 9. COBie Management

**Router**: `cobie`

| Procedure | Type | Access | Description |
| ------------------ | -------- | --------- | ------------------------------------------------ |
| `importFile` | Mutation | Protected | Import COBie file (Excel/CSV) into database |
| `getFacilities` | Query | Protected | List facilities in a project |
| `getComponents` | Query | Protected | Get components with type and space details |
| `linkToIFCElement` | Mutation | Protected | Link a COBie component to an IFC element |
| `getAssetStats` | Query | Protected | Get facility statistics |
| `autoLink` | Mutation | Protected | Auto-link components to IFC elements |

### Import COBie File

```typescript
trpc.cobie.importFile.useMutation({
  projectId: number;
  filename: string;
  fileData: string;          // Base64-encoded Excel or CSV
})
```

### Auto-Link Components

```typescript
trpc.cobie.autoLink.useMutation({
  modelId: number;
})
```

**Returns**:

```typescript
{
  totalComponents: number;
  linkedComponents: number;
  unlinkedComponents: number;
  linkingRate: number;
  matches: Array<{
    componentId: number;
    elementId: number;
    confidence: number;
  }>;
}
```

### Get Asset Statistics

```typescript
trpc.cobie.getAssetStats.useQuery({ facilityId: number })
```

**Returns**:

```typescript
{
  components: number;
  types: number;
  spaces: number;
  systems: number;
  maintenanceJobs: number;
}
```

---

## 10. IoT Sensors

**Router**: `iot`

### Sensor Management

| Procedure | Type | Access | Description |
| -------------------- | -------- | --------- | ---------------------------------------- |
| `listSensors` | Query | Protected | List sensors attached to an element |
| `listSensorsByProject` | Query | Protected | List all sensors in a project |
| `createSensor` | Mutation | Protected | Create a new sensor |
| `getSensorsStatus` | Query | Protected | Get status of all active sensors |
| `simulateAll` | Mutation | Protected | Simulate readings for all sensors |

### Sensor Configuration

| Procedure | Type | Access | Description |
| -------------------- | -------- | --------- | ------------------------------------------------ |
| `updateSensorConfig` | Mutation | Protected | Update sensor API configuration |
| `getSensorConfig` | Query | Protected | Get sensor configuration (password excluded) |
| `testConnection` | Mutation | Protected | Test external API or MQTT connection |

### Sensor Health Monitoring

| Procedure | Type | Access | Description |
| ------------------------- | -------- | --------- | ---------------------------------------------- |
| `getReadings` | Query | Protected | Get latest readings (default: 100) |
| `getHealthMetrics` | Query | Protected | Get sensor health over time window |
| `getProjectHealthMetrics` | Query | Protected | Get health metrics for all project sensors |
| `getConnectionLogs` | Query | Protected | Get connection logs with pagination |
| `getProblematicSensors` | Query | Protected | Get sensors below health threshold |

### Alert System

| Procedure | Type | Access | Description |
| ---------------------------- | -------- | --------- | -------------------------------------- |
| `getAlertConfigurations` | Query | Protected | List alert rules for a project |
| `createAlertConfiguration` | Mutation | Protected | Create a new alert rule |
| `updateAlertConfiguration` | Mutation | Protected | Update an alert rule |
| `deleteAlertConfiguration` | Mutation | Protected | Delete an alert rule |
| `getAlertHistory` | Query | Protected | Get triggered alert history |
| `checkSensorAlerts` | Mutation | Protected | Check sensor health and trigger alerts |
| `generateHealthReport` | Mutation | Protected | Generate PDF health report |

### Auto-Recovery

| Procedure | Type | Access | Description |
| -------------------- | -------- | --------- | ---------------------------------------- |
| `runAutoRecovery` | Mutation | Protected | Trigger manual auto-recovery cycle |
| `getRecoveryHistory` | Query | Protected | Get recovery attempts for a sensor |
| `getRecoveryStats` | Query | Protected | Get project-level recovery statistics |

### Create Sensor

```typescript
trpc.iot.createSensor.useMutation({
  elementId: number;
  name: string;
  sensorType: string;        // 'temperature', 'humidity', 'energy', etc.
  unit: string;              // '°C', '%RH', 'kWh', 'ppm', 'lux'
  minThreshold?: number;
  maxThreshold?: number;
  metadata?: object;
})
```

### Alert Types

| Type | Description |
| ------------------- | -------------------------------------------------- |
| `critical_sensor` | Sensor enters error state |
| `low_success_rate` | Connection success rate drops below threshold |
| `high_latency` | Response latency exceeds threshold (milliseconds) |

---

## 11. Real-Time Data

**Router**: `realtime`

| Procedure | Type | Access | Description |
| ------------------- | ----- | --------- | ---------------------------------------- |
| `getElementData` | Query | Protected | Get live sensor data for an element |
| `getBatchData` | Query | Protected | Get live data for multiple elements |
| `getRecentReadings` | Query | Protected | Get recent readings within time window |
| `getMockData` | Query | Protected | Generate mock data for testing |

### Get Element Data

```typescript
trpc.realtime.getElementData.useQuery({
  elementId: string;         // IFC GUID
})
```

**Returns**:

```typescript
Array<{
  sensorId: number;
  type: 'temperature' | 'humidity' | 'occupancy' | 'energy' | 'co2' | 'light';
  value: number;
  unit: string;
  timestamp: number;
  status: 'normal' | 'warning' | 'critical';
}>
```

### Get Batch Data

```typescript
trpc.realtime.getBatchData.useQuery({
  elementIds: string[];
})
```

**Returns**: Object mapping each `elementId` to its sensor data array.

---

## 12. Knowledge Graph

**Router**: `knowledgeGraph`

| Procedure | Type | Access | Description |
| ----------------- | -------- | --------- | ---------------------------------------------- |
| `importModel` | Mutation | Protected | Import IFC model into Neo4j graph |
| `queryByType` | Query | Protected | Query graph elements by IFC type |
| `findConnected` | Query | Protected | Find connected elements (depth 1-5) |
| `findPath` | Query | Protected | Find shortest path between two elements |
| `getStats` | Query | Protected | Get graph statistics for a model |
| `deleteModel` | Mutation | Protected | Delete model from graph |
| `executeQuery` | Mutation | Admin | Execute custom Cypher query |
| `checkConnection` | Query | Protected | Check Neo4j connection status |

### Import Model

```typescript
trpc.knowledgeGraph.importModel.useMutation({
  modelId: number;
  modelName: string;
  elements: Array<{
    guid: string;
    type: string;
    name?: string;
    properties?: object;
  }>;
})
```

### Find Connected Elements

```typescript
trpc.knowledgeGraph.findConnected.useQuery({
  guid: string;
  maxDepth?: number;         // 1-5, default: 2
})
```

---

## 13. Model Comparison

**Router**: `comparison`

| Procedure | Type | Access | Description |
| ----------------------- | ----- | --------- | ----------------------------------------------- |
| `compareModels` | Query | Protected | Compare two model versions, detect changes |
| `getModelVersionHistory` | Query | Protected | Get version history grouped by base model name |
| `compareMultiple` | Query | Protected | Compare up to 10 models with heatmap data |

### Compare Two Models

```typescript
trpc.comparison.compareModels.useQuery({
  oldModelId: number;
  newModelId: number;
})
```

Detects added, removed, and modified elements. Critical structural changes trigger automatic notifications.

### Compare Multiple Models

```typescript
trpc.comparison.compareMultiple.useQuery({
  modelIds: number[];        // 2-10 model IDs
})
```

Returns a heatmap visualisation of changes across versions.

---

## 14. Analytics

**Router**: `analytics`

| Procedure | Type | Access | Description |
| ------------- | ----- | --------- | ------------------------------------- |
| `getOverview` | Query | Protected | Get analytics overview for all user projects |

---

## 15. Project Analytics

**Router**: `projectAnalytics`

| Procedure | Type | Access | Description |
| ------------------- | ----- | --------- | -------------------------------------------------- |
| `getProjectMetrics` | Query | Protected | Get comprehensive metrics: distribution and trends |

```typescript
trpc.projectAnalytics.getProjectMetrics.useQuery({
  projectId: number;
})
```

---

## 16. Global Metrics

**Router**: `globalMetrics`

| Procedure | Type | Access | Description |
| --------------------- | ----- | --------- | ---------------------------------------------- |
| `getGlobalKPIs` | Query | Protected | Global KPIs across all user projects |
| `getProjectComparison` | Query | Protected | Compare metrics across all projects |
| `getProjectRankings` | Query | Protected | Rank projects by various metrics |
| `getHourlyHeatmap` | Query | Protected | Sensor availability heatmap (default: 7 days) |
| `getAlertTrends` | Query | Protected | Alert trends over time (default: 30 days) |

---

## 17. Reports

**Router**: `reports`

| Procedure | Type | Access | Description |
| ------------------------- | -------- | --------- | ----------------------------------------------- |
| `generateWorkflowReport` | Mutation | Protected | Generate PDF workflow execution report |
| `generateConsolidated` | Query | Protected | Generate consolidated report data for a project |
| `generateHTML` | Query | Protected | Generate HTML report |
| `generateJSON` | Query | Protected | Generate JSON report |

### Generate Workflow Report

```typescript
trpc.reports.generateWorkflowReport.useMutation({
  workflowName: string;
  executedAt: string;
  executionTime: number;
  statistics: {
    totalElements: number;
    elementsByType: Record<string, number>;
    schema: string;
  };
  validations?: {
    passed: number;
    failed: number;
    details: Array<{
      rule: string;
      status: 'passed' | 'failed';
      message: string;
    }>;
  };
  logs: string[];
})
```

**Returns**:

```typescript
{
  pdf: string;               // Base64-encoded PDF
  filename: string;
}
```

---

## 18. Collaboration (Comments)

**Router**: `comments`

| Procedure | Type | Access | Description |
| -------------- | -------- | --------- | ------------------------------------------------ |
| `list` | Query | Protected | List comments on an element (ordered by date) |
| `create` | Mutation | Protected | Create a comment or reply (supports threading) |
| `resolve` | Mutation | Protected | Mark a comment as resolved |
| `countByModel` | Query | Protected | Count comments per element with resolved status |

### Create Comment

```typescript
trpc.comments.create.useMutation({
  elementId: number;
  modelId: number;
  content: string;
  parentId?: number;         // For threaded replies
})
```

---

## 19. Administration

**Router**: `admin`

| Procedure | Type | Access | Description |
| ------------ | -------- | ----- | ------------------------------------------- |
| `listUsers` | Query | Admin | List all registered users |
| `updateRole` | Mutation | Admin | Change user role (self-demotion prevented) |

```typescript
trpc.admin.updateRole.useMutation({
  userId: number;
  role: 'admin' | 'user';
})
```

---

## 20. System

**Router**: `system`

| Procedure | Type | Access | Description |
| ------------- | -------- | ------ | ------------------------------------------ |
| `health` | Query | Public | Health check endpoint, returns `{ ok: true }` |
| `notifyOwner` | Mutation | Admin | Send notification to system owner |

---

## Error Handling

All tRPC procedures use standard error codes:

| Code | HTTP Status | Description |
| ----------------------- | ----------- | ----------------------------------- |
| `BAD_REQUEST` | 400 | Invalid input parameters |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Error Response Format

```typescript
{
  error: {
    message: string;
    code: string;
    data?: {
      code: string;
      httpStatus: number;
      path: string;
    };
  };
}
```

### Client-Side Error Handling

```typescript
const { data, error } = trpc.bimProjects.get.useQuery({ id: 1 });

if (error) {
  if (error.data?.code === 'NOT_FOUND') {
    console.log('Project not found');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## Limits

| Resource | Limit |
| ---------------------- | ----------------------- |
| IFC file upload | 100 MB per file |
| bSDD API requests | 100 requests per minute |
| Multi-model comparison | 10 models maximum |
| Sensor readings query | 100 readings default |
| Connection logs | Paginated (100 default) |
| Graph traversal depth | 5 levels maximum |

---

## Summary

| Metric | Count |
| --------------------- | ----- |
| Total routers | 20 |
| Total procedures | 157 |
| Query procedures | 85 |
| Mutation procedures | 72 |
| Public procedures | 18 |
| Protected procedures | 134 |
| Admin-only procedures | 5 |

---

**DATAWiSE BIM Digital Twin Platform**
Copyright 2026 DATAWiSE. All rights reserved.
