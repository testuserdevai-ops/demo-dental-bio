"use client";
import { useCallback, useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import SkeletonLoader from "@/app/components/Loader/SkeletonLoader";
import { usePreview } from "@/app/contexts/PreviewContext";
import InvidualProductCard from "./InvidualProductCard";
import AddIndividualProduct from "./AddIndividualProduct";
import AddIndividualProductModal from "./AddIndividualProductModal";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useUppyWithSupabase } from "@/utils/supabase/useUppyWithSupabase";
import { apiClient } from "@/services/apiClient";

function DraggableProductCard({
  product,
  itemType,
  index,
  onUpdate,
  onDelete,
  onEditItem,
  moveProduct,
  enabled,
}: {
  product: ProductType;
  itemType: number;
  index: number;
  onUpdate: any;
  onDelete: any;
  onEditItem: any;
  moveProduct: any;
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
        moveProduct(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  return (
    <div
      ref={
        enabled
          ? (node) => {
              if (node) ref(node);
              drop(node);
            }
          : undefined
      }
    >
      <InvidualProductCard
        onUpdate={onUpdate}
        onDelete={onDelete}
        onEditItem={onEditItem}
        proAvailable={enabled}
        {...product}
      />
    </div>
  );
}

const ManageIndividualProducts = ({
  targetUserId,
  enabled = true,
}: {
  targetUserId: string | null;
  enabled: boolean;
}) => {
  const [itemType] = useState<number>(1);
  const [isEditingOpen, setIsEditingOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<any[] | null>(null);
  const [initialProducts, setInitialProducts] = useState<any[] | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductType>({
    id: "",
    name: "",
    link: "",
    platform: "",
    price: "",
    currency: "GBP(£)",
    enabled: true,
    rank: 0,
  });

  const { triggerReload } = usePreview();
  const { uploadFile } = useUppyWithSupabase({ bucketName: "product-images" });

  useEffect(() => {
    const fetchIndividualProducts = async () => {
      const query = targetUserId ? `?userId=${targetUserId}&isAdmin=true` : "";

      const data = await apiClient.get(`/api/individual-products${query}`);

      setProducts(data);
      setInitialProducts(data);
    };

    fetchIndividualProducts();
  }, []);

  const handleAdd = async (product: ProductType) => {
    setProducts((prevProducts) => {
      if (!prevProducts) return [product];
      return [...prevProducts, product];
    });

    triggerReload();
  };

  const handleEdit = async (product: ProductType, image: File | null) => {
    const image_url = image ? (await uploadFile(image)) || "" : "";

    try {
      const result = await apiClient.put("/api/individual-products", {
        ...product,
        image_url,
      });
      // console.log(result);
      setProducts((prevProducts) => {
        return prevProducts?.map((product) =>
          product.id === result.id ? result : product,
        )!;
      });
    } catch (error: any) {
      console.log(error.message);
    }
    setIsEditingOpen(false);
    triggerReload();
  };

  const handleDelete = async (id: string) => {
    setProducts((prevProducts) => {
      if (!prevProducts) return prevProducts;
      return prevProducts.filter((product) => product.id !== id);
    });

    try {
      await apiClient.delete("/api/individual-products", { id });
    } catch (error: any) {
      console.log("Failed to delete", error.message);
    }

    triggerReload();
  };

  const handleEditItem = async (id: string) => {
    await setEditingProduct(
      products?.at(products?.findIndex((product) => product.id === id)),
    );
    setIsEditingOpen(true);
  };

  const updateOrder = async (updatedProducts: any[]) => {
    const orderList = updatedProducts.map((product, index) => ({
      id: product.id,
      rank: index,
    }));

    const data = { table: "products", datasToUpdate: orderList };

    try {
      await apiClient.post("/api/update-order", data);
      console.log("update orders");
      triggerReload();
    } catch (error: any) {
      console.log(`Error: ${error.message}`);
    }
  };

  // Move treatment in the list
  const moveProduct = useCallback(
    (fromIndex: number, toIndex: number) => {
      const updatedProducts = Array.from(products!);
      const [movedProduct] = updatedProducts.splice(fromIndex, 1);
      updatedProducts.splice(toIndex, 0, movedProduct);
      setProducts(updatedProducts);

      updateOrder(updatedProducts);
      setInitialProducts(updatedProducts);
    },
    [products],
  );

  return (
    <div className="my-4">
      <h2 className="text-lg font-semibold text-dark mb-3">My Products</h2>

      <DndProvider backend={HTML5Backend}>
        {products ? (
          products.length > 0 ? (
            products.map((product, index) => (
              <DraggableProductCard
                key={product.id}
                index={index}
                product={product}
                itemType={itemType}
                onUpdate={handleEdit}
                onDelete={handleDelete}
                onEditItem={handleEditItem}
                moveProduct={moveProduct}
                enabled={enabled}
              />
            ))
          ) : (
            <div className="py-10 text-lg text-gray-400 text-center">
              There is no product to show
            </div>
          )
        ) : (
          <SkeletonLoader />
        )}
      </DndProvider>

      <div className="flex justify-end mt-6">
        <AddIndividualProduct
          targetUserId={targetUserId!}
          onAdd={handleAdd}
          enabled={enabled}
        />
      </div>

      <AddIndividualProductModal
        isOpen={isEditingOpen}
        onClose={() => setIsEditingOpen(false)}
        onSubmit={handleEdit}
        {...editingProduct}
      />
    </div>
  );
};

export default ManageIndividualProducts;
