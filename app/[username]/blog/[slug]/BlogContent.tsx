'use client';

import DOMPurify from 'dompurify';

export default function BlogContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html);
  return (
    <div
      className="text-gray-text text-[14px] break-words"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
