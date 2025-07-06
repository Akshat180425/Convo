import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { User, Mail } from "lucide-react";
import UserAvatar from "../components/UserAvatar";

const UserProfilePage = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        User not found.
      </div>
    );
  }

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">User Profile</h1>
            <p className="mt-2">Information of this user</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            {user.profilePic ? (
              <img
                src={user.profilePic}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4"
              />
            ) : (
              <UserAvatar name={user.fullName} size="128px" />
            )}
          </div>

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

          <div className="mt-6 bg-base-300 rounded-xl p-6">
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
    </div>
  );
};

export default UserProfilePage;
