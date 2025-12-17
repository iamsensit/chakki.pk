"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import ErrorDialog from '@/app/components/ui/ErrorDialog'

interface ErrorDialogContextType {
	showError: (message: string, title?: string) => void
}

const ErrorDialogContext = createContext<ErrorDialogContextType | undefined>(undefined)

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const [title, setTitle] = useState('Error')

	const showError = (msg: string, ttl?: string) => {
		setMessage(msg)
		setTitle(ttl || 'Error')
		setOpen(true)
	}

	const closeDialog = () => {
		setOpen(false)
	}

	return (
		<ErrorDialogContext.Provider value={{ showError }}>
			{children}
			<ErrorDialog
				open={open}
				message={message}
				title={title}
				onClose={closeDialog}
			/>
		</ErrorDialogContext.Provider>
	)
}

export function useErrorDialog() {
	const context = useContext(ErrorDialogContext)
	if (!context) {
		throw new Error('useErrorDialog must be used within ErrorDialogProvider')
	}
	return context
}

