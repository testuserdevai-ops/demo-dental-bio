'use client'
import { useCallback, useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import AddNewReview from './AddNewReview';
import SkeletonLoader from '@/app/components/Loader/SkeletonLoader';
import { useFormStatus } from 'react-dom';
import { usePreview } from '@/app/contexts/PreviewContext';
import ReviewCard from './components/ReviewCard';
import AddReviewModal from './components/AddReviewModal';
import LabeledInput from '../components/LabeledInput';
import FullRoundedButton from '@/app/components/Button/FullRoundedButton';
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { apiClient } from '@/services/apiClient';

const ItemType = {
  BLOG: "BLOG"
}

function DraggableReviewCard({
  review,
  index,
  onUpdate,
  onDelete,
  onEditItem,
  moveReview,
  enabled,
}: {
  review: ReviewType,
  index: number;
  onUpdate: any;
  onDelete: any;
  onEditItem: any;
  moveReview: any;
  enabled: boolean;
}) {
  const [, ref] = useDrag({
    type: ItemType.BLOG,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: ItemType.BLOG,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveReview(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={enabled ? (node) => {
        if (node) ref(node);
        drop(node);
      } : undefined}
    >
      <ReviewCard
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEditItem={onEditItem}
        proAvailable={enabled}
        {...review}
      />
    </div>
  );
}


const ManageReviews = ({ targetUserId, enabled = false }: { targetUserId: string | null; enabled: boolean; }) => {
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [initialReviews, setInitialReviews] = useState<any[] | null>(null);
  const [externalLink, setExternalLink] = useState<string>("");
  const [externalLinkId, setExternalLinkId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<ReviewType>({
    id: "",
    user_id: "",
    reviewer_name: "",
    content: "",
    stars: 5,
    image_url: "",
    platform: "",
    rank: 0,
    enabled: true,
    created_at: "",
  });

  const { triggerReload } = usePreview();
  const { uploadFile } = useUppyWithSupabase({ bucketName: 'review-images' });
  const domainConfig = useDomainConfig();
  const status = useFormStatus();

  useEffect(() => {
    const fetchReviews = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : "";

      const data = await apiClient.get(`/api/reviews${query}`);
      setReviews(data);
      setInitialReviews(data);
    };

    fetchReviews();
  }, [targetUserId]);

  useEffect(() => {
    const fetchExternalReviews = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : "";

      const data = await apiClient.get(`/api/external-review-pages${query}`);
      if (data.length) {
        setExternalLink(data[0].link);
        setExternalLinkId(data[0].id);
      }
    };

    fetchExternalReviews();
  }, []);

  const handleAdd = async (review: ReviewType) => {
    setReviews((prevReviews) => {
      if (!prevReviews) return [review];
      return [...prevReviews, review];
    })

    triggerReload();
  }

  const handleEdit = async (review: ReviewType, image_file: File | null) => {
    const image_url = image_file ? ((await uploadFile(image_file)) || review.image_url) : review.image_url;

    try {
      const result = await apiClient.put('/api/reviews', { ...review, image_url });
      // console.log(result);
      setReviews((prevReviews) => {
        return prevReviews?.map((review) => (review.id === result.id ? result : review))!;
      })
    } catch (error: any) {
      console.log(error.message);
    }
    setIsEditingOpen(false);
    triggerReload();
  }

  const handleDelete = async (id: string) => {
    setReviews((prevReviews) => {
      if (!prevReviews) return prevReviews;
      return prevReviews.filter(review => review.id !== id);
    });

    try {
      await apiClient.delete('/api/reviews', { id });
    } catch (error: any) {
      console.log("Failed to delete", error.message);
    }

    triggerReload();
  }

  const handleEditItem = async (id: string) => {
    await setEditingReview(reviews?.at(reviews?.findIndex((review) => review.id === id)));
    setIsEditingOpen(true);
  }

  const handleExternalReviewPageSave = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const body = { id: externalLinkId, link: externalLink };
      if (externalLinkId) {
        await apiClient.put('/api/external-review-pages', body);
      } else {
        await apiClient.post('/api/external-review-pages', body);
      }
      triggerReload();
    } catch (error: any) {
      console.log("Failed to Save External Link", error.message);
    }
    setIsLoading(false);
  }

  const updateOrder = async (updatedReviews: any[]) => {
    const orderList = updatedReviews.map((review, index) => ({
      id: review.id,
      rank: index,
    }));

    const data = { table: "reviews", datasToUpdate: orderList };

    try {
      await apiClient.post('/api/update-order', data);
      console.log('update orders');
      triggerReload();
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }

  // Move treatment in the list
  const moveReview = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedReviews = Array.from(reviews!);
      const [movedReview] = updatedReviews.splice(fromIndex, 1);
      updatedReviews.splice(toIndex, 0, movedReview);
      setReviews(updatedReviews);

      updateOrder(updatedReviews);
      setInitialReviews(updatedReviews);
    }, [reviews]);

  return (
    <div className='py-4'>
      <DndProvider backend={HTML5Backend}>
        {reviews ?
          reviews.length > 0 ?
            reviews.map((review, index) => (
              <DraggableReviewCard
                key={review.id}
                index={index}
                review={review}
                onUpdate={handleEdit}
                onDelete={handleDelete}
                onEditItem={handleEditItem}
                moveReview={moveReview}
                enabled={enabled}
              />
            )) :
            <div className='py-10 text-lg text-gray-400 text-center'>There is no review to show</div> :
          <SkeletonLoader />}
      </DndProvider>

      <div className="flex justify-end mt-6">
        <AddNewReview onAdd={handleAdd} targetUserId={targetUserId} enabled={enabled} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-dark text-start w-full mt-6 mb-0">
          External Reviews Page
        </h2>

        <div className="text-sm text-gray-500 my-1">Insert the URL of your reviews page here (e.g Google Reviews) if you want your {domainConfig.brandName} visitors to view all your reviews.</div>
        <form onSubmit={handleExternalReviewPageSave} className='flex-col-gap'>
          <LabeledInput
            label="External Reviews Page (optional)"
            name="external_link"
            value={externalLink}
            onChange={e => setExternalLink(e.target.value)}
            disabled={!enabled}
          />
          <div className='flex justify-end'>
            <FullRoundedButton isLoading={isLoading} type='submit' disabled={!enabled}> Save</FullRoundedButton>
          </div>
        </form>
      </div>

      <AddReviewModal
        isOpen={isEditingOpen}
        onClose={() => setIsEditingOpen(false)}
        onEdit={handleEdit}
        {...editingReview}
      />
    </div>
  );
};

export default ManageReviews;
