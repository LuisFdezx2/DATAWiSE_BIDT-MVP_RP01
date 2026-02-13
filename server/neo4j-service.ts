/**
 * Neo4j Knowledge Graph Service
 * 
 * Manages IFC element relationships in a graph database for advanced queries
 * and relationship discovery.
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';

// Neo4j connection configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

let driver: Driver | null = null;

/**
 * Initialize Neo4j driver
 */
export async function initializeNeo4j(): Promise<void> {
  try {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
      }
    );

    // Verify connectivity
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected successfully');

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('❌ Failed to connect to Neo4j:', error);
    driver = null;
  }
}

/**
 * Get Neo4j driver instance
 */
export function getDriver(): Driver | null {
  return driver;
}

/**
 * Get a new Neo4j session
 */
export function getSession(): Session {
  if (!driver) {
    throw new Error('Neo4j driver not initialized');
  }
  return driver.session();
}

/**
 * Close Neo4j driver
 */
export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('Neo4j connection closed');
  }
}

/**
 * Create indexes for common queries
 */
async function createIndexes(): Promise<void> {
  const session = getSession();
  try {
    // Index on IFC element GUID
    await session.run(`
      CREATE INDEX ifc_element_guid IF NOT EXISTS
      FOR (e:IfcElement)
      ON (e.guid)
    `);

    // Index on IFC element type
    await session.run(`
      CREATE INDEX ifc_element_type IF NOT EXISTS
      FOR (e:IfcElement)
      ON (e.type)
    `);

    // Index on model ID
    await session.run(`
      CREATE INDEX ifc_model_id IF NOT EXISTS
      FOR (m:IfcModel)
      ON (m.modelId)
    `);

    console.log('✅ Neo4j indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await session.close();
  }
}

/**
 * Import IFC model into knowledge graph
 */
export async function importIfcModelToGraph(
  modelId: number,
  modelName: string,
  elements: Array<{
    guid: string;
    type: string;
    name?: string;
    properties: Record<string, any>;
  }>
): Promise<{ nodesCreated: number; relationshipsCreated: number }> {
  const session = getSession();
  let nodesCreated = 0;
  let relationshipsCreated = 0;

  try {
    // Create model node
    await session.run(
      `
      MERGE (m:IfcModel {modelId: $modelId})
      SET m.name = $name, m.importedAt = datetime()
      `,
      { modelId, name: modelName }
    );
    nodesCreated++;

    // Create element nodes in batches
    const batchSize = 100;
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);

      const result = await session.run(
        `
        UNWIND $elements AS element
        MERGE (e:IfcElement {guid: element.guid})
        SET e.type = element.type,
            e.name = element.name,
            e.properties = element.properties,
            e.modelId = $modelId
        WITH e
        MATCH (m:IfcModel {modelId: $modelId})
        MERGE (e)-[:BELONGS_TO]->(m)
        RETURN count(e) as created
        `,
        { elements: batch, modelId }
      );

      const record = result.records[0];
      nodesCreated += record.get('created').toNumber();
    }

    // Create spatial relationships (e.g., CONTAINS for IfcSpace)
    const spatialResult = await session.run(
      `
      MATCH (space:IfcElement {modelId: $modelId})
      WHERE space.type = 'IfcSpace'
      MATCH (element:IfcElement {modelId: $modelId})
      WHERE element.type <> 'IfcSpace'
        AND element.properties.spaceGuid = space.guid
      MERGE (space)-[:CONTAINS]->(element)
      RETURN count(*) as relationships
      `,
      { modelId }
    );

    if (spatialResult.records.length > 0) {
      relationshipsCreated += spatialResult.records[0].get('relationships').toNumber();
    }

    // Create type relationships
    const typeResult = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})
      WHERE e.properties.typeGuid IS NOT NULL
      MATCH (t:IfcElement {modelId: $modelId, guid: e.properties.typeGuid})
      MERGE (e)-[:HAS_TYPE]->(t)
      RETURN count(*) as relationships
      `,
      { modelId }
    );

    if (typeResult.records.length > 0) {
      relationshipsCreated += typeResult.records[0].get('relationships').toNumber();
    }

    return { nodesCreated, relationshipsCreated };
  } finally {
    await session.close();
  }
}

/**
 * Query elements by type
 */
export async function queryElementsByType(
  modelId: number,
  type: string
): Promise<Array<{ guid: string; name: string; properties: any }>> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId, type: $type})
      RETURN e.guid as guid, e.name as name, e.properties as properties
      LIMIT 100
      `,
      { modelId, type }
    );

    return result.records.map(record => ({
      guid: record.get('guid'),
      name: record.get('name'),
      properties: record.get('properties'),
    }));
  } finally {
    await session.close();
  }
}

