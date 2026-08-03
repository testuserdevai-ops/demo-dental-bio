import ProductItem from "./Basic/ProductItem";

type ProductListProps = {
  products: ProductType[];
};

export default function ProductList({ products }: ProductListProps) {
  return (
    <>
      {products.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </>
  );
}
