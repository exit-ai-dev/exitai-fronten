// src/components/AIAvatar.tsx
interface AIAvatarProps {
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: { outer: "h-8 w-8",   icon: "h-4 w-4" },
  md: { outer: "h-10 w-10", icon: "h-5 w-5" },
  lg: { outer: "h-12 w-12", icon: "h-6 w-6" },
} as const;

export function AIAvatar({ size = "md" }: AIAvatarProps) {
  const { outer, icon } = SIZE[size];
  return (
    <div
      className={`${outer} rounded-full gradient-primary flex items-center justify-center shadow-glow flex-shrink-0`}
    >
      {/* Sparkle / magic-wand icon from reference design */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${icon} text-white`}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
        />
      </svg>
    </div>
  );
}
