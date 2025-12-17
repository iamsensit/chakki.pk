import { cookies } from 'next/headers'
import { getBaseUrl } from '@/app/lib/url'

export async function fetchAuthed(input: string, init?: RequestInit) {
	const base = getBaseUrl()
	const url = input.startsWith('http') ? input : `${base}${input.startsWith('/') ? '' : '/'}${input}`
	const cookieHeader = cookies().toString()
	return fetch(url, {
		...init,
		headers: {
			...(init?.headers || {}),
			Cookie: cookieHeader,
		},
	})
}
