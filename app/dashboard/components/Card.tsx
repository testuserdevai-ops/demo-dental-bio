// components/Card.tsx

import React from 'react';

export default function Card() {
  return (
    <div className="membar-cards flex items-center gap-4 bg-gray-100 p-4 rounded-md">
      <img src="/images/drage-arrow.svg" alt="vector" className="cursor-pointer" />
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <p className="font-bold">New features coming soon!</p>
            <img src="/images/edit.svg" alt="edit" className="cursor-pointer" />
          </div>
          <div className="flex items-center gap-4">
            <img src="/images/link-icon.svg" alt="link" className="cursor-pointer" />
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" />
            </div>
          </div>
        </div>
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <p>8 clicks</p>
            <button className="btn border-0 p-0">
              <img src="/images/gallery-vector.svg" alt="gallery" />
            </button>
          </div>
          <button className="border-0 bg-transparent p-0">
            <img src="/images/trash.svg" alt="trash" className="cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
}
