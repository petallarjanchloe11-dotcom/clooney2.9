import React from 'react';

interface ClooneyLogoProps {
  size?: number | string;
  className?: string;
  withSparkAnimation?: boolean;
}

export const ClooneyLogo: React.FC<ClooneyLogoProps> = ({
  size = 36,
  className = '',
  withSparkAnimation = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Clooney Logo"
    >
      {/* Speech bubble in Slate Ocean */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="#24303E"
      />
      {/* Speech bubble tail / indicator */}
      <path
        d="M10 27L6 33L16 30"
        fill="#24303E"
      />

      {/* Cloud Mint 4-pointed Intelligence Spark / Star */}
      <path
        d="M20 10L21.8 17.2L29 19L21.8 20.8L20 28L18.2 20.8L11 19L18.2 17.2L20 10Z"
        fill="#85DFC7"
        className={withSparkAnimation ? 'animate-pulse' : ''}
      />

      {/* Tiny secondary sparkle */}
      <circle cx="27" cy="12" r="1.5" fill="#85DFC7" opacity="0.9" />
    </svg>
  );
};
