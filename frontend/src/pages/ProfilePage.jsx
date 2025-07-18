import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [status, setStatus] = useState(authUser?.status || "Hey! I'm on Convo. Let's chat!");
  const [isEditingStatus, setIsEditingStatus] = useState(false);

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

  const handleStatusUpdate = async () => {
    try {
      await updateProfile({ status }); // calls backend
      setIsEditingStatus(false);
    } catch (err) {
      console.error("Failed to update status:", err.message);
    }
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold ">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 "
              />
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
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
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
                  />
                  <button
                    className="btn btn-sm my-2 btn-primary"
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingProfile || !status.trim()}
                    style={{backgroundColor: "rgb(0, 100, 200)"}} 
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div
                  className="px-4 py-2.5 bg-base-200 rounded-lg border cursor-pointer hover:border-primary"
                  onClick={() => setIsEditingStatus(true)}
                >
                  {status}
                </div>
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
        </div>
      </div>
    </div> 
  );
};
export default ProfilePage;
