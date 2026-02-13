import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Página de administración de usuarios
 * Solo accesible para usuarios con rol 'admin'
 * Permite listar todos los usuarios y cambiar sus roles
 */
export default function AdminUsers() {

  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  // Query para obtener lista de usuarios
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();

  // Mutation para cambiar rol de usuario
  const updateRoleMutation = trpc.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Rol actualizado', {
        description: 'El rol del usuario ha sido actualizado exitosamente.',
      });
      refetch();
      setProcessingUserId(null);
    },
    onError: (error) => {
      toast.error('Error al actualizar rol', {
        description: error.message || 'No se pudo actualizar el rol del usuario.',
      });
      setProcessingUserId(null);
    },
  });

  const handleToggleRole = async (userId: number, currentRole: 'admin' | 'user') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    setProcessingUserId(userId);
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7fb069]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-[#7fb069]" />
            <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
          </div>
          <p className="text-gray-400">
            Gestiona los roles de los usuarios del sistema. Los administradores tienen acceso completo a todas las funcionalidades.
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a1f2e] border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Total de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{users?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1f2e] border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Administradores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#7fb069]">
                {users?.filter(u => u.role === 'admin').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1f2e] border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Usuarios Estándar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {users?.filter(u => u.role === 'user').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de usuarios */}
        <Card className="bg-[#1a1f2e] border-gray-700">
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription className="text-gray-400">
              Haz clic en los botones para cambiar el rol de cada usuario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!users || users.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay usuarios registrados en el sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Nombre</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Rol Actual</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Fecha de Registro</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800 hover:bg-[#252a3a] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-300">{user.id}</td>
                        <td className="py-3 px-4 text-sm text-white font-medium">{user.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-300">{user.email}</td>
                        <td className="py-3 px-4">
                          {user.role === 'admin' ? (
                            <Badge className="bg-[#7fb069] text-white hover:bg-[#6a9557]">
                              <Shield className="w-3 h-3 mr-1" />
                              Administrador
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              <User className="w-3 h-3 mr-1" />
                              Usuario
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(user.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant={user.role === 'admin' ? 'outline' : 'default'}
                            className={
                              user.role === 'admin'
                                ? 'border-gray-600 text-gray-300 hover:bg-[#252a3a]'
                                : 'bg-[#7fb069] hover:bg-[#6a9557] text-white'
                            }
                            onClick={() => handleToggleRole(user.id, user.role)}
                            disabled={processingUserId === user.id}
                          >
                            {processingUserId === user.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : user.role === 'admin' ? (
                              <>
                                <AlertCircle className="w-4 h-4 mr-1" />
                                Degradar a Usuario
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Promover a Admin
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nota informativa */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium mb-1">Nota importante</p>
              <p className="text-sm text-blue-200">
                Los administradores no pueden degradarse a sí mismos. Si necesitas cambiar tu propio rol, 
                solicita a otro administrador que lo haga por ti.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
