export default function PricingResearch() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-800 mb-3">Sold listings in last 90 days</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-800">$45</div>
          <div className="text-xs text-gray-500 mt-1">Median starting bid</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-800">$52</div>
          <div className="text-xs text-gray-500 mt-1">Median sold price</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-gray-800">67%</div>
          <div className="text-xs text-gray-500 mt-1">Free shipping</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Based on 47 similar items sold in your category.
      </p>
    </div>
  );
}
