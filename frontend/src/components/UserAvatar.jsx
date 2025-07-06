import { getInitials, getColorFromName } from "../lib/utils";

const UserAvatar = ({ name, profilePic, size = "48px" }) => {
  if (profilePic) {
    return (
      <img
        src={profilePic}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
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
