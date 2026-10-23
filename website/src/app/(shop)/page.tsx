"use client";
import { useEffect, useState } from 'react';
import { api, Product } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.products
      .list()
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load products', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading products...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/shop/${p.slug}`}
          className="border rounded p-2 hover:shadow-lg"
        >
          {p.image && (
            <Image
              src={p.image}
              alt={p.name}
              width={300}
              height={300}
              className="object-cover"
            />
          )}
          <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
          <p className="text-gray-600">${p.price.toFixed(2)}</p>
        </Link>
      ))}
    </div>
  );
}

