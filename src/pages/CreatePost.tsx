import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, X } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

const postSchema = z.object({
  content: z.string()
    .min(1, 'Post cannot be empty')
    .max(500, 'Post must be less than 500 characters'),
  image_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

export function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPost } = usePosts();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = postSchema.safeParse({
      content,
      image_url: imageUrl,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);

    const { error } = await createPost(content, imageUrl || undefined);

    setSubmitting(false);

    if (error) {
      toast.error('Failed to create post');
    } else {
      toast.success('Post created!');
      navigate('/');
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card rounded-xl p-6 shadow-soft">
          <h1 className="font-display text-2xl font-bold text-foreground mb-6">
            Create Post
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">What's on your mind?</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`min-h-[150px] resize-none ${errors.content ? 'border-destructive' : ''}`}
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                {errors.content && (
                  <p className="text-sm text-destructive">{errors.content}</p>
                )}
                <p className="text-xs text-muted-foreground ml-auto">
                  {content.length}/500
                </p>
              </div>
            </div>

            {/* Image URL */}
            {showImageInput ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="image_url">Image URL (optional)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setShowImageInput(false);
                      setImageUrl('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className={errors.image_url ? 'border-destructive' : ''}
                />
                {errors.image_url && (
                  <p className="text-sm text-destructive">{errors.image_url}</p>
                )}

                {/* Image Preview */}
                {imageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setShowImageInput(true)}
              >
                <Image className="h-4 w-4" />
                Add Image
              </Button>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={submitting || !content.trim()}
              >
                {submitting ? <Spinner className="h-4 w-4" /> : 'Post'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
