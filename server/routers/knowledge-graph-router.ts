/**
 * Knowledge Graph Router
 * 
 * tRPC procedures for Neo4j knowledge graph operations
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  importIfcModelToGraph,
  queryElementsByType,
  findConnectedElements,
  findShortestPath,
  getGraphStats,
  deleteModelFromGraph,
  executeCypherQuery,
  getDriver,
} from '../neo4j-service';
import { TRPCError } from '@trpc/server';

export const knowledgeGraphRouter = router({
  /**
   * Import IFC model into knowledge graph
   */
  importModel: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
        modelName: z.string(),
        elements: z.array(
          z.object({
            guid: z.string(),
            type: z.string(),
            name: z.string().optional(),
            properties: z.record(z.string(), z.any()),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available. Please check configuration.',
        });
      }

      try {
        const result = await importIfcModelToGraph(
          input.modelId,
          input.modelName,
          input.elements
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to import model to graph',
        });
      }
    }),

  /**
   * Query elements by type
   */
  queryByType: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
        type: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        return await queryElementsByType(input.modelId, input.type);
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to query elements',
        });
      }
    }),

  /**
   * Find connected elements
   */
  findConnected: protectedProcedure
    .input(
      z.object({
        guid: z.string(),
        maxDepth: z.number().min(1).max(5).default(2),
      })
    )
    .query(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        return await findConnectedElements(input.guid, input.maxDepth);
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to find connected elements',
        });
      }
    }),

  /**
   * Find shortest path between elements
   */
  findPath: protectedProcedure
    .input(
      z.object({
        startGuid: z.string(),
        endGuid: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        const path = await findShortestPath(input.startGuid, input.endGuid);
        if (!path) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No path found between elements',
          });
        }
        return path;
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to find path',
        });
      }
    }),

  /**
   * Get graph statistics
   */
  getStats: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
      })
    )
    .query(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        return await getGraphStats(input.modelId);
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get graph statistics',
        });
      }
    }),

  /**
   * Delete model from graph
   */
  deleteModel: protectedProcedure
    .input(
      z.object({
        modelId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        const deleted = await deleteModelFromGraph(input.modelId);
        return { deleted };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete model from graph',
        });
      }
    }),

  /**
   * Execute custom Cypher query (admin only)
   */
  executeQuery: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        params: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only allow admins to execute custom queries
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can execute custom queries',
        });
      }

      if (!getDriver()) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Neo4j is not available',
        });
      }

      try {
        const results = await executeCypherQuery(input.query, input.params);
        return results;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to execute query',
        });
      }
    }),

  /**
   * Check Neo4j connection status
   */
  checkConnection: protectedProcedure.query(() => {
    const driver = getDriver();
    return {
      connected: driver !== null,
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    };
  }),
});
