import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2 } from 'lucide-react';
import { Comment, useComments } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    const { error } = await addComment(newComment.trim());
    setSubmitting(false);

    if (error) {
      toast.error('Failed to add comment');
    } else {
      setNewComment('');
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await deleteComment(commentId);
    if (error) {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px] resize-none"
              maxLength={500}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newComment.trim() || submitting}
              className="flex-shrink-0"
            >
              {submitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-center text-muted-foreground py-4">
          <Link to="/login" className="text-primary hover:underline">Sign in</Link> to comment
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentCard 
              key={comment.id} 
              comment={comment} 
              onDelete={handleDelete}
              isOwner={user?.id === comment.user_id}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: Comment;
  onDelete: (id: string) => void;
  isOwner: boolean;
}

function CommentCard({ comment, onDelete, isOwner }: CommentCardProps) {
  return (
    <div className="flex gap-3 p-4 bg-secondary/50 rounded-lg animate-fade-in">
      <Link to={`/profile/${comment.user_id}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profiles.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {comment.profiles.display_name?.[0] || comment.profiles.username[0]}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Link 
            to={`/profile/${comment.user_id}`}
            className="font-medium text-sm hover:text-primary transition-colors"
          >
            {comment.profiles.display_name || comment.profiles.username}
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground mt-1">{comment.content}</p>
      </div>
    </div>
  );
}
