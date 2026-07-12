import { useState } from "react";
import { getInitials, getColorFromName } from "../lib/utils";

const UserAvatar = ({ name, profilePic, size = "48px" }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (profilePic && !imageFailed) {
    return (
      <img
        src={profilePic}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: getColorFromName(name),
        fontSize: `calc(${size} / 2.5)`,
      }}
    >
      {getInitials(name)}
    </div>
  );
};

export default UserAvatar;
