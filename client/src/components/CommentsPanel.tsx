import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { MessageSquare, CheckCircle, Send } from 'lucide-react';

interface CommentsPanelProps {
  elementId?: number;
  modelId?: number;
}

export function CommentsPanel({ elementId, modelId }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  
  const { data: comments, isLoading, refetch } = trpc.comments.list.useQuery(
    { elementId: elementId!, modelId: modelId! },
    { enabled: elementId !== undefined && modelId !== undefined }
  );

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment('');
      refetch();
    },
  });

  const resolveMutation = trpc.comments.resolve.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim() || !elementId || !modelId) return;
    
    createMutation.mutate({
      elementId,
      modelId,
      content: newComment,
    });
  };

  if (!elementId || !modelId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentarios
          </CardTitle>
          <CardDescription className="text-xs">
            Selecciona un elemento para ver comentarios
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const unresolvedCount = comments?.filter(c => !c.resolved).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentarios
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {unresolvedCount} pendiente{unresolvedCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Elemento ID: {elementId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario de nuevo comentario */}
        <div className="space-y-2">
          <Textarea
            placeholder="Escribe un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-sm min-h-[80px]"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
            className="w-full"
          >
            <Send className="h-3 w-3 mr-2" />
            Enviar comentario
          </Button>
        </div>

        {/* Lista de comentarios */}
        {isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Cargando comentarios...
          </p>
        )}

        {comments && comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No hay comentarios aún
          </p>
        )}

        {comments && comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.resolved ? 'bg-muted/50 opacity-60' : 'bg-background'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{comment.userName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                  {comment.resolved && (
                    <Badge variant="outline" className="text-[10px]">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resuelto
                    </Badge>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap">{comment.content}</p>
                {!comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveMutation.mutate({ id: comment.id })}
                    disabled={resolveMutation.isPending}
                    className="mt-2 h-7 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Marcar como resuelto
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
