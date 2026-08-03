import { useNavbar } from "@/app/contexts/NavbarContext";
import ProductItem from "./Basic/ProductItem";
import { useEffect } from "react";

type IndividualProductListProps = {
  products: IndividualProductType[];
};

export default function IndividualProductList({
  products,
}: IndividualProductListProps) {
  const { setNavItemState } = useNavbar();

  useEffect(() => {
    if (products.length > 0) {
      setNavItemState("Shop", true);
    }
  }, [products]);

  return (
    <>
      {products.length > 0 ? (
        <>
          {products.map((product) => (
            <ProductItem key={product.id} product={product} />
          ))}
        </>
      ) : (
        <></>
      )}
    </>
  );
}
