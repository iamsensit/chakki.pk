"use client"

import Link from 'next/link'
import { List, Search } from 'lucide-react'
import SearchBox from '@/app/components/search/SearchBox'

export default function SearchBar() {
	return (
		<div className="container-pg py-4 border-b">
			<div className="flex items-center gap-2">
				{/* Categories Button */}
				<Link 
					href="/products" 
					className="flex items-center gap-2 px-4 py-2.5 border border-gray-300  hover:bg-gray-50 transition-colors bg-white"
				>
					<List className="h-5 w-5 text-brand-accent" strokeWidth={2} />
					<span className="text-sm font-medium text-gray-700">Categories</span>
				</Link>
				
				{/* Search Input */}
				<div className="flex-1 flex items-center border-2 border-brand-accent  bg-white relative">
					<div className="flex-1 px-4 relative z-10">
						<SearchBox />
					</div>
					<button 
						type="submit"
						form="search-form"
						className="px-4 py-2.5 bg-brand-accent hover:bg-orange-600 transition-colors flex-shrink-0 relative z-10"
					>
						<Search className="h-5 w-5 text-white" strokeWidth={2} />
					</button>
				</div>
			</div>
		</div>
	)
}

