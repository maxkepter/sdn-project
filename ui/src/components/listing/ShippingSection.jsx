export default function ShippingSection({ values = {}, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...values, [field]: e.target.value });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Shipping</h2>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700">Domestic shipping</label>
          <select
            value={values.domestic || "free"}
            onChange={handleChange("domestic")}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="free">Free shipping</option>
            <option value="flat">Flat rate - $5.99</option>
            <option value="calculated">Calculated (based on weight)</option>
            <option value="local">Local pickup only</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">International shipping</label>
          <select
            value={values.international || "none"}
            onChange={handleChange("international")}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">Not offered</option>
            <option value="flat">Flat rate - $15.99</option>
            <option value="calculated">Calculated</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Item location</label>
          <input
            type="text"
            value={values.location || ""}
            onChange={handleChange("location")}
            placeholder="City, State"
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
