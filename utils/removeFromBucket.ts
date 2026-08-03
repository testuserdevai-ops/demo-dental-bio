export const deleteFileFromSupabase = async ({
  supabase,
  bucketName,
  fileUrl,
}: {
  supabase: any;
  bucketName: string;
  fileUrl: string;
}) => {
  try {
    // Extract the bucket name and file path from the URL
    const urlParts = new URL(fileUrl);
    const filePath = urlParts.pathname.split(`/${bucketName}/`)[1];

    if (!filePath) {
      throw new Error("Invalid file URL or bucket name mismatch.");
    }

    console.log(filePath);

    // Remove the file from the bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    console.log("File successfully deleted:", data);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};
