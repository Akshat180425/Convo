import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { ArrowLeft, Flag, User, Mail } from "lucide-react";
import UserAvatar from "../components/UserAvatar";
import ReportModal from "./ReportModal";
import { useAuthStore } from "../store/useAuthStore";

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { authUser } = useAuthStore();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axiosInstance.get(`/auth/user/${id}`);
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center mt-20 text-red-500 font-semibold">
        <p>User not found.</p>
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-ghost btn-sm gap-2 mt-4"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-y-auto">
      <div className="max-w-2xl w-full p-4">
        <div className="bg-base-300 rounded-xl p-6 space-y-8 shadow-lg">
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {authUser?._id !== user._id && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="btn btn-error btn-sm gap-2"
            >
              <Flag className="size-4" />
              Report user
            </button>
          )}

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold">User Profile</h1>
            <p className="mt-2 text-sm text-zinc-400">Information of this user</p>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full border-4">
              <UserAvatar name={user.fullName} profilePic={user.profilePic} size="128px" />
            </div>
          </div>

          {/* Name + Status */}
          <div className="space-y-6 mt-4">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{user.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Status
              </div>
              <div className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {user.status || "Hey! I'm on Convo. Let's chat!"}
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="mt-6 bg-base-300 rounded-xl p-6 border border-base-200">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{user.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Email</span>
                <span className="text-green-500">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isReportModalOpen && (
        <ReportModal
          type="user"
          targetId={user._id}
          targetName={user.fullName}
          preview={user.status}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
