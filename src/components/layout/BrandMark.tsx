import { Link } from "react-router-dom";

type BrandMarkVariant = "navbar" | "menu" | "footer";

interface BrandMarkProps {
  variant?: BrandMarkVariant;
  asLink?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<
  BrandMarkVariant,
  { wrapper: string; title: string; subtitle: string }
> = {
  navbar: {
    wrapper: "items-center max-w-[42vw] sm:max-w-none",
    title: "text-sm sm:text-xl md:text-2xl font-serif tracking-[0.15em] sm:tracking-[0.3em] md:tracking-[0.4em] leading-tight italic text-[#F4F4F4] truncate",
    subtitle: "text-[8px] sm:text-[9px] md:text-[10px] tracking-[0.35em] sm:tracking-[0.5em] text-[#c5a059] mt-0.5 sm:mt-1 opacity-80",
  },
  menu: {
    wrapper: "items-center text-center px-2",
    title:
      "text-[1.35rem] sm:text-2xl font-serif tracking-[0.38em] leading-snug italic text-[#f5f0e8]",
    subtitle: "text-[8px] sm:text-[9px] tracking-[0.55em] text-[#c5a059] mt-3 uppercase opacity-90",
  },
  footer: {
    wrapper: "items-start",
    title: "text-xl font-serif tracking-[0.2em] italic text-[#F4F4F4] group-hover:text-[#c5a059] transition-colors",
    subtitle: "text-[9px] tracking-[0.5em] text-[#c5a059] mt-1 uppercase",
  },
};

export default function BrandMark({
  variant = "navbar",
  asLink = false,
  onClick,
  className = "",
}: BrandMarkProps) {
  const styles = variantStyles[variant];

  const content = (
    <>
      {variant === "navbar" ? (
        <h1 className={styles.title}>ANTONIO BELLANOVA</h1>
      ) : (
        <span className={styles.title}>ANTONIO BELLANOVA</span>
      )}
      <span className={styles.subtitle}>Luxury Köln</span>
    </>
  );

  const baseClass = `flex flex-col group ${styles.wrapper} ${className}`;

  if (asLink) {
    return (
      <Link to="/" onClick={onClick} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
