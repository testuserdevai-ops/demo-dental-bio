"use client";

import BlogImage from "@/app/components/Image/BlogImage";
import { formatCurrency } from "@/utils/functions/formatCurrency";
import { TrackedLink } from "@/app/components/analytics/TrackedAction";
import { useState } from "react";

type ProductItemProps = {
  product: ProductType | IndividualProductType;
  position?: number;
};

export default function ProductItem({ product, position }: ProductItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TrackedLink
      href={product.link!}
      target="_blank"
      className="block w-1/2 sm:w-1/3 p-2 text-center text-xs sm:text-sm cursor-pointer no-underline"
      rel="noopener noreferrer"
      analytics={{
        section: "shop",
        position,
        action: { type: "product_click", productId: product.id! },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BlogImage
        className="aspect-square rounded-xl mb-[10px]"
        src={product.image_url!}
      />
      <div className="px-3">
        <div
          className={`truncate font-medium transition-all duration-300 ease-in-out ${isHovered ? "text-primary-1" : "text-black"}`}
        >
          {product.name}
        </div>
        <div className="truncate font-medium text-gray-500">
          {product.platform}
        </div>
        <div className="truncate font-medium text-gray-500">
          {formatCurrency(product.currency!)}
          {product.price}
        </div>
      </div>
    </TrackedLink>
  );
}
