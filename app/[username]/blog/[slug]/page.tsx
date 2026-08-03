import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation'; // Used to show 404 if blog not found
import Header from '../../components/Header';
import WorkLocation from '../../components/WorkLocation';
import Footer from '../../components/Footer';
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../link-page.css";
import Link from 'next/link';
import { formatDate } from '@/utils/formatDate';
import BlogImage from '@/app/components/Image/BlogImage';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Blog {
  id: number;
  title: string;
  content: string;
  slug: string;
}

const fetchProfilePicture = async (dentistryId: string) => {
  try {
    // Check if the profile picture exists in the storage
    const { data, error } = await supabase.storage
      .from("profile-pics")
      .list(dentistryId);

    if (error) throw error;

    if (data.length > 0) {
      const fileName = data[0].name;
      const { data: urlData } = await supabase.storage
        .from("profile-pics")
        .getPublicUrl(`${dentistryId}/${fileName}`);

      return (urlData?.publicUrl || "/placeholder.webp"); // Set the image URL or placeholder
    } else {
      return ("/placeholder.webp"); // Use placeholder if no profile pic
    }
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    return ("/placeholder.webp"); // Set placeholder on error
  }
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  // Fetch the blog data using the slug parameter
  const { slug } = await params;

  const { data: blog, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)

  if (error || !blog[0]) {
    notFound(); // Shows 404 page if the blog is not found
  }

  // Atomic increment click counter for this blog
  try {
    await supabase.rpc('increment_click_counter', {
      table_name: 'blogs',
      row_id: blog[0].id,
    });
  } catch (error) {
    console.error('Error updating blog click counter:', error);
  }

  const group_id = blog[0].group_id;

  // Fetch the user from Supabase based on the username slug
  const { data: blogGroup, error: blogGroupError } = await supabase
    .from("blog_groups")
    .select("user_id")
    .eq("id", group_id)
    .single();

  // Fetch the user from Supabase based on the username slug
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, position, first_name, last_name, username, title, gdc_no, qualification, isVerified, use_dental_brand")
    .eq("id", blogGroup?.user_id)
    .single();

  // Fetch the dentistry data using the user's ID
  const { data: dentistry, error: dentistryError } = await supabase
    .from("dentistries")
    .select("dentistry_id, about_title, about_text, phone, booking_link, contact_email, location_title")
    .eq("user_id", user?.id)
    .single();

  const profilePicUrl = await fetchProfilePicture(dentistry?.dentistry_id);

  return (
    <div className="wrapper">
      <div className="profile-wrapper">
        <Header
          username={user?.username}
          title={dentistry?.about_title}
          contact_email={dentistry?.contact_email}
          image_url={profilePicUrl}
          isOtherPage={true}
          isVerified={user?.isVerified}
          useDentalBrand={user?.use_dental_brand}
        />

        <div className='text-center mt-20'>
          {blog[0].image_url &&
            <BlogImage
              src={blog[0].image_url}
              alt="Blog Image"
              className="w-full mb-4 rounded-[6px]"
            />
          }

          <h1 className='text-[23px] md:text-[26px] font-semibold'>{blog[0].title}</h1>

          <div className='w-full flex justify-center my-4'>
            <div className='flex items-center gap-2 text-left'>
              <div>
                <img
                  src={profilePicUrl || "/placeholder.webp"}
                  alt="user"
                  className="w-[50px] h-[50px] rounded-full"
                />
              </div>
              <div>
                <div className='text-xs'>{`${user?.title === 'N/A' ? '' : user?.title} ${user?.first_name} ${user?.last_name}`}</div>
                <div className='text-[10px] text-[#9D9D9D] text-left'>{formatDate(blog[0].created_at)}</div>
              </div>
            </div>
          </div>

          <div className='text-[#9d9d9d] text-[14px] break-words' dangerouslySetInnerHTML={{ __html: (blog[0].content) }}></div>
        </div>

        <div className='w-full flex justify-center mt-4 mb-6'>
          <Link
            href={`/${user?.username}`}
            className='w-[93px] h-[41px] rounded-[10px] border text-[14px] text-center no-underline text-black px-6 py-2'
          >
            <span>Back</span>
          </Link>
        </div>

        <WorkLocation dentistry={dentistry} />
        {dentistry &&
          <Footer
            dentistryId={dentistry.dentistry_id}
            bookingLink={dentistry?.booking_link}
            contact_email={dentistry?.contact_email}
            username={user?.username}
            title={dentistry?.about_title}
            useDentalBrand={user?.use_dental_brand}
          />}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  // Fetch slugs for all blogs to generate static paths
  const { data: blogs, error } = await supabase.from('blogs').select('slug');

  if (error) {
    console.error(error);
    return [];
  }

  // Generate paths for all blogs
  return blogs.map((blog: { slug: string }) => ({
    slug: blog.slug,
  }));
}
