import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Star, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import { useProductReviews, ProductReview } from '@/hooks/useProductReviews';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ProductReviewsProps {
  productId: string;
  storefrontProductId?: string;
}

const StarRating: React.FC<{
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}> = ({ rating, onRatingChange, size = 'md', interactive = false }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110"
          )}
          onClick={() => interactive && onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              (hoverRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewCard: React.FC<{ review: ProductReview }> = ({ review }) => {
  return (
    <Card className="bg-gray-50 border-gray-100 rounded-2xl">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
              {review.customer_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {review.customer_name}
                </span>
                {review.is_verified_purchase && (
                  <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {format(new Date(review.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            <StarRating rating={review.rating} size="sm" />
            {review.review_text && (
              <p className="text-gray-600 text-sm leading-relaxed mt-2">
                {review.review_text}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  storefrontProductId,
}) => {
  const {
    reviews,
    isLoading,
    averageRating,
    totalReviews,
    ratingCounts,
    submitReview,
    isSubmitting,
  } = useProductReviews(productId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    rating: 0,
    reviewText: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.rating === 0) return;

    submitReview({
      product_id: productId,
      storefront_product_id: storefrontProductId,
      customer_name: formData.customerName,
      customer_email: formData.customerEmail,
      rating: formData.rating,
      review_text: formData.reviewText || undefined,
    });

    setFormData({ customerName: '', customerEmail: '', rating: 0, reviewText: '' });
    setIsDialogOpen(false);
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-gray-900" />
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-full">
              <Star className="w-4 h-4" />
              Write a Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Write a Review</DialogTitle>
              <DialogDescription className="text-gray-500">
                Share your experience with this product
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Your Rating *</label>
                <StarRating
                  rating={formData.rating}
                  onRatingChange={(rating) => setFormData({ ...formData, rating })}
                  size="lg"
                  interactive
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Your Name *</label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter your name"
                  required
                  className="border-gray-200 focus:border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Your Email *</label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Enter your email"
                  required
                  className="border-gray-200 focus:border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Your Review (Optional)</label>
                <Textarea
                  value={formData.reviewText}
                  onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                  placeholder="Share your thoughts about this product..."
                  rows={4}
                  className="border-gray-200 focus:border-gray-300"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isSubmitting || formData.rating === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rating Summary */}
      <Card className="bg-white border-gray-100 rounded-2xl">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <span className="text-5xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
                <div>
                  <StarRating rating={Math.round(averageRating)} size="md" />
                  <p className="text-sm text-gray-500 mt-1">
                    Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingCounts[star] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-8">
                      {star} ★
                    </span>
                    <Progress value={percentage} className="h-2 flex-1 bg-gray-100" />
                    <span className="text-sm text-gray-500 w-8">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-gray-100" />

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <Card className="bg-gray-50 border-gray-100 rounded-2xl">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
            <p className="text-gray-500 text-sm">
              Be the first to review this product!
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
};
