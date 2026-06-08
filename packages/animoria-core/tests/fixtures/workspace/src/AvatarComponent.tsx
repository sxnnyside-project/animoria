// This file uses "avatar" in many ways but NOT as a Lottie asset
const avatarUrl = user.profileAvatar;
const defaultAvatarSize = 48;
function renderAvatar(avatarProps) {
  return <Avatar src={avatarUrl} size={defaultAvatarSize} />;
}
