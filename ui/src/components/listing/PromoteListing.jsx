export default function PromoteListing() {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-800">Promote your listing</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sellers who promote their listings see an average of 48% more sales.
          </p>
          <ul className="mt-3 space-y-1">
            <li className="text-sm text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Appear at the top of search results
            </li>
            <li className="text-sm text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Pay only when your item sells
            </li>
            <li className="text-sm text-gray-600 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Set your own ad rate (2-12%)
            </li>
          </ul>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input type="checkbox" className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
}
