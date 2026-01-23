import React from 'react';

interface BrandLogoProps {
  className?: string;
}

// Partner marketplace logos for dropshipping platform
export const PartnerLogos = {
  Amazon: ({ className }: BrandLogoProps) => (
    <svg className={className} viewBox="0 0 130 40" fill="currentColor">
      <path d="M8 28 C20 34, 40 36, 60 28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M58 26 L64 32 L58 28" fill="currentColor" opacity="0.8" />
      <text x="4" y="20" fontSize="16" fontWeight="700" fontFamily="system-ui">amazon</text>
    </svg>
  ),
  
  Alibaba: ({ className }: BrandLogoProps) => (
    <svg className={className} viewBox="0 0 120 40" fill="currentColor">
      <circle cx="16" cy="16" r="8" opacity="0.7" />
      <path d="M16 12 C16 8, 20 8, 20 12" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="30" y="22" fontSize="14" fontWeight="600" fontFamily="system-ui">Alibaba</text>
    </svg>
  ),
  
  eBay: ({ className }: BrandLogoProps) => (
    <svg className={className} viewBox="0 0 90 40" fill="currentColor">
      <text x="4" y="26" fontSize="18" fontWeight="700" fontFamily="system-ui">
        <tspan fill="currentColor" opacity="0.9">e</tspan>
        <tspan fill="currentColor" opacity="0.7">B</tspan>
        <tspan fill="currentColor" opacity="0.8">a</tspan>
        <tspan fill="currentColor" opacity="0.6">y</tspan>
      </text>
    </svg>
  ),
  
  AliExpress: ({ className }: BrandLogoProps) => (
    <svg className={className} viewBox="0 0 140 40" fill="currentColor">
      <rect x="4" y="10" width="20" height="20" rx="4" opacity="0.7" />
      <path d="M10 20 L18 20 M14 16 L14 24" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.9" />
      <text x="30" y="24" fontSize="13" fontWeight="600" fontFamily="system-ui">AliExpress</text>
    </svg>
  ),
  
  Walmart: ({ className }: BrandLogoProps) => (
    <svg className={className} viewBox="0 0 130 40" fill="currentColor">
      <g transform="translate(8, 12)">
        <path d="M8 0 L8 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <path d="M0 4 L8 8 L16 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M0 12 L8 8 L16 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
      </g>
      <text x="32" y="24" fontSize="13" fontWeight="600" fontFamily="system-ui">Walmart</text>
    </svg>
  ),
  
};

export const TrustedBrandsSection: React.FC = () => {
  const partners = [
    { Logo: PartnerLogos.Amazon, width: 130 },
    { Logo: PartnerLogos.Alibaba, width: 120 },
    { Logo: PartnerLogos.eBay, width: 90 },
    { Logo: PartnerLogos.AliExpress, width: 140 },
    { Logo: PartnerLogos.Walmart, width: 130 },
  ];

  return (
    <div className="mt-20 pt-12 border-t border-border/20">
      <p className="text-sm text-muted-foreground text-center mb-10">
        Seamlessly integrate with leading global marketplaces
      </p>
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
        {partners.map(({ Logo, width }, i) => (
          <div
            key={i}
            className="text-muted-foreground/50 hover:text-muted-foreground/80 transition-all duration-300 hover:scale-105"
            style={{ width }}
          >
            <Logo className="w-full h-10" />
          </div>
        ))}
      </div>
    </div>
  );
};
