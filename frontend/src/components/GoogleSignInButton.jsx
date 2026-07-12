import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const GOOGLE_SCRIPT_ID = "google-identity-services";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

const GoogleSignInButton = ({ mode = "login" }) => {
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const { connectGoogle, googleLogin, isLoggingIn, isUpdatingProfile } = useAuthStore();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConnectMode = mode === "connect";

  useEffect(() => {
    let isMounted = true;

    const renderButton = async () => {
      if (!clientId || !buttonRef.current) return;

      try {
        await loadGoogleScript();
        if (!isMounted || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              toast.error("Google did not return a login credential");
              return;
            }

            const success = isConnectMode
              ? await connectGoogle(response.credential)
              : await googleLogin(response.credential);

            if (success && !isConnectMode) {
              navigate("/", { replace: true });
              window.setTimeout(() => {
                if (window.location.pathname === "/login" || window.location.pathname === "/signup") {
                  window.location.replace("/");
                }
              }, 100);
            }
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: isConnectMode ? "continue_with" : "continue_with",
          width: buttonRef.current.offsetWidth || 320,
        });
      } catch (error) {
        console.error("Google sign-in failed to load:", error);
        toast.error("Google sign-in could not load");
      }
    };

    renderButton();

    return () => {
      isMounted = false;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [clientId, connectGoogle, googleLogin, isConnectMode, navigate]);

  if (!clientId) {
    return (
      <button
        type="button"
        className="btn btn-outline w-full"
        onClick={() => toast.error("Google login is not configured yet")}
      >
        {isConnectMode ? "Connect Google" : "Continue with Google"}
      </button>
    );
  }

  return (
    <div className={isLoggingIn || isUpdatingProfile ? "pointer-events-none opacity-60" : ""}>
      <div ref={buttonRef} className="flex w-full justify-center" />
    </div>
  );
};

export default GoogleSignInButton;
