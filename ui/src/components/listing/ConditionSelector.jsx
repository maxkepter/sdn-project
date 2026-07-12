const conditions = [
  { value: "new-with-tags", label: "New with tags", desc: "Brand new, unused, with original tags" },
  { value: "new-without-tags", label: "New without tags", desc: "Brand new, unused, without original tags" },
  { value: "pre-owned-excellent", label: "Pre-owned: Excellent", desc: "Minimal signs of wear" },
  { value: "pre-owned-good", label: "Pre-owned: Good", desc: "Normal signs of wear" },
  { value: "pre-owned-fair", label: "Pre-owned: Fair", desc: "Visible signs of wear" },
];

export default function ConditionSelector({ value = "pre-owned-good", onChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-3">Condition</h2>
      <div className="space-y-2">
        {conditions.map((c) => (
          <label
            key={c.value}
            className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input
              type="radio"
              name="condition"
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="mt-0.5 accent-blue-600"
            />
            <div>
              <div className="text-sm font-medium text-gray-800">{c.label}</div>
              <div className="text-xs text-gray-500">{c.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
