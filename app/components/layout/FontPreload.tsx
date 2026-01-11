"use client"

import { useEffect } from 'react'
import Script from 'next/script'

export default function FontPreload() {
	useEffect(() => {
		// Add preload link immediately on mount
		if (typeof document !== 'undefined') {
			const existingLink = document.querySelector('link[href="/fonts/Wildchill.ttf"]')
			if (!existingLink) {
				const link = document.createElement('link')
				link.rel = 'preload'
				link.href = '/fonts/Wildchill.ttf'
				link.as = 'font'
				link.type = 'font/ttf'
				link.crossOrigin = 'anonymous'
				// Insert at the beginning of head for priority
				document.head.insertBefore(link, document.head.firstChild)
			}
		}
	}, [])

	return (
		<Script
			id="font-preload"
			strategy="beforeInteractive"
			dangerouslySetInnerHTML={{
				__html: `
					(function() {
						var link = document.createElement('link');
						link.rel = 'preload';
						link.href = '/fonts/Wildchill.ttf';
						link.as = 'font';
						link.type = 'font/ttf';
						link.crossOrigin = 'anonymous';
						document.head.appendChild(link);
					})();
				`,
			}}
		/>
	)
}

