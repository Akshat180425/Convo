import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, Settings, User } from "lucide-react";

const darkThemes = [
  "dark", "synthwave", "halloween", "forest", "aqua", "black",
  "luxury", "dracula", "business", "night", "coffee", "dim", "sunset"
];

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme } = useThemeStore();

  const logoSrc = darkThemes.includes(theme?.toLowerCase())
    ? "/Logo/Transparent_NoName.png"
    : "/Logo/Transparent_NoName_Light.png";

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg overflow-hidden">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg font-bold">Convo</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to={"/settings"} className={`btn btn-sm gap-2 transition-colors`}>
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to={"/profile"} className="btn btn-sm gap-2">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="flex gap-2 items-center" onClick={logout}>
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
