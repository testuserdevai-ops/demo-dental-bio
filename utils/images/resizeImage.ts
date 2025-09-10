'use client'

export async function resizeImage(
	file: File,
	maxWidth: number = 1920,
	maxHeight: number = 1080,
	quality: number = 0.8
): Promise<File> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const reader = new FileReader();

		reader.onload = () => {
			img.src = reader.result as string;
		};
		reader.onerror = reject;

		img.onload = () => {
			const canvas = document.createElement('canvas');
			let { width, height } = img;

			// Preserve aspect ratio while fitting within max dimensions
			if (width > maxWidth || height > maxHeight) {
				const ratio = Math.min(maxWidth / width, maxHeight / height);
				width *= ratio;
				height *= ratio;
			}

			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) return reject('Canvas context not available');

			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(new File([blob], file.name, { type: 'image/jpeg' }));
					} else {
						reject('Image compression failed');
					}
				},
				'image/jpeg',
				quality
			);
		};

		reader.readAsDataURL(file);
	});
}