/**
 * Find elements connected to a specific element
 */
export async function findConnectedElements(
  guid: string,
  maxDepth: number = 2
): Promise<Array<{ guid: string; type: string; name: string; relationship: string; depth: number }>> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH path = (start:IfcElement {guid: $guid})-[r*1..${maxDepth}]-(connected:IfcElement)
      RETURN DISTINCT connected.guid as guid,
             connected.type as type,
             connected.name as name,
             type(relationships(path)[0]) as relationship,
             length(path) as depth
      ORDER BY depth, type
      LIMIT 50
      `,
      { guid }
    );

    return result.records.map(record => ({
      guid: record.get('guid'),
      type: record.get('type'),
      name: record.get('name'),
      relationship: record.get('relationship'),
      depth: record.get('depth').toNumber(),
    }));
  } finally {
    await session.close();
  }
}

/**
 * Find shortest path between two elements
 */
export async function findShortestPath(
  startGuid: string,
  endGuid: string
): Promise<Array<{ guid: string; type: string; name: string }> | null> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (start:IfcElement {guid: $startGuid}),
            (end:IfcElement {guid: $endGuid}),
            path = shortestPath((start)-[*]-(end))
      RETURN [node in nodes(path) | {
        guid: node.guid,
        type: node.type,
        name: node.name
      }] as path
      LIMIT 1
      `,
      { startGuid, endGuid }
    );

    if (result.records.length === 0) {
      return null;
    }

    return result.records[0].get('path');
  } finally {
    await session.close();
  }
}

/**
 * Get graph statistics for a model
 */
export async function getGraphStats(modelId: number): Promise<{
  totalNodes: number;
  totalRelationships: number;
  nodesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
}> {
  const session = getSession();
  try {
    // Count total nodes
    const nodesResult = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})
      RETURN count(e) as total
      `,
      { modelId }
    );
    const totalNodes = nodesResult.records[0].get('total').toNumber();

    // Count nodes by type
    const typeResult = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})
      RETURN e.type as type, count(e) as count
      ORDER BY count DESC
      `,
      { modelId }
    );
    const nodesByType: Record<string, number> = {};
    typeResult.records.forEach(record => {
      nodesByType[record.get('type')] = record.get('count').toNumber();
    });

    // Count total relationships
    const relsResult = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})-[r]-()
      RETURN count(r) as total
      `,
      { modelId }
    );
    const totalRelationships = relsResult.records[0].get('total').toNumber();

    // Count relationships by type
    const relTypeResult = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})-[r]-()
      RETURN type(r) as relType, count(r) as count
      ORDER BY count DESC
      `,
      { modelId }
    );
    const relationshipsByType: Record<string, number> = {};
    relTypeResult.records.forEach(record => {
      relationshipsByType[record.get('relType')] = record.get('count').toNumber();
    });

    return {
      totalNodes,
      totalRelationships,
      nodesByType,
      relationshipsByType,
    };
  } finally {
    await session.close();
  }
}

/**
 * Delete model from graph
 */
export async function deleteModelFromGraph(modelId: number): Promise<number> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (e:IfcElement {modelId: $modelId})
      DETACH DELETE e
      WITH count(*) as deleted
      MATCH (m:IfcModel {modelId: $modelId})
      DELETE m
      RETURN deleted
      `,
      { modelId }
    );

    return result.records[0].get('deleted').toNumber();
  } finally {
    await session.close();
  }
}

/**
 * Execute custom Cypher query
 */
export async function executeCypherQuery(
  query: string,
  params: Record<string, any> = {}
): Promise<any[]> {
  const session = getSession();
  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}

// Initialize on module load
initializeNeo4j().catch(console.error);

// Cleanup on process exit
process.on('SIGINT', async () => {
  await closeNeo4j();
  process.exit(0);
});
