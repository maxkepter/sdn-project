import { useRef } from "react";

export default function PhotoUpload({ photos = [], onPhotosChange }) {
  const inputRef = useRef(null);

  const handleSelect = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    onPhotosChange([...photos, ...newPhotos]);
  };

  const handleRemove = (index) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Photos & Video</h2>
      <p className="text-sm text-gray-500 mb-4">Add up to 24 photos and one video</p>

      <div className="grid grid-cols-5 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border">
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {photos.length < 24 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-xs mt-1">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}
