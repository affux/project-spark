import React from 'react';

interface USDTIconProps {
  className?: string;
  size?: number;
}

export const USDTIcon: React.FC<USDTIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="11" fill="#26A17B" />
      <path
        d="M13.5 10.5V9H17V7H7V9H10.5V10.5C7.5 10.7 5.5 11.3 5.5 12C5.5 12.7 7.5 13.3 10.5 13.5V18H13.5V13.5C16.5 13.3 18.5 12.7 18.5 12C18.5 11.3 16.5 10.7 13.5 10.5ZM12 13C8.7 13 6 12.5 6 12C6 11.5 8.7 11 12 11C15.3 11 18 11.5 18 12C18 12.5 15.3 13 12 13Z"
        fill="white"
      />
    </svg>
  );
};
