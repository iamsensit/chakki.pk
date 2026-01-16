"use client"

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'

type ImageSource = 'public' | 'external' | 'database'

interface ImageUploadProps {
	images: string[]
	onImagesChange: (images: string[]) => void
	label?: string
	multiple?: boolean
}

export default function ImageUpload({ images, onImagesChange, label = "Images", multiple = true }: ImageUploadProps) {
	const [imageUrl, setImageUrl] = useState('')
	const [imageSource, setImageSource] = useState<ImageSource>('public')
	const [uploading, setUploading] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	function loadImage(file: File): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = reject
			const reader = new FileReader()
			reader.onload = () => { img.src = String(reader.result) }
			reader.onerror = reject
			reader.readAsDataURL(file)
		})
	}

	async function compressToDataUrl(file: File): Promise<string> {
		const img = await loadImage(file)
		// Reduced max size for web optimization (800x800 is sufficient for most displays)
		const maxW = 800, maxH = 800
		let { width, height } = img
		const ratio = Math.min(maxW / width, maxH / height, 1)
		width = Math.round(width * ratio)
		height = Math.round(height * ratio)
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')!
		ctx.drawImage(img, 0, 0, width, height)
		// Lower quality (0.7) for better compression and smaller file size
		// Try WebP first (better compression), fallback to JPEG
		try {
			return canvas.toDataURL('image/webp', 0.7)
		} catch {
			return canvas.toDataURL('image/jpeg', 0.7)
		}
	}

	async function uploadToDatabase(file: File): Promise<string> {
		// Store as base64 data URL in database
		const dataUrl = await compressToDataUrl(file)
		return dataUrl
	}

	async function uploadToCloudinary(file: File): Promise<string> {
		const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
		const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET
		const dataUrl = await compressToDataUrl(file)
		
		// If Cloudinary is configured, upload there; otherwise, store data URL directly in DB
		if (!cloudName || !preset) {
			return dataUrl
		}
		
		const blob = await (await fetch(dataUrl)).blob()
		const form = new FormData()
		form.append('file', blob, file.name.replace(/\.[^.]+$/, '.jpg'))
		form.append('upload_preset', preset)
		const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form })
		if (!res.ok) throw new Error('Upload failed')
		const json = await res.json()
		return json.secure_url as string
	}

	async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return
		
		// If multiple is false, only take the first file
		const filesToProcess = multiple ? files : [files[0]]
		
		setUploading(true)
		try {
			const urls: string[] = []
			for (const file of filesToProcess) {
				let url: string
				if (imageSource === 'database') {
					url = await uploadToDatabase(file)
				} else {
					url = await uploadToCloudinary(file)
				}
				urls.push(url)
			}
			
			// If multiple is false, replace existing images; otherwise append
			if (multiple) {
				onImagesChange([...images, ...urls])
			} else {
				onImagesChange(urls)
			}
			toast.success(`${urls.length} image(s) ${multiple ? 'added' : 'uploaded'}`)
		} catch (e: any) {
			toast.error(e.message || 'Image upload failed')
		} finally {
			setUploading(false)
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}

	function handleAddUrl() {
		const raw = imageUrl.trim()
		if (!raw) {
			toast.error('Please enter an image URL or path')
			return
		}
		
		let url: string
		if (imageSource === 'public') {
			url = raw.startsWith('/') ? raw : `/${raw}`
		} else {
			url = raw
		}
		
		// If multiple is false, replace existing images; otherwise append
		if (multiple) {
			onImagesChange([...images, url])
		} else {
			onImagesChange([url])
		}
		setImageUrl('')
		toast.success('Image URL added')
	}

	function removeImage(index: number) {
		onImagesChange(images.filter((_, i) => i !== index))
	}

	return (
		<div className="grid gap-2">
			<label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
			
			{/* Image Source Selection */}
			<div className="flex items-center gap-2 mb-2">
				<select
					className="rounded-md border px-2 py-2 text-sm"
					value={imageSource}
					onChange={e => setImageSource(e.target.value as ImageSource)}
				>
					<option value="public">Public folder (/path)</option>
					<option value="external">External URL (https://…)</option>
					<option value="database">Upload to Database</option>
				</select>
			</div>

			{/* URL Input (for public/external) */}
			{imageSource !== 'database' && (
				<div className="flex items-center gap-2">
					<input
						value={imageUrl}
						onChange={e => setImageUrl(e.target.value)}
						placeholder={imageSource === 'public' ? '/images/photo.jpg' : 'https://site.com/image.jpg'}
						className="input-enhanced flex-1"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								handleAddUrl()
							}
						}}
					/>
					<button
						type="button"
						className="btn-primary"
						onClick={handleAddUrl}
					>
						Add URL
					</button>
				</div>
			)}

			{/* File Upload (for database) */}
			{imageSource === 'database' && (
				<div className="flex items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						multiple={multiple}
						onChange={handleFileUpload}
						className="hidden"
						id="image-upload-input"
					/>
					<label
						htmlFor="image-upload-input"
						className="flex items-center gap-2 btn-primary cursor-pointer"
					>
						<Upload className="h-4 w-4" />
						{uploading ? 'Uploading...' : `Upload Image${multiple ? 's' : ''}`}
					</label>
					{uploading && (
						<div className="text-sm text-gray-500">Processing image...</div>
					)}
				</div>
			)}

			{/* Image Preview Grid */}
			{images.length > 0 && (
				<div className="mt-2 grid grid-cols-3 gap-2">
					{images.map((src, idx) => (
						<div key={`${src}-${idx}`} className="relative group">
							<img 
								src={src.startsWith('data:') ? src : src} 
								className="h-24 w-full object-cover border" 
								alt={`Image ${idx + 1}`}
								onError={(e) => {
									// Hide broken images
									(e.target as HTMLImageElement).style.display = 'none'
								}}
							/>
							<button
								type="button"
								className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded px-1.5 py-0.5 text-xs transition-colors flex items-center gap-1"
								onClick={() => removeImage(idx)}
								title="Remove image"
							>
								<X className="h-3 w-3" />
							</button>
							{src.startsWith('data:') && (
								<div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded">
									DB
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}

