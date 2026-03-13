'use client'
import { useCallback, useEffect, useState } from 'react';
import { useDrag, useDrop } from "react-dnd";
import SkeletonLoader from '@/app/components/Loader/SkeletonLoader';
import { usePreview } from '@/app/contexts/PreviewContext';
import VideoCard from '../components/VideoCard';
import AddNewVideo from './AddNewVideo';
import AddVideoModal from '../components/AddVideoModal';
import { apiClient } from '@/services/apiClient';

function DraggableVideoCard({
  video,
  itemType,
  index,
  onUpdate,
  onDelete,
  onEditItem,
  moveVideo,
  enabled
}: {
  video: VideoType,
  itemType: number;
  index: number;
  onUpdate: any;
  onDelete: any;
  onEditItem: any;
  moveVideo: any;
  enabled: boolean;
}) {
  const [, ref] = useDrag({
    type: "ItemType.BLOG" + itemType,
    item: { index },
  });

  const [, drop] = useDrop({
    accept: "ItemType.BLOG" + itemType,
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveVideo(draggedItem.index, index);
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
      <VideoCard
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEditItem={onEditItem}
        proAvailable={enabled}
        {...video}
      />
    </div>
  );
}


const ManageVideos = ({
  itemType,
  group_id,
  fetchedVideos,
  enabled = true
}: {
  itemType: number;
  group_id: string;
  fetchedVideos: VideoType[];
  enabled: boolean;
}) => {
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(false);
  const [videos, setVideos] = useState<any[] | null>(null);
  const [initialVideos, setInitialVideos] = useState<any[] | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoType>({
    id: "",
    group_id,
    title: "",
    link: "",
    enabled: true,
    rank: 0,
  });

  const { triggerReload } = usePreview();

  useEffect(() => {
    setVideos(fetchedVideos);
    setInitialVideos(fetchedVideos);

  }, [fetchedVideos]);

  const handleAdd = async (video: VideoType) => {
    setVideos((prevVideos) => {
      if (!prevVideos) return [video];
      return [...prevVideos, video];
    })

    triggerReload();
  }

  const handleEdit = async (video: VideoType) => {
    try {
      const result = await apiClient.put('/api/videos', { ...video });
      setVideos((prevVideos) => {
        return prevVideos?.map((video) => (video.id === result.id ? result : video))!;
      })
    } catch (error: any) {
      console.log(error.message);
    }
    setIsEditingOpen(false);
    triggerReload();
  }

  const handleDelete = async (id: string) => {
    setVideos((prevVideos) => {
      if (!prevVideos) return prevVideos;
      return prevVideos.filter(video => video.id !== id);
    });

    try {
      await apiClient.delete('/api/videos', { id });
    } catch (error: any) {
      console.log("Failed to delete", error.message);
    }

    triggerReload();
  }

  const handleEditItem = async (id: string) => {
    await setEditingVideo(videos?.at(videos?.findIndex((video) => video.id === id)));
    setIsEditingOpen(true);
  }

  const updateOrder = async (updatedVideos: any[]) => {
    const orderList = updatedVideos.map((video, index) => ({
      id: video.id,
      rank: index,
    }));

    const data = { table: "videos", datasToUpdate: orderList };

    // console.log(orderList);

    try {
      await apiClient.post('/api/update-order', data);
      console.log('update orders');
      triggerReload();
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  }

  // Move treatment in the list
  const moveVideo = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedVideos = Array.from(videos!);
      const [movedVideo] = updatedVideos.splice(fromIndex, 1);
      updatedVideos.splice(toIndex, 0, movedVideo);
      setVideos(updatedVideos);

      updateOrder(updatedVideos);
      setInitialVideos(updatedVideos);
    }, [videos]);

  return (
    <div className='mb-4'>
      {/* <DndProvider backend={HTML5Backend}> */}
      {videos ?
        videos.length > 0 ?
          videos.map((video, index) => (
            <DraggableVideoCard
              key={video.id}
              index={index}
              video={video}
              itemType={itemType}
              onUpdate={handleEdit}
              onDelete={handleDelete}
              onEditItem={handleEditItem}
              moveVideo={moveVideo}
              enabled={enabled}
            />
          )) :
          <div className='pb-10 text-lg text-gray-400 text-center'>There is no video to show</div> :
        <SkeletonLoader />}
      {/* </DndProvider> */}

      <div className="flex justify-end mt-6">
        <AddNewVideo group_id={group_id} onAdd={handleAdd} />
      </div>

      <AddVideoModal
        group_id={group_id}
        isOpen={isEditingOpen}
        onClose={() => setIsEditingOpen(false)}
        onSubmit={handleEdit}
        {...editingVideo}
      />
    </div>
  );
};

export default ManageVideos;
