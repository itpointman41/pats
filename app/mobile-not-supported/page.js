'use client';

/**
 * Mobile Not Supported Page
 * 
 * This page is displayed to users accessing the application from mobile devices.
 * It provides a clear message and redirects options for desktop users.
 */

export default function MobileNotSupported() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="text-6xl">📱❌</div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Mobile Not Supported
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-600 mb-6">
          This web app is not available on mobile. Please use a desktop or laptop browser.
        </p>

        {/* Additional Info */}
        <p className="text-sm text-gray-500 mb-8">
          For the best experience, visit this site from your computer.
        </p>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-md p-4 mb-8 text-left">
          <h2 className="font-semibold text-gray-900 mb-2">How to proceed:</h2>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Open this page on your desktop or laptop</li>
            <li>Or use a browser that identifies itself as desktop</li>
            <li>Contact support if you need mobile access</li>
          </ul>
        </div>

        {/* Support Info */}
        <p className="text-xs text-gray-400">
          If you believe this is an error or need assistance, please contact support.
        </p>
      </div>
    </div>
  );
}
