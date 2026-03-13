import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/logo-podoclin.png"
      alt="PodoClin"
      width={1146}
      height={768}
      priority={priority}
      className={className}
    />
  );
}
