'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useDomainConfig } from '@/utils/hooks/useDomainConfig';

const Footer = () => {
  const domainConfig = useDomainConfig();
  
  return (
    <div className="footer-logo text-center mb-0">
      <Link href="/">
        <Image src={domainConfig.logoPath} alt={`${domainConfig.brandName} Logo`} className="img-fluid" width={100} height={50} />
      </Link>
    </div>
  );
};

export default Footer;
