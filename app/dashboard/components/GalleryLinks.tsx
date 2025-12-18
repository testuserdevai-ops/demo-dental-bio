import Link from "next/link";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
const GalleryLinks = () => {
    const domainConfig = useDomainConfig();
    const links = [
      { img: '/copy.webp', text: `Copy ${domainConfig.brandName.toLowerCase()}`, href: '#' },
      { img: '/share.webp', text: 'Share on LinkedIn', href: '#' },
      // { img: '/instagram.webp', text: 'Share on Instagram', href: '#' },
      { img: '/facebook.webp', text: 'Share on Facebook', href: '#' },
      { img: '/whatsapp.webp', text: 'Share via Whatsapp', href: '#' },
      { img: '/messanger.webp', text: 'Share via Messenger', href: '#' },
      { img: '/email.webp', text: 'Share via Email', href: '#' },
    ];
  
    return (
      <div>
        {links.map((link, index) => (
          <div className="sharelinks" key={index}>
            <Link href={link.href} className="text-decoration-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={link.img} alt="icon" className="img-fluid modal-icons" />
                  <h6 className="fw-semibold">{link.text}</h6>
                </div>
                <img src="/right-arrow.webp" alt="arrow" className="img-fluid" />
              </div>
            </Link>
          </div>
        ))}
      </div>
    );
  };
  
  export default GalleryLinks;
  