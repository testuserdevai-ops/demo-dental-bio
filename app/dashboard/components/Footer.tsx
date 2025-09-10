import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <div className="footer-logo text-center mb-0">
      <Link href="/">
        <Image src="/Dentalbio.svg" alt="Dentalbio Logo" className="img-fluid" width={100} height={50} />
      </Link>
    </div>
  );
};

export default Footer;
