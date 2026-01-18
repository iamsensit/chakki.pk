"use client"

import { useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	className?: string
}

export default function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
	const wrapperRef = useRef<HTMLDivElement>(null)

	const modules = useMemo(() => ({
		toolbar: [
			[{ 'header': [1, 2, 3, false] }],
			['bold', 'italic', 'underline', 'strike'],
			[{ 'list': 'ordered'}, { 'list': 'bullet' }],
			[{ 'script': 'sub'}, { 'script': 'super' }],
			[{ 'indent': '-1'}, { 'indent': '+1' }],
			[{ 'align': [] }],
			[{ 'color': [] }, { 'background': [] }],
			[{ 'font': [] }],
			[{ 'size': ['small', false, 'large', 'huge'] }],
			['blockquote', 'code-block'],
			['link', 'image'],
			['clean']
		],
		clipboard: {
			// Enhanced clipboard matcher to handle Word format
			matchVisual: false
		}
	}), [])

	const formats = [
		'header', 'font', 'size',
		'bold', 'italic', 'underline', 'strike', 'blockquote',
		'list', 'bullet', 'indent',
		'link', 'image', 'color', 'background',
		'align', 'script', 'code-block'
	]

	useEffect(() => {
		// Set up Word paste handler after component mounts
		if (typeof window === 'undefined' || !wrapperRef.current) return
		
		const timer = setTimeout(() => {
			// Find the Quill editor instance within this wrapper
			const editorElement = wrapperRef.current?.querySelector('.ql-editor') as HTMLElement
			const reactQuillComponent = wrapperRef.current?.querySelector('.ql-container')?.parentElement as any
			
			if (!editorElement) return
			
			// Function to clean Word HTML
			const cleanWordHTML = (html: string): string => {
				const tempDiv = document.createElement('div')
				tempDiv.innerHTML = html
				
				// Remove all MSO-* classes and attributes
				const allElements = tempDiv.querySelectorAll('*')
				allElements.forEach(el => {
					// Remove Word-specific classes
					if (el.className) {
						const classes = el.className.split(' ').filter(c => !c.toLowerCase().includes('mso'))
						if (classes.length > 0) {
							el.className = classes.join(' ')
						} else {
							el.removeAttribute('class')
						}
					}
					
					// Clean style attributes - remove mso-* styles but keep formatting
					if (el.hasAttribute('style')) {
						const style = el.getAttribute('style') || ''
						const cleanStyles = style
							.split(';')
							.map(s => s.trim())
							.filter(s => {
								if (!s) return false
								const key = s.split(':')[0].trim().toLowerCase()
								return !key.includes('mso-') && !key.includes('mso-')
							})
							.join(';')
						
						if (cleanStyles) {
							el.setAttribute('style', cleanStyles)
						} else {
							el.removeAttribute('style')
						}
					}
					
					// Remove Word-specific attributes
					Array.from(el.attributes).forEach(attr => {
						if (attr.name.toLowerCase().includes('mso') || attr.name.toLowerCase().startsWith('xml:')) {
							el.removeAttribute(attr.name)
						}
					})
				})
				
				return tempDiv.innerHTML
			}
			
			// Custom paste handler
			const handlePaste = (e: ClipboardEvent) => {
				const clipboardData = e.clipboardData
				if (!clipboardData) return
				
				// Check for HTML data (Word provides this)
				const htmlData = clipboardData.getData('text/html')
				if (htmlData && htmlData.toLowerCase().includes('mso')) {
					e.preventDefault()
					e.stopPropagation()
					
					// Clean the Word HTML
					const cleanedHTML = cleanWordHTML(htmlData)
					
					// Get Quill instance if available
					const quillInstance = (reactQuillComponent as any)?.getEditor?.() || 
						(window as any).Quill?.find(editorElement)
					
					if (quillInstance && quillInstance.clipboard) {
						// Use Quill's clipboard API to paste cleaned HTML
						const range = quillInstance.getSelection(true) || { index: 0, length: 0 }
						quillInstance.clipboard.dangerouslyPasteHTML(range.index, cleanedHTML, 'user')
					} else {
						// Fallback: insert cleaned HTML directly
						const selection = window.getSelection()
						if (selection && selection.rangeCount > 0) {
							const range = selection.getRangeAt(0)
							range.deleteContents()
							
							const pasteDiv = document.createElement('div')
							pasteDiv.innerHTML = cleanedHTML
							
							const fragment = document.createDocumentFragment()
							while (pasteDiv.firstChild) {
								fragment.appendChild(pasteDiv.firstChild)
							}
							
							range.insertNode(fragment)
							range.collapse(false)
							selection.removeAllRanges()
							selection.addRange(range)
							
							// Trigger change event
							editorElement.dispatchEvent(new Event('input', { bubbles: true }))
						}
					}
					
					return false
				}
			}
			
			editorElement.addEventListener('paste', handlePaste, true)
			
			return () => {
				editorElement.removeEventListener('paste', handlePaste, true)
			}
		}, 200)
		
		return () => clearTimeout(timer)
	}, [])

	return (
		<div ref={wrapperRef} className={`rich-text-editor-wrapper ${className}`}>
			<style jsx global>{`
				.rich-text-editor-wrapper .ql-container {
					font-family: inherit;
					font-size: 14px;
					min-height: 200px;
					direction: auto;
				}
				.rich-text-editor-wrapper .ql-editor {
					min-height: 200px;
					font-family: inherit;
					direction: auto;
				}
				.rich-text-editor-wrapper .ql-editor.ql-blank::before {
					color: #999;
					font-style: normal;
				}
				.rich-text-editor-wrapper .ql-toolbar {
					border-top-left-radius: 0.375rem;
					border-top-right-radius: 0.375rem;
					border-bottom: none;
				}
				.rich-text-editor-wrapper .ql-container {
					border-bottom-left-radius: 0.375rem;
					border-bottom-right-radius: 0.375rem;
					border-top: 1px solid #ccc;
				}
			`}</style>
			<ReactQuill
				theme="snow"
				value={value}
				onChange={onChange}
				modules={modules}
				formats={formats}
				placeholder={placeholder || 'Enter description here...'}
			/>
		</div>
	)
}

