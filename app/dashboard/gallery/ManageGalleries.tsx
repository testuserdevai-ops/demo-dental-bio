'use client'
import { useCallback, useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import AddNewGallery from './AddNewGallery';
import SkeletonLoader from '@/app/components/Loader/Loader';
import GalleryCard from './components/GalleryCard';
import EditGalleryModal from './components/EditGalleryModal';
import { usePreview } from '@/app/contexts/PreviewContext';
import DraggableGeneralGalleryCard from './components/DraggableGeneralGalleryCard';
import EditGeneralGalleryModal from './components/EditGeneralGalleryModal';
import AddDentalGalleryModal from './components/AddDentalGalleryModal';
import AddGeneralGalleryModal from './components/AddGeneralGalleryModal';

const ItemType = {
  BLOG: "BLOG",
  GENERAL_GALLERY: "GENERAL_GALLERY"
}

function DraggableGalleryCard({
  gallery,
  index,
  onUpdate,
  onDelete,
  onEditItem,
  moveGallery,
  enabled
}: {
  gallery: GalleryType,
  index: number;
  onUpdate: any;
  onDelete: any;
  onEditItem: any;
  moveGallery: any;
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
        moveGallery(draggedItem.index, index);
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
      <GalleryCard
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEditItem={onEditItem}
        proAvailable={enabled}
        {...gallery}
      />
    </div>
  );
}


const ManageGalleries = ({ targetUserId, enabled = false }: { targetUserId: string | null, enabled?: boolean; }) => {
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(false);
  const [galleries, setGalleries] = useState<any[] | null>(null);
  const [initialGalleries, setInitialGalleries] = useState<any[] | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryType>({
    id: "",
    user_id: "",
    title: "",
    before_image_url: "",
    after_image_url: "",
    rank: 0,
    created_at: "",
  });
  const [generalGalleries, setGeneralGalleries] = useState<any[] | null>(null);
  const [isEditingGeneralOpen, setIsEditingGeneralOpen] = useState<boolean>(false);
  const [editingGeneralGallery, setEditingGeneralGallery] = useState<any>({
    id: '',
    user_id: '',
    title: '',
    image_url: '',
    rank: 0,
    enabled: true,
  });
  const [isDentalModalOpen, setIsDentalModalOpen] = useState<boolean>(false);
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState<boolean>(false);

  const { triggerReload } = usePreview();

  useEffect(() => {
    const fetchGalleries = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : '';

      const response = await fetch(`/api/galleries${query}`, {
        method: 'GET'
      });
      const data = await response.json();
      setGalleries(data);
      setInitialGalleries(data);
    };

    fetchGalleries();
  }, []);

  useEffect(() => {
    const fetchGeneralGalleries = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : '';
      const response = await fetch(`/api/general-galleries${query}`, { method: 'GET' });
      const data = await response.json();
      setGeneralGalleries(data);
    };
    fetchGeneralGalleries();
  }, [])

  const handleAdd = async (gallery: GalleryType) => {
    setGalleries((prevGalleries) => {
      if (!prevGalleries) return [gallery];
      return [...prevGalleries, gallery];
    })

    triggerReload();
  }

  const handleAddGeneral = async (gallery: any) => {
    setGeneralGalleries((prevGalleries) => {
      if (!prevGalleries) return [gallery];
      return [...prevGalleries, gallery];
    });
    triggerReload();
  }

  const handleEdit = async (gallery: GalleryType, before_image_file: File | null, after_image_file: File | null) => {
    if (before_image_file) {
      const before_image_url = await uploadImage(before_image_file);
      gallery = { ...gallery, before_image_url };
    }
    if (after_image_file) {
      const after_image_url = await uploadImage(after_image_file);
      gallery = { ...gallery, after_image_url };
    }

    const response = await fetch('/api/galleries', {
      method: 'PUT',
      body: JSON.stringify({ ...gallery }),
    });

    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      // console.log(result);
      setGalleries((prevGalleries) => {
        return prevGalleries?.map((gallery) => (gallery.id === result.id ? result : gallery))!;
      })

      setIsEditingOpen(false);

      triggerReload();
    }
  }

  const handleDelete = async (id: string) => {
    setGalleries((prevGalleries) => {
      if (!prevGalleries) return prevGalleries;
      return prevGalleries.filter(gallery => gallery.id !== id);
    });

    const response = await fetch('/api/galleries', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    if (data.error) {
      console.log("Failed to delete", data.error);
    }

    triggerReload();
  }

  const handleEditItem = async (id: string) => {
    await setEditingGallery(galleries?.at(galleries?.findIndex((gallery) => gallery.id === id)));
    setIsEditingOpen(true);
  }

  const handleEditGeneral = async (gallery: any, image_file: File | null) => {
    let updatedGallery = { ...gallery };
    if (image_file) {
      const image_url = await uploadImage(image_file);
      updatedGallery = { ...updatedGallery, image_url };
    }
    const response = await fetch('/api/general-galleries', {
      method: 'PUT',
      body: JSON.stringify(updatedGallery),
    });
    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      setGeneralGalleries((prev) => prev?.map((g) => (g.id === result.id ? result : g))!);
      setIsEditingGeneralOpen(false);
      triggerReload();
    }
  };

  const handleEditGeneralItem = (id: string) => {
    setEditingGeneralGallery(generalGalleries?.find((g) => g.id === id));
    setIsEditingGeneralOpen(true);
  };

  const handleDeleteGeneral = async (id: string) => {
    setGeneralGalleries((prev) => prev?.filter((g) => g.id !== id) || null);
    const response = await fetch('/api/general-galleries', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (data.error) {
      console.log('Failed to delete', data.error);
    }
    triggerReload();
  };

  const handleToggleGeneral = async (gallery: any) => {
    const response = await fetch('/api/general-galleries', {
      method: 'PUT',
      body: JSON.stringify(gallery),
    });
    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      setGeneralGalleries((prev) => prev?.map((g) => (g.id === result.id ? result : g))!);
      triggerReload();
    }
  };

  const uploadImage = async (image: File) => {
    const formData = new FormData();
    formData.append('bucket_name', 'gallery-images');
    formData.append('image', image);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    const result = await response.json();

    if (response.ok) {
      // console.log(`Image uploaded successfully! URL: ${result.publicUrl}`);
      return result.publicUrl;
    } else {
      console.log(`Error: ${result.error}`);
    }
  }

  const updateOrder = async (updatedGalleries: any[]) => {
    const orderList = updatedGalleries.map((gallery, index) => ({
      id: gallery.id,
      rank: index,
    }));

    const data = { table: "galleries", datasToUpdate: orderList };

    const response = await fetch('/api/update-order', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    const result = await response.json();

    if (response.ok) {
      console.log('update orders');

      triggerReload();
    } else {
      console.log(`Error: ${result.error}`)
    }
  }

  // Move treatment in the list
  const moveGallery = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedGalleries = Array.from(galleries!);
      const [movedGallery] = updatedGalleries.splice(fromIndex, 1);
      updatedGalleries.splice(toIndex, 0, movedGallery);
      setGalleries(updatedGalleries);

      updateOrder(updatedGalleries);
      setInitialGalleries(updatedGalleries);
    }, [galleries]);

  // General galleries drag-and-drop logic
  const updateGeneralOrder = async (updatedGalleries: any[]) => {
    const orderList = updatedGalleries.map((gallery, index) => ({
      id: gallery.id,
      rank: index,
    }));
    const data = { table: "general_galleries", datasToUpdate: orderList };
    const response = await fetch('/api/update-order', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      triggerReload();
    } else {
      console.log(`Error: ${result.error}`)
    }
  };
  const moveGeneralGallery = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!generalGalleries) return;
      const updatedGalleries = Array.from(generalGalleries);
      const [movedGallery] = updatedGalleries.splice(fromIndex, 1);
      updatedGalleries.splice(toIndex, 0, movedGallery);
      setGeneralGalleries(updatedGalleries);
      updateGeneralOrder(updatedGalleries);
    }, [generalGalleries]);

  return (
    <div className='py-10'>
      {/* Dental Gallery Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-lg font-semibold">Dental Gallery</h5>
          <button
            className="bg-primary-1 text-white px-4 py-2 rounded-full hover:bg-primary-2 transition"
            onClick={() => setIsDentalModalOpen(true)}
            disabled={!enabled}
          >
            Add Dental Gallery
          </button>
        </div>
        <DndProvider backend={HTML5Backend}>
          {galleries ?
            galleries.length > 0 ?
              galleries.map((gallery, index) => (
                <DraggableGalleryCard
                  key={gallery.id}
                  index={index}
                  gallery={gallery}
                  onUpdate={handleEdit}
                  onDelete={handleDelete}
                  onEditItem={handleEditItem}
                  moveGallery={moveGallery}
                  enabled={enabled}
                />
              )) :
              <div className='py-10 text-lg text-gray-400 text-center'>There is no dental gallery to show</div> :
            <SkeletonLoader />}
        </DndProvider>
        <EditGalleryModal
          isOpen={isEditingOpen}
          onClose={() => setIsEditingOpen(false)}
          onSubmit={handleEdit}
          {...editingGallery}
        />
        <AddDentalGalleryModal
          isOpen={isDentalModalOpen}
          onClose={() => setIsDentalModalOpen(false)}
          onSubmit={async (formData) => {
            await handleAdd(formData);
            setIsDentalModalOpen(false);
          }}
        />
      </div>

      {/* General Gallery Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-lg font-semibold">General Gallery</h5>
          <button
            className="bg-primary-1 text-white px-4 py-2 rounded-full hover:bg-primary-2 transition"
            onClick={() => setIsGeneralModalOpen(true)}
            disabled={!enabled}
          >
            Add General Gallery
          </button>
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <DndProvider backend={HTML5Backend}>
            {generalGalleries && generalGalleries.length > 0 ? (
              generalGalleries.map((gallery, idx) => (
                <DraggableGeneralGalleryCard
                  key={gallery.id || idx}
                  index={idx}
                  gallery={gallery}
                  moveGallery={moveGeneralGallery}
                  enabled={enabled}
                  onEditItem={handleEditGeneralItem}
                  onDelete={handleDeleteGeneral}
                  onUpdate={handleToggleGeneral}
                />
              ))
            ) : (
              <div className='py-10 text-lg text-gray-400 text-center w-full'>There is no general gallery to show</div>
            )}
          </DndProvider>
        </div>
        <EditGeneralGalleryModal
          isOpen={isEditingGeneralOpen}
          onClose={() => setIsEditingGeneralOpen(false)}
          onSubmit={handleEditGeneral}
          {...editingGeneralGallery}
        />
        <AddGeneralGalleryModal
          isOpen={isGeneralModalOpen}
          onClose={() => setIsGeneralModalOpen(false)}
          onSubmit={async (formData) => {
            await handleAddGeneral(formData);
            setIsGeneralModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};

export default ManageGalleries;
