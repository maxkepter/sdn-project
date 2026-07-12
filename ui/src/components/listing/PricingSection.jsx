export default function PricingSection({ values = {}, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...values, [field]: e.target.value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Pricing</h2>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700">Format</label>
          <select
            value={values.format || "fixed"}
            onChange={handleChange("format")}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fixed">Fixed price (Buy It Now)</option>
            <option value="auction">Auction</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Duration</label>
          <select
            value={values.duration || "gtc"}
            onChange={handleChange("duration")}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gtc">Good 'Til Cancelled</option>
            <option value="3">3 days</option>
            <option value="5">5 days</option>
            <option value="7">7 days</option>
            <option value="10">10 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Price ($)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-3 text-gray-500 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={values.price || ""}
                onChange={handleChange("price")}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              min={1}
              value={values.quantity || 1}
              onChange={handleChange("quantity")}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
