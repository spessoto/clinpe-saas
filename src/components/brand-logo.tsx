import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo-pododesk.png"
      alt="ClinPé"
      width={1146}
      height={384}
      priority={priority}
      className={className}
    />
  );
}

export function BrandLogoWhite({
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo-pododesk-white.png"
      alt="ClinPé"
      width={1146}
      height={384}
      priority={priority}
      className={className}
    />
  );
}
