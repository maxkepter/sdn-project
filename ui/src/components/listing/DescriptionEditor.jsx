export default function DescriptionEditor({ value = "", onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Description</h2>
      <p className="text-sm text-gray-500 mb-3">
        Describe the condition, features, and any defects of your item.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a detailed description of your item..."
        rows={6}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />
    </div>
  );
}
