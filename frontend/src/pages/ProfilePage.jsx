import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link as LinkIcon,
  Lock,
  Mail,
  Radio,
  Shield,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import UserAvatar from "../components/UserAvatar";
import GoogleSignInButton from "../components/GoogleSignInButton";

const DEFAULT_PRIVACY = {
  lastSeen: "friends",
  onlineStatus: "friends",
  profilePhoto: "friends",
  readReceipts: true,
};

const PRIVACY_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "friends", label: "Friends" },
  { value: "nobody", label: "Nobody" },
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { authUser, isSettingPassword, isUpdatingProfile, setPassword, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [status, setStatus] = useState(authUser?.status || "Hey! I'm on Convo. Let's chat!");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [privacy, setPrivacy] = useState({
    ...DEFAULT_PRIVACY,
    ...(authUser?.privacy || {}),
  });

  const hasPassword = authUser?.hasPassword ?? authUser?.passwordSet !== false;
  const canSetPassword = authUser?.authProvider === "google" && !hasPassword;
  const isGoogleConnected = authUser?.googleConnected === true || authUser?.authProvider === "google";

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleNameUpdate = async () => {
    try {
      await updateProfile({ fullName: fullName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update name:", err.message);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await updateProfile({ status: status.trim() });
      setIsEditingStatus(false);
    } catch (err) {
      console.error("Failed to update status:", err.message);
    }
  };

  const cancelNameEdit = () => {
    setFullName(authUser?.fullName || "");
    setIsEditingName(false);
  };

  const cancelStatusEdit = () => {
    setStatus(authUser?.status || "Hey! I'm on Convo. Let's chat!");
    setIsEditingStatus(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword) return toast.error("Password is required");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    const success = await setPassword({ password: newPassword });
    if (success) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    }
  };

  const handlePrivacyChange = async (field, value) => {
    const nextPrivacy = { ...privacy, [field]: value };
    setPrivacy(nextPrivacy);
    const success = await updateProfile({ privacy: { [field]: value } });
    if (!success) setPrivacy(privacy);
  };

  const privacyRows = [
    {
      field: "lastSeen",
      label: "Last seen",
      description: "Who can see when you were last active",
      icon: Clock3,
    },
    {
      field: "onlineStatus",
      label: "Online status",
      description: "Who can see the green online indicator",
      icon: Radio,
    },
    {
      field: "profilePhoto",
      label: "Profile photo",
      description: "Who can see your uploaded profile picture",
      icon: ImageIcon,
    },
  ];

  return (
    <div className="h-screen overflow-y-auto pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {selectedImg ? (
                <img
                  src={selectedImg}
                  alt="Profile"
                  className="size-32 rounded-full object-cover border-4"
                />
              ) : (
                <div className="rounded-full border-4">
                  <UserAvatar name={authUser.fullName} profilePic={authUser.profilePic} size="128px" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-base-content hover:scale-105
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setIsEditingStatus(false); setStatus(authUser?.status || ""); } } }
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400">
              {"Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    className="input input-bordered w-full"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && fullName.trim()) handleNameUpdate();
                      if (e.key === "Escape") cancelNameEdit();
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm my-2 btn-circle"
                    onClick={handleNameUpdate}
                    disabled={isUpdatingProfile || !fullName.trim()}
                    aria-label="Save name"
                    title="Save name"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm my-2 btn-circle"
                    onClick={cancelNameEdit}
                    disabled={isUpdatingProfile}
                    aria-label="Cancel name edit"
                    title="Cancel name edit"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-lg border bg-base-200 px-4 py-2.5 text-left hover:border-primary"
                  onClick={() => setIsEditingName(true)}
                >
                  {authUser?.fullName}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Status
              </div>

              {isEditingStatus ? (
                <div className="flex gap-2">
                  <input
                    className="input input-bordered w-full"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && status.trim()) handleStatusUpdate();
                      if (e.key === "Escape") cancelStatusEdit();
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-sm my-2 btn-primary btn-circle"
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingProfile || !status.trim()}
                    aria-label="Save status"
                    title="Save status"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm my-2 btn-circle"
                    onClick={cancelStatusEdit}
                    disabled={isUpdatingProfile}
                    aria-label="Cancel status edit"
                    title="Cancel status edit"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-lg border bg-base-200 px-4 py-2.5 text-left hover:border-primary"
                  onClick={() => setIsEditingStatus(true)}
                >
                  {status}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Email</span>
                <span className="text-green-500">{authUser?.email}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-base-200 bg-base-300 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <div>
                <h2 className="text-lg font-medium">Privacy</h2>
                <p className="text-sm text-base-content/70">
                  Control what others can see in Convo.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {privacyRows.map(({ field, label, description, icon: Icon }) => (
                <div
                  key={field}
                  className="flex flex-col gap-3 rounded-lg border border-base-200 bg-base-200/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-base-content/60">{description}</p>
                    </div>
                  </div>

                  <select
                    className="select select-bordered select-sm w-full sm:w-36"
                    value={privacy[field]}
                    onChange={(e) => handlePrivacyChange(field, e.target.value)}
                    disabled={isUpdatingProfile}
                    aria-label={`${label} visibility`}
                  >
                    {PRIVACY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex flex-col gap-3 rounded-lg border border-base-200 bg-base-200/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">Read receipts</p>
                    <p className="text-sm text-base-content/60">
                      Let senders see when you have read their messages
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={privacy.readReceipts}
                  onChange={(e) => handlePrivacyChange("readReceipts", e.target.checked)}
                  disabled={isUpdatingProfile}
                  aria-label="Toggle read receipts"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-base-200 bg-base-300 p-6">
            <div className="mb-4 flex items-center gap-2">
              <LinkIcon className="size-5 text-primary" />
              <div>
                <h2 className="text-lg font-medium">
                  {isGoogleConnected ? "Connected to Google" : "Connect Google"}
                </h2>
                <p className="text-sm text-base-content/70">
                  {isGoogleConnected
                    ? "You can sign in to this Convo profile with Google."
                    : "Link a Google account so you can also sign in with Google."}
                </p>
              </div>
            </div>

            {isGoogleConnected ? (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                Google is connected
              </div>
            ) : (
              <GoogleSignInButton mode="connect" />
            )}
          </div>

          {canSetPassword && (
            <form
              onSubmit={handleSetPassword}
              className="rounded-xl border border-base-200 bg-base-300 p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                <div>
                  <h2 className="text-lg font-medium">Set Convo Password</h2>
                  <p className="text-sm text-base-content/70">
                    Use this password later with your email, even without Google.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">New Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input input-bordered w-full pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-5 text-base-content/40" />
                      ) : (
                        <Eye className="size-5 text-base-content/40" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Confirm Password</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input input-bordered w-full"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isSettingPassword}
                >
                  {isSettingPassword ? "Saving..." : "Set password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
