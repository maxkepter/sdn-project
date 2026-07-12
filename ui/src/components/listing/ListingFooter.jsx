export default function ListingFooter() {
  const links = [
    "About eBay", "Announcements", "Community", "Security Center",
    "Seller Center", "Policies", "Affiliates", "Help & Contact", "Site Map",
  ];
  const bottomLinks = [
    "Accessibility", "User Agreement", "Privacy", "Payments Terms of Use",
    "Cookies", "CA Privacy Notice", "Your Privacy Choices", "AdChoice",
  ];
  return (
    <footer className="border-t border-gray-200 mt-12">
      <div className="max-w-[1024px] mx-auto px-4 py-8">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500 mb-4">
          {links.map((l) => (
            <li key={l}><button type="button" className="hover:underline cursor-pointer bg-transparent border-none p-0 text-inherit">{l}</button></li>
          ))}
        </ul>
        <div className="text-xs text-gray-400 leading-relaxed">
          Copyright © 1995-2026 eBay Inc. All Rights Reserved.{' '}
          {bottomLinks.map((l, i) => (
            <span key={l}>
              <button type="button" className="hover:underline cursor-pointer bg-transparent border-none p-0 text-inherit">{l}</button>
              {i < bottomLinks.length - 1 ? ", " : ""}{" "}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
