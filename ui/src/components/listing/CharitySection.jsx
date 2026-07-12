export default function CharitySection() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800">Donate to charity</h2>
          <p className="text-sm text-gray-500">
            You can donate 5-100% of your sale to a nonprofit of your choice.
          </p>
        </div>
        <button className="text-sm text-blue-600 hover:underline font-medium shrink-0">
          Edit
        </button>
      </div>
    </div>
  );
}
