import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** VBE6D OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }), // For local authentication
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabla de proyectos BIM
 * Almacena información de proyectos que contienen múltiples modelos IFC
 */
export const bimProjects = mysqlTable("bim_projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: int("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BimProject = typeof bimProjects.$inferSelect;
export type InsertBimProject = typeof bimProjects.$inferInsert;

/**
 * Tabla de modelos IFC
 * Almacena metadatos de archivos IFC cargados y procesados
 */
export const ifcModels = mysqlTable("ifc_models", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => bimProjects.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** Clave S3 del archivo IFC original */
  ifcFileKey: varchar("ifc_file_key", { length: 512 }).notNull(),
  /** URL pública del archivo IFC en S3 */
  ifcFileUrl: text("ifc_file_url").notNull(),
  /** Clave S3 de los fragmentos 3D procesados */
  fragmentsKey: varchar("fragments_key", { length: 512 }),
  /** URL pública de los fragmentos 3D en S3 */
  fragmentsUrl: text("fragments_url"),
  /** Versión del esquema IFC (IFC2x3, IFC4, etc.) */
  ifcSchema: varchar("ifc_schema", { length: 50 }),
  /** Estado del procesamiento */
  processingStatus: mysqlEnum("processing_status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  /** Puntuación de calidad de datos (0-100) */
  qualityScore: int("quality_score"),
  /** Número total de elementos IFC */
  elementCount: int("element_count"),
  /** Tamaño del archivo en bytes */
  fileSize: int("file_size"),
  /** Estadísticas del modelo en formato JSON (elementos por tipo, etc.) */
  statistics: text("statistics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IfcModel = typeof ifcModels.$inferSelect;
export type InsertIfcModel = typeof ifcModels.$inferInsert;

/**
 * Tabla de flujos de trabajo (workflows)
 * Almacena configuraciones de flujos de procesamiento de nodos
 */
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("project_id").notNull().references(() => bimProjects.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** Configuración del flujo en formato JSON (nodos y conexiones) */
  flowConfig: text("flow_config").notNull(),
  /** Usuario que creó el flujo */
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

/**
 * Tabla de ejecuciones de flujos de trabajo
 * Registra cada ejecución de un flujo con sus resultados
 */
export const workflowExecutions = mysqlTable("workflow_executions", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id").notNull().references(() => workflows.id),
  modelId: int("model_id").references(() => ifcModels.id),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  /** Logs de ejecución en formato JSON */
  logs: text("logs"),
  /** Resultados de la ejecución en formato JSON */
  results: text("results"),
  /** Mensaje de error si falló */
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * Tabla de elementos IFC
 * Almacena elementos individuales extraídos de modelos IFC para consultas rápidas
 */
export const ifcElements = mysqlTable("ifc_elements", {
  id: int("id").autoincrement().primaryKey(),
  modelId: int("model_id").notNull().references(() => ifcModels.id),
  /** ID Express del elemento en el archivo IFC */
  expressId: int("express_id").notNull(),
  /** Tipo de elemento IFC (IfcWall, IfcWindow, etc.) */
  ifcType: varchar("ifc_type", { length: 100 }).notNull(),
  /** Nombre del elemento */
  name: varchar("name", { length: 255 }),
  /** GUID global único del elemento */
  globalId: varchar("global_id", { length: 22 }),
  /** Propiedades del elemento en formato JSON */
  properties: text("properties"),
  /** Clasificaciones bSDD en formato JSON */
  bsddClassifications: text("bsdd_classifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IfcElement = typeof ifcElements.$inferSelect;
export type InsertIfcElement = typeof ifcElements.$inferInsert;

/**
 * Tabla de sensores IoT
 * Almacena sensores vinculados a elementos IFC del gemelo digital
 */
export const iotSensors = mysqlTable("iot_sensors", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del elemento IFC al que está vinculado el sensor */
  elementId: int("element_id").notNull().references(() => ifcElements.id),
  /** Nombre descriptivo del sensor */
  name: varchar("name", { length: 255 }).notNull(),
  /** Tipo de sensor (temperature, humidity, energy, occupancy, etc.) */
  sensorType: varchar("sensor_type", { length: 50 }).notNull(),
  /** Unidad de medida (°C, %, kWh, etc.) */
  unit: varchar("unit", { length: 20 }).notNull(),
  /** Umbral mínimo para alertas */
  minThreshold: int("min_threshold"),
  /** Umbral máximo para alertas */
  maxThreshold: int("max_threshold"),
  /** Estado del sensor (active, inactive, error) */
  status: mysqlEnum("status", ["active", "inactive", "error"]).default("active").notNull(),
  /** Metadata adicional en formato JSON */
  metadata: text("metadata"),
  /** URL del endpoint de API para obtener datos reales del sensor */
  apiUrl: varchar("api_url", { length: 500 }),
  /** Tipo de API (http, mqtt) */
  apiType: mysqlEnum("api_type", ["http", "mqtt", "simulator"]).default("simulator").notNull(),
  /** Clave de API para autenticación */
  apiKey: varchar("api_key", { length: 255 }),
  /** Tópico MQTT (solo para tipo mqtt) */
  mqttTopic: varchar("mqtt_topic", { length: 255 }),
  /** Usuario MQTT (opcional) */
  mqttUsername: varchar("mqtt_username", { length: 100 }),
  /** Contraseña MQTT (opcional) */
  mqttPassword: varchar("mqtt_password", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IotSensor = typeof iotSensors.$inferSelect;
export type InsertIotSensor = typeof iotSensors.$inferInsert;

/**
 * Tabla de lecturas de sensores
 * Almacena las lecturas históricas de los sensores IoT
 */
export const sensorReadings = mysqlTable("sensor_readings", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del sensor que generó la lectura */
  sensorId: int("sensor_id").notNull().references(() => iotSensors.id),
  /** Valor de la lectura */
  value: int("value").notNull(),
  /** Timestamp de la lectura */
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  /** Metadata adicional (calidad de señal, batería, etc.) */
  metadata: text("metadata"),
});

export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;

/**
 * Tabla de logs de conexión de sensores
 * Almacena intentos de conexión a APIs externas para monitoreo de salud
 */
export const sensorConnectionLogs = mysqlTable("sensor_connection_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del sensor */
  sensorId: int("sensor_id").notNull().references(() => iotSensors.id),
  /** Timestamp del intento de conexión */
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  /** Éxito de la conexión (true=exitoso, false=fallback) */
  success: boolean("success").notNull(),
  /** Latencia en milisegundos (solo si exitoso) */
  latencyMs: int("latency_ms"),
  /** Mensaje de error (solo si fallido) */
  errorMessage: text("error_message"),
  /** Tipo de fuente de datos (api, fallback) */
  source: mysqlEnum("source", ["api", "fallback"]).notNull(),
});

export type SensorConnectionLog = typeof sensorConnectionLogs.$inferSelect;
export type InsertSensorConnectionLog = typeof sensorConnectionLogs.$inferInsert;

// Comentarios y anotaciones en elementos IFC
export const elementComments = mysqlTable('element_comments', {
  id: int('id').autoincrement().primaryKey(),
  elementId: int('element_id').notNull(), // expressId del elemento IFC
  modelId: int('model_id').notNull().references(() => ifcModels.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 64 }).notNull(),
  userName: varchar('user_name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  parentId: int('parent_id'), // Para hilos de conversación
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export type ElementComment = typeof elementComments.$inferSelect;
export type InsertElementComment = typeof elementComments.$inferInsert;

/**
 * Tabla de configuración de alertas
 * Almacena reglas de alertas para sensores IoT
 */
export const alertConfigurations = mysqlTable("alert_configurations", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del proyecto */
  projectId: int("project_id").notNull().references(() => bimProjects.id),
  /** Nombre de la alerta */
  name: varchar("name", { length: 255 }).notNull(),
  /** Tipo de alerta (critical_sensor, low_success_rate, high_latency) */
  alertType: mysqlEnum("alert_type", ["critical_sensor", "low_success_rate", "high_latency"]).notNull(),
  /** Umbral para activar la alerta */
  threshold: int("threshold").notNull(),
  /** URL del webhook para notificaciones externas */
  webhookUrl: varchar("webhook_url", { length: 500 }),
  /** Notificar al propietario del proyecto */
  notifyOwner: boolean("notify_owner").default(true).notNull(),
  /** Alerta habilitada */
  enabled: boolean("enabled").default(true).notNull(),
  /** Fecha de creación */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Fecha de actualización */
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfiguration = typeof alertConfigurations.$inferInsert;

/**
 * Tabla de historial de alertas
 * Almacena registro de alertas enviadas
 */
export const alertHistory = mysqlTable("alert_history", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la configuración de alerta */
  configId: int("config_id").notNull().references(() => alertConfigurations.id),
  /** ID del sensor que activó la alerta */
  sensorId: int("sensor_id").notNull().references(() => iotSensors.id),
  /** Tipo de alerta */
  alertType: mysqlEnum("alert_type", ["critical_sensor", "low_success_rate", "high_latency"]).notNull(),
  /** Mensaje de la alerta */
  message: text("message").notNull(),
  /** Valor que activó la alerta */
  triggerValue: int("trigger_value").notNull(),
  /** Umbral configurado */
  threshold: int("threshold").notNull(),
  /** Webhook enviado exitosamente */
  webhookSent: boolean("webhook_sent").default(false).notNull(),
  /** Notificación al propietario enviada */
  ownerNotified: boolean("owner_notified").default(false).notNull(),
  /** Fecha de envío */
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type AlertHistoryEntry = typeof alertHistory.$inferSelect;
export type InsertAlertHistoryEntry = typeof alertHistory.$inferInsert;

/**
 * Tabla de intentos de recuperación de sensores
 * Almacena historial de intentos de reconexión automática
 */
export const sensorRecoveryAttempts = mysqlTable("sensor_recovery_attempts", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del sensor */
  sensorId: int("sensor_id").notNull().references(() => iotSensors.id),
  /** Fecha y hora del intento */
  attemptAt: timestamp("attempt_at").defaultNow().notNull(),
  /** Intento exitoso */
  success: boolean("success").notNull(),
  /** Minutos de backoff aplicados antes de este intento */
  backoffMinutes: int("backoff_minutes").notNull(),
  /** Mensaje de error si falló */
  errorMessage: text("error_message"),
  /** Latencia de la conexión si fue exitoso (ms) */
  latencyMs: int("latency_ms"),
});

export type SensorRecoveryAttempt = typeof sensorRecoveryAttempts.$inferSelect;
export type InsertSensorRecoveryAttempt = typeof sensorRecoveryAttempts.$inferInsert;

// ============================================================================
// COBIE (Construction Operations Building information exchange) TABLES
// ============================================================================

/**
 * Tabla de instalaciones/edificios COBie
 * Información general del edificio según estándar COBie
 */
export const cobieFacilities = mysqlTable("cobie_facilities", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del proyecto BIM asociado */
  projectId: int("project_id").notNull().references(() => bimProjects.id),
  /** Nombre de la instalación */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Fase del proyecto */
  projectPhase: varchar("project_phase", { length: 255 }),
  /** Nombre del sitio */
  siteName: varchar("site_name", { length: 255 }),
  /** Área lineal */
  linearUnits: varchar("linear_units", { length: 50 }),
  /** Unidades de área */
  areaUnits: varchar("area_units", { length: 50 }),
  /** Unidades de volumen */
  volumeUnits: varchar("volume_units", { length: 50 }),
  /** Unidades de moneda */
  currencyUnit: varchar("currency_unit", { length: 50 }),
  /** Medición de área */
  areaMeasurement: varchar("area_measurement", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
  /** Fecha de importación */
  importedAt: timestamp("imported_at").defaultNow().notNull(),
});

export type CobieFacility = typeof cobieFacilities.$inferSelect;
export type InsertCobieFacility = typeof cobieFacilities.$inferInsert;

/**
 * Tabla de plantas/niveles COBie
 */
export const cobieFloors = mysqlTable("cobie_floors", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre de la planta */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Elevación */
  elevation: varchar("elevation", { length: 255 }),
  /** Altura */
  height: varchar("height", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieFloor = typeof cobieFloors.$inferSelect;
export type InsertCobieFloor = typeof cobieFloors.$inferInsert;

/**
 * Tabla de espacios COBie
 */
export const cobieSpaces = mysqlTable("cobie_spaces", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la planta */
  floorId: int("floor_id").notNull().references(() => cobieFloors.id),
  /** Nombre del espacio */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Área bruta */
  grossArea: varchar("gross_area", { length: 255 }),
  /** Área neta */
  netArea: varchar("net_area", { length: 255 }),
  /** Altura utilizable */
  usableHeight: varchar("usable_height", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieSpace = typeof cobieSpaces.$inferSelect;
export type InsertCobieSpace = typeof cobieSpaces.$inferInsert;

/**
 * Tabla de zonas COBie
 */
export const cobieZones = mysqlTable("cobie_zones", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre de la zona */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Lista de espacios (IDs separados por coma) */
  spaceNames: text("space_names"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieZone = typeof cobieZones.$inferSelect;
export type InsertCobieZone = typeof cobieZones.$inferInsert;

/**
 * Tabla de tipos de equipos/activos COBie
 */
export const cobieTypes = mysqlTable("cobie_types", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del tipo */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Código de activo */
  assetType: varchar("asset_type", { length: 255 }),
  /** Fabricante */
  manufacturer: varchar("manufacturer", { length: 255 }),
  /** Número de modelo */
  modelNumber: varchar("model_number", { length: 255 }),
  /** Código de garantía */
  warrantyGuarantorParts: varchar("warranty_guarantor_parts", { length: 255 }),
  /** Duración de garantía de partes */
  warrantyDurationParts: varchar("warranty_duration_parts", { length: 255 }),
  /** Garantía de mano de obra */
  warrantyGuarantorLabor: varchar("warranty_guarantor_labor", { length: 255 }),
  /** Duración de garantía de mano de obra */
  warrantyDurationLabor: varchar("warranty_duration_labor", { length: 255 }),
  /** Vida útil esperada */
  expectedLife: varchar("expected_life", { length: 255 }),
  /** Duración de la garantía */
  durationUnit: varchar("duration_unit", { length: 50 }),
  /** Código de reemplazo */
  replacementCost: varchar("replacement_cost", { length: 255 }),
  /** Forma de la garantía */
  warrantyDescription: text("warranty_description"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieType = typeof cobieTypes.$inferSelect;
export type InsertCobieType = typeof cobieTypes.$inferInsert;

/**
 * Tabla de componentes/activos individuales COBie
 */
export const cobieComponents = mysqlTable("cobie_components", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del tipo */
  typeId: int("type_id").notNull().references(() => cobieTypes.id),
  /** ID del espacio donde se encuentra */
  spaceId: int("space_id").references(() => cobieSpaces.id),
  /** Nombre del componente */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Número de serie */
  serialNumber: varchar("serial_number", { length: 255 }),
  /** Fecha de instalación */
  installationDate: timestamp("installation_date"),
  /** Garantía fecha de inicio */
  warrantyStartDate: timestamp("warranty_start_date"),
  /** Código de barras */
  barCode: varchar("bar_code", { length: 255 }),
  /** Número de activo */
  assetIdentifier: varchar("asset_identifier", { length: 255 }),
  /** GUID del elemento IFC vinculado */
  ifcGuid: varchar("ifc_guid", { length: 255 }),
  /** ID del elemento IFC vinculado */
  ifcElementId: int("ifc_element_id").references(() => ifcElements.id),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieComponent = typeof cobieComponents.$inferSelect;
export type InsertCobieComponent = typeof cobieComponents.$inferInsert;

/**
 * Tabla de sistemas del edificio COBie
 */
export const cobieSystems = mysqlTable("cobie_systems", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del sistema */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Lista de componentes (nombres separados por coma) */
  componentNames: text("component_names"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieSystem = typeof cobieSystems.$inferSelect;
export type InsertCobieSystem = typeof cobieSystems.$inferInsert;

/**
 * Tabla de ensamblajes COBie
 */
export const cobieAssemblies = mysqlTable("cobie_assemblies", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del ensamblaje */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Tipo de ensamblaje */
  assemblyType: varchar("assembly_type", { length: 255 }),
  /** Nombre del componente padre */
  parentName: varchar("parent_name", { length: 255 }),
  /** Nombres de componentes hijos */
  childNames: text("child_names"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieAssembly = typeof cobieAssemblies.$inferSelect;
export type InsertCobieAssembly = typeof cobieAssemblies.$inferInsert;

/**
 * Tabla de conexiones entre componentes COBie
 */
export const cobieConnections = mysqlTable("cobie_connections", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre de la conexión */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Tipo de conexión */
  connectionType: varchar("connection_type", { length: 255 }),
  /** Nombre del componente 1 */
  component1: varchar("component1", { length: 255 }),
  /** Nombre del componente 2 */
  component2: varchar("component2", { length: 255 }),
  /** Puerto de realización en componente 1 */
  realizingElement1: varchar("realizing_element1", { length: 255 }),
  /** Puerto de realización en componente 2 */
  realizingElement2: varchar("realizing_element2", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieConnection = typeof cobieConnections.$inferSelect;
export type InsertCobieConnection = typeof cobieConnections.$inferInsert;

/**
 * Tabla de repuestos COBie
 */
export const cobieSpareParts = mysqlTable("cobie_spare_parts", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del tipo */
  typeId: int("type_id").notNull().references(() => cobieTypes.id),
  /** Nombre del repuesto */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Proveedores */
  suppliers: text("suppliers"),
  /** Número de parte */
  partNumber: varchar("part_number", { length: 255 }),
  /** Cantidad en stock */
  quantity: int("quantity"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieSparePart = typeof cobieSpareParts.$inferSelect;
export type InsertCobieSparePart = typeof cobieSpareParts.$inferInsert;

/**
 * Tabla de recursos/contactos COBie
 */
export const cobieResources = mysqlTable("cobie_resources", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del recurso/contacto */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Email */
  email: varchar("email", { length: 255 }),
  /** Teléfono */
  phone: varchar("phone", { length: 255 }),
  /** Departamento */
  department: varchar("department", { length: 255 }),
  /** Organización */
  organizationCode: varchar("organization_code", { length: 255 }),
  /** Dirección */
  street: varchar("street", { length: 255 }),
  /** Ciudad */
  city: varchar("city", { length: 255 }),
  /** Código postal */
  postalCode: varchar("postal_code", { length: 50 }),
  /** País */
  country: varchar("country", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieResource = typeof cobieResources.$inferSelect;
export type InsertCobieResource = typeof cobieResources.$inferInsert;

/**
 * Tabla de trabajos de mantenimiento COBie
 */
export const cobieJobs = mysqlTable("cobie_jobs", {
  id: int("id").autoincrement().primaryKey(),
  /** ID del tipo */
  typeId: int("type_id").notNull().references(() => cobieTypes.id),
  /** Nombre del trabajo */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Estado */
  status: varchar("status", { length: 255 }),
  /** Categoría de tarea */
  taskCategory: varchar("task_category", { length: 255 }),
  /** Frecuencia */
  frequency: varchar("frequency", { length: 255 }),
  /** Unidad de frecuencia */
  frequencyUnit: varchar("frequency_unit", { length: 50 }),
  /** Fecha de inicio */
  start: timestamp("start"),
  /** Duración de la tarea */
  taskDuration: varchar("task_duration", { length: 255 }),
  /** Unidad de duración */
  durationUnit: varchar("duration_unit", { length: 50 }),
  /** Recursos necesarios */
  resources: text("resources"),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieJob = typeof cobieJobs.$inferSelect;
export type InsertCobieJob = typeof cobieJobs.$inferInsert;

/**
 * Tabla de documentos asociados COBie
 */
export const cobieDocuments = mysqlTable("cobie_documents", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del documento */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Descripción */
  description: text("description"),
  /** Hoja de referencia (para qué entidad es el documento) */
  referenceSheet: varchar("reference_sheet", { length: 255 }),
  /** Nombre de la entidad referenciada */
  referenceName: varchar("reference_name", { length: 255 }),
  /** URL o ruta del documento */
  documentUrl: varchar("document_url", { length: 512 }),
  /** Directorio */
  directory: varchar("directory", { length: 512 }),
  /** Archivo */
  file: varchar("file", { length: 255 }),
  /** Atributos extendidos (JSON) */
  extAttributes: text("ext_attributes"),
});

export type CobieDocument = typeof cobieDocuments.$inferSelect;
export type InsertCobieDocument = typeof cobieDocuments.$inferInsert;

/**
 * Tabla de atributos extendidos COBie
 */
export const cobieAttributes = mysqlTable("cobie_attributes", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del atributo */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Hoja de referencia */
  sheetName: varchar("sheet_name", { length: 255 }),
  /** Nombre de la entidad referenciada */
  rowName: varchar("row_name", { length: 255 }),
  /** Valor del atributo */
  value: text("value"),
  /** Unidad */
  unit: varchar("unit", { length: 255 }),
  /** Valor permitido */
  allowedValues: text("allowed_values"),
  /** Descripción */
  description: text("description"),
});

export type CobieAttribute = typeof cobieAttributes.$inferSelect;
export type InsertCobieAttribute = typeof cobieAttributes.$inferInsert;

/**
 * Tabla de coordenadas espaciales COBie
 */
export const cobieCoordinates = mysqlTable("cobie_coordinates", {
  id: int("id").autoincrement().primaryKey(),
  /** ID de la instalación */
  facilityId: int("facility_id").notNull().references(() => cobieFacilities.id),
  /** Nombre del elemento */
  name: varchar("name", { length: 255 }).notNull(),
  /** Fecha de creación */
  createdOn: timestamp("created_on"),
  /** Creado por */
  createdBy: varchar("created_by", { length: 255 }),
  /** Categoría */
  category: varchar("category", { length: 255 }),
  /** Hoja de referencia */
  sheetName: varchar("sheet_name", { length: 255 }),
  /** Nombre de la entidad referenciada */
  rowName: varchar("row_name", { length: 255 }),
  /** Coordenada X */
  coordinateX: varchar("coordinate_x", { length: 255 }),
  /** Coordenada Y */
  coordinateY: varchar("coordinate_y", { length: 255 }),
  /** Coordenada Z */
  coordinateZ: varchar("coordinate_z", { length: 255 }),
  /** Dirección X del eje */
  axisX: varchar("axis_x", { length: 255 }),
  /** Dirección Y del eje */
  axisY: varchar("axis_y", { length: 255 }),
  /** Dirección Z del eje */
  axisZ: varchar("axis_z", { length: 255 }),
  /** Descripción */
  description: text("description"),
});

export type CobieCoordinate = typeof cobieCoordinates.$inferSelect;
export type InsertCobieCoordinate = typeof cobieCoordinates.$inferInsert;
