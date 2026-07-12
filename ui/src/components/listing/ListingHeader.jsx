export default function ListingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1024px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center">
            <img src="/images/logo.svg" alt="eBay" className="h-8" />
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-600 hover:text-gray-900">Home</a>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600 font-medium">Create listing</span>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a href="/help" className="text-blue-600 hover:underline">Help</a>
          <a href="/seller" className="text-blue-600 hover:underline">Seller Hub</a>
        </div>
      </div>
    </header>
  );
}
