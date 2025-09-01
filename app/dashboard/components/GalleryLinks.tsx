import Link from "next/link";

const GalleryLinks = () => {
    const links = [
      { img: '/copy.png', text: 'Copy dentalbio', href: '#' },
      { img: '/share.png', text: 'Share on LinkedIn', href: '#' },
      { img: '/instagram.png', text: 'Share on Instagram', href: '#' },
      { img: '/facebook.png', text: 'Share on Facebook', href: '#' },
      { img: '/whatsapp.png', text: 'Share via Whatsapp', href: '#' },
      { img: '/messanger.png', text: 'Share via Messenger', href: '#' },
      { img: '/email.png', text: 'Share via Email', href: '#' },
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
                <img src="/right-arrow.png" alt="arrow" className="img-fluid" />
              </div>
            </Link>
          </div>
        ))}
      </div>
    );
  };
  
  export default GalleryLinks;
  