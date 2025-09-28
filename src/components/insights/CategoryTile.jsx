import React from 'react';

export default function CategoryTile({ title, description, delta }) {
  const isCheaper = delta >= 0; // positive delta = cheaper abroad
  const isSimilar = Math.abs(delta) < 1; // within ~1% treated as "same"

  return (
    <div className="p-4 rounded-lg bg-white shadow-sm border hover:shadow-md transition">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="whitespace-pre-line text-sm text-gray-700 mb-3">{description}</p>

      {isSimilar ? (
        <p className="text-gray-500 font-medium">≈ Same Cost</p>
      ) : isCheaper ? (
        <p className="text-green-600 font-medium flex items-center gap-1">
          ▼ Cheaper ({Math.abs(delta).toFixed(1)}%)
        </p>
      ) : (
        <>
          <p className="text-red-600 font-medium flex items-center gap-1">
            ▲ More Expensive ({Math.abs(delta).toFixed(1)}%)
          </p>
          {/* <p className="text-red-600 text-sm">No Savings</p> */}
        </>
      )}
    </div>
  );
}
