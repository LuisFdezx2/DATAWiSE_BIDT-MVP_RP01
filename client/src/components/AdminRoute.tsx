import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Shield, AlertCircle } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Componente que protege rutas para que solo usuarios admin puedan acceder
 * Redirige a home si el usuario no es admin o no está autenticado
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7fb069] mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje de acceso denegado si no es admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
            <p className="text-gray-400">
              No tienes permisos de administrador para acceder a esta página.
            </p>
          </div>
          
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-red-300 font-medium mb-1">
                  Solo administradores
                </p>
                <p className="text-sm text-red-200">
                  Esta sección está restringida a usuarios con rol de administrador. 
                  Si crees que deberías tener acceso, contacta con el administrador del sistema.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Serás redirigido a la página principal en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  // Usuario es admin, renderizar contenido protegido
  return <>{children}</>;
}
