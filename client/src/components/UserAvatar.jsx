export default function UserAvatar({ user, size = 28, title, ring }) {
  if (!user) return null;
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      title={title || user.name}
      className={`rounded-full flex items-center justify-center text-white font-medium ${
        ring ? 'border-2 border-white' : ''
      }`}
      style={{
        width: size,
        height: size,
        backgroundColor: user.avatarColor || '#3B82F6',
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}
