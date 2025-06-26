import { useThemeStore } from "../store/useThemeStore";

const darkThemes = [
  "dark", "synthwave", "halloween", "forest", "aqua", "black",
  "luxury", "dracula", "business", "night", "coffee", "dim", "sunset"
];

const AuthImagePattern = ({ title, subtitle }) => {

  const { theme } = useThemeStore();

  const logoSrc = darkThemes.includes(theme?.toLowerCase())
    ? "/Logo/Transparent_NoName.png"
    : "/Logo/Transparent_NoName_Light.png";

  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        <div>
          <img
            src={logoSrc}
            alt="Logo"
            className="w-100 h-100 mx-auto object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
