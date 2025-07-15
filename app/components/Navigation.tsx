import { Link, useLocation } from '@remix-run/react';
import { useState } from 'react';

type NavigationProps = {
  isAuthenticated: boolean;
};

/**
 * Application navigation bar with responsive design
 * Shows different navigation options based on authentication status
 */
export default function Navigation({ isAuthenticated }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="bg-blue-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="text-white font-bold text-xl">
                Parkbench
              </Link>
            </div>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/'
                    ? 'bg-blue-700 text-white'
                    : 'text-white hover:bg-blue-500'
                }`}
                aria-label="Home page"
              >
                Home
              </Link>

              {isAuthenticated && (
                <>
                  <Link
                    to="/checkin"
                    className="px-4 py-2 rounded-md text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                    aria-label="Check in a visitor to a park"
                  >
                    Check-in
                  </Link>
                  <Link
                    to="/profile/visitors"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.startsWith('/visitor')
                        ? 'bg-blue-700 text-white'
                        : 'text-white hover:bg-blue-500'
                    }`}
                    aria-label="View your visitors"
                  >
                    My Visitors
                  </Link>
                </>
              )}

              {!isAuthenticated ? (
                <Link
                  to="/auth/signin"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-white text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                  aria-label="Log in to your account"
                >
                  Login
                </Link>
              ) : (
                <Link
                  to="/sign-out"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-500"
                  aria-label="Log out of your account"
                >
                  Logout
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-blue-600 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">
                {isMenuOpen ? 'Close menu' : 'Open menu'}
              </span>

              {/* Menu icon when closed */}
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* X icon when open */}
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}
        id="mobile-menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              location.pathname === '/'
                ? 'bg-blue-700 text-white'
                : 'text-white hover:bg-blue-500'
            }`}
            aria-label="Home page"
          >
            Home
          </Link>

          {isAuthenticated && (
            <>
              <Link
                to="/checkin"
                className="block px-4 py-2 rounded-md text-base font-medium bg-white text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                aria-label="Check in a visitor to a park"
              >
                Check-in
              </Link>
              <Link
                to="/profile/visitors"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  location.pathname.startsWith('/visitor')
                    ? 'bg-blue-700 text-white'
                    : 'text-white hover:bg-blue-500'
                }`}
                aria-label="View your visitors"
              >
                My Visitors
              </Link>
            </>
          )}

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="block px-4 py-2 rounded-md text-base font-medium bg-white text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              aria-label="Log in to your account"
            >
              Login
            </Link>
          ) : (
            <Link
              to="/sign-out"
              className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-500"
              aria-label="Log out of your account"
            >
              Logout
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
