'use client'

import { useCallback, useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { usePreview } from "@/app/contexts/PreviewContext";
import ManageVideos from "./ManageVideos";
import SkeletonLoader from "@/app/components/Loader/Loader";
import DraggableGroup from "@/app/components/Group/DraggableGroup";
import AddNewGroupForm from "@/app/components/Group/AddNewGroupForm";

type ManageGroupTypes = {
  targetUserId: string | null;
  enabled: boolean;
}

const ManageGroups: React.FC<ManageGroupTypes> = ({ targetUserId, enabled = true }) => {
  const [groups, setGroups] = useState<GroupType[] | null>(null);
  const [initialGroups, setInitialGroups] = useState<GroupType[]>([]);

  const { triggerReload } = usePreview();

  useEffect(() => {
    const fetchGroups = async () => {
      const query = targetUserId ? `?type=videos&userId=${targetUserId}&isAdmin=true` : '?type=videos';
      
      const response = await fetch(`/api/groups${query}`, {
        method: 'GET'
      });
      const data = await response.json();

      setGroups(data);
      setInitialGroups(data);
    };

    fetchGroups();
  }, []);

  const handleAdd = (group: GroupType) => {
    const newGroup = { ...group, datas: [] };
    setGroups((prevGroups) => {
      if (!prevGroups)
        return [newGroup];
      return [...prevGroups, newGroup];
    })
  }

  const handleUpdate = async (props: { id: string; name?: string; enabled?: boolean; }) => {

    const response = await fetch('/api/groups', {
      method: 'PUT',
      body: JSON.stringify(props),
    });

    const result = await response.json();
    if (result.error) {
      console.log(result.error);
    } else {
      // console.log(result);
      setGroups((prevGroups) => {
        return prevGroups?.map((group) => (group.id === result.id ? result : group))!;
      })

      triggerReload();
    }
  }

  const handleDelete = async ({ id }: { id: string }) => {
    setGroups((prevGroups) => {
      if (!prevGroups) return prevGroups;
      return prevGroups.filter(group => group.id !== id);
    });

    const response = await fetch('/api/groups', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });

    const data = await response.json();
    if (data.error) {
      console.log("Failed to delete", data.error);
    }

    triggerReload();
  }

  const updateOrder = async (updatedVideos: any[]) => {
    const orderList = updatedVideos.map((video, index) => ({
      id: video.id,
      rank: index,
    }));

    const data = { table: "groups", datasToUpdate: orderList };

    // console.log(orderList);

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
  const moveGroup = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedVideos = Array.from(groups!);
      const [movedVideo] = updatedVideos.splice(fromIndex, 1);
      updatedVideos.splice(toIndex, 0, movedVideo);
      setGroups(updatedVideos);
      updateOrder(updatedVideos);
      setInitialGroups(updatedVideos);
    }, [groups]);

  if (!groups) {
    return (
      <>
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
      </>
    )
  }

  return (
    <div>
      <AddNewGroupForm onAdd={handleAdd} type="videos" targetUserId={targetUserId} enabled={enabled} />

      <DndProvider backend={HTML5Backend}>
        {groups && groups.map((group, index) => {
          return (
            <div key={group.id}>
              <DraggableGroup
                index={index}
                key={group.id}
                group={group}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                moveGroup={moveGroup}
                group_name="VIDEO_GROUP"
                enabled={enabled}
              />
              <ManageVideos
                itemType={index}
                group_id={group.id}
                fetchedVideos={group.datas!}
                enabled={enabled}
              />
              {(groups.length > (index + 1)) &&
                <hr className="my-8" />}
            </div>
          )
        })}
        {groups.length === 0 &&
          <div className='py-10 text-lg text-gray-400 text-center'>There is no group</div>}
      </DndProvider>
    </div>
  )
}

export default ManageGroups;