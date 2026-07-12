export default function ListingTitle({ value = "", onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Title</h2>
      <p className="text-sm text-gray-500 mb-3">
        Include keywords that buyers would use to search for your item.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Vintage Levi's 501 Jeans - Size 30x32 - Blue"
        maxLength={80}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-400">Required</span>
        <span className="text-xs text-gray-400">{value.length}/80</span>
      </div>
    </div>
  );
}
