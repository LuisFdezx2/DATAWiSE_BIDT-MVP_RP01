import { describe, it, expect, beforeEach } from 'vitest';
import { listAllUsers, updateUserRole } from './db';

/**
 * Pruebas unitarias para funcionalidades de administración de usuarios
 * 
 * Estas pruebas validan:
 * - Listado de todos los usuarios del sistema
 * - Actualización de roles de usuarios (admin/user)
 * - Manejo de casos edge y validaciones
 */

describe('Admin - User Management', () => {
  describe('listAllUsers', () => {
    it('should list all users in the system', async () => {
      const users = await listAllUsers();
      
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      
      // Verificar que cada usuario tiene los campos esperados
      if (users.length > 0) {
        const user = users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('createdAt');
        
        // Verificar que el rol es válido
        expect(['admin', 'user']).toContain(user.role);
      }
    });

    it('should return users ordered by creation date', async () => {
      const users = await listAllUsers();
      
      if (users.length > 1) {
        // Verificar que están ordenados por createdAt
        for (let i = 0; i < users.length - 1; i++) {
          const currentDate = new Date(users[i].createdAt).getTime();
          const nextDate = new Date(users[i + 1].createdAt).getTime();
          
          // Puede ser igual o mayor (orden ascendente por defecto en Drizzle)
          expect(currentDate).toBeLessThanOrEqual(nextDate);
        }
      }
    });
  });

  describe('updateUserRole', () => {
    it('should update user role to admin', async () => {
      const users = await listAllUsers();
      
      if (users.length > 0) {
        const testUser = users.find(u => u.role === 'user');
        
        if (testUser) {
          // Cambiar a admin
          await updateUserRole(testUser.id, 'admin');
          
          // Verificar el cambio
          const updatedUsers = await listAllUsers();
          const updatedUser = updatedUsers.find(u => u.id === testUser.id);
          
          expect(updatedUser?.role).toBe('admin');
          
          // Restaurar rol original
          await updateUserRole(testUser.id, 'user');
        }
      }
    });

    it('should update user role to user', async () => {
      const users = await listAllUsers();
      
      if (users.length > 0) {
        const testUser = users.find(u => u.role === 'admin');
        
        if (testUser) {
          // Cambiar a user
          await updateUserRole(testUser.id, 'user');
          
          // Verificar el cambio
          const updatedUsers = await listAllUsers();
          const updatedUser = updatedUsers.find(u => u.id === testUser.id);
          
          expect(updatedUser?.role).toBe('user');
          
          // Restaurar rol original
          await updateUserRole(testUser.id, 'admin');
        }
      }
    });

    it('should handle role update for non-existent user gracefully', async () => {
      // ID que probablemente no existe
      const nonExistentId = 999999;
      
      // No debería lanzar error, solo no actualizar nada
      await expect(updateUserRole(nonExistentId, 'admin')).resolves.not.toThrow();
    });

    it('should accept valid role values', async () => {
      const users = await listAllUsers();
      
      if (users.length > 0) {
        const testUser = users[0];
        const originalRole = testUser.role;
        
        // Probar ambos roles válidos
        await updateUserRole(testUser.id, 'admin');
        await updateUserRole(testUser.id, 'user');
        
        // Restaurar rol original
        await updateUserRole(testUser.id, originalRole);
      }
    });
  });

  describe('Role validation', () => {
    it('should only allow admin or user roles', async () => {
      const users = await listAllUsers();
      
      users.forEach(user => {
        expect(['admin', 'user']).toContain(user.role);
      });
    });

    it('should have at least one admin user in the system', async () => {
      const users = await listAllUsers();
      const adminUsers = users.filter(u => u.role === 'admin');
      
      // Debería haber al menos un admin (el propietario del proyecto)
      expect(adminUsers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('User data integrity', () => {
    it('should have unique user IDs', async () => {
      const users = await listAllUsers();
      const ids = users.map(u => u.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have unique user emails', async () => {
      const users = await listAllUsers();
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      
      expect(emails.length).toBe(uniqueEmails.size);
    });

    it('should have valid email format', async () => {
      const users = await listAllUsers();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      users.forEach(user => {
        expect(emailRegex.test(user.email)).toBe(true);
      });
    });

    it('should have non-empty names', async () => {
      const users = await listAllUsers();
      
      users.forEach(user => {
        expect(user.name).toBeTruthy();
        expect(user.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid creation dates', async () => {
      const users = await listAllUsers();
      
      users.forEach(user => {
        const date = new Date(user.createdAt);
        expect(date.getTime()).not.toBeNaN();
        
        // La fecha no debería ser en el futuro
        expect(date.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});
