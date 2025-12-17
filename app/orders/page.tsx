"use client"

import { useState } from 'react'
import { Search, Package, Truck, CheckCircle, XCircle, Clock, MapPin, Phone, Mail } from 'lucide-react'
import { formatCurrencyPKR } from '@/app/lib/price'
import Link from 'next/link'

type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'

interface OrderItem {
  _id?: string
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  title?: string
  variantLabel?: string
  image?: string
}

interface Order {
  _id: string
  userId?: string
  status: OrderStatus
  paymentMethod: 'COD' | 'JAZZCASH'
  paymentStatus: PaymentStatus
  totalAmount: number
  deliveryFee: number
  shippingName: string
  shippingPhone: string
  shippingAddress: string
  city: string
  paymentReference?: string
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [searchMethod, setSearchMethod] = useState<'id' | 'phone'>('id')

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800'
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5" />
      case 'PROCESSING':
        return <Package className="h-5 w-5" />
      case 'SHIPPED':
        return <Truck className="h-5 w-5" />
      case 'DELIVERED':
        return <CheckCircle className="h-5 w-5" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5" />
      default:
        return <Package className="h-5 w-5" />
    }
  }

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      let url = ''
      if (searchMethod === 'id') {
        if (!orderId.trim()) {
          setError('Please enter an order ID')
          setLoading(false)
          return
        }
        url = `/api/orders/${orderId.trim()}`
      } else {
        if (!phone.trim()) {
          setError('Please enter a phone number')
          setLoading(false)
          return
        }
        url = `/api/orders?phone=${encodeURIComponent(phone.trim())}`
      }

      const res = await fetch(url, { cache: 'no-store' })
      const json = await res.json()

      if (!res.ok || !json?.success) {
        setError(json?.message || 'Order not found. Please check your order ID or phone number.')
        setLoading(false)
        return
      }

      const orderData = json.data
      if (Array.isArray(orderData)) {
        if (orderData.length === 0) {
          setError('No orders found with this phone number.')
        } else {
          setOrder(orderData[0]) // Show the most recent order
        }
      } else {
        setOrder(orderData)
      }
    } catch (err: any) {
      setError('Failed to fetch order. Please try again.')
      console.error('Track order error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-pg max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Track Your Order</h1>
          <p className="text-lg text-slate-600">
            Enter your order ID or phone number to track your order status
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setSearchMethod('id')
                setOrderId('')
                setPhone('')
                setOrder(null)
                setError('')
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchMethod === 'id'
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Order ID
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchMethod('phone')
                setOrderId('')
                setPhone('')
                setOrder(null)
                setError('')
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                searchMethod === 'phone'
                  ? 'bg-brand text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Phone Number
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              {searchMethod === 'id' ? (
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter your order ID (e.g., 507f1f77bcf86cd799439011)"
                  className="w-full rounded-md border px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number (e.g., 03393399393)"
                  className="w-full rounded-md border px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              )}
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-brand-accent text-white rounded-md font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Order Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Details</h2>
                <p className="text-sm text-slate-600">Order ID: {order._id}</p>
                <p className="text-sm text-slate-600">
                  Placed on: {new Date(order.createdAt).toLocaleDateString('en-PK', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span>{order.status}</span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={item._id || idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                    {item.image && (
                      <img src={item.image} alt={item.title || 'Product'} className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.title || 'Product'}</p>
                      {item.variantLabel && (
                        <p className="text-sm text-slate-600">{item.variantLabel}</p>
                      )}
                      <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrencyPKR(item.unitPrice * item.quantity)}</p>
                      <p className="text-xs text-slate-500">{formatCurrencyPKR(item.unitPrice)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Information */}
              <div className="border rounded-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-accent" />
                  Shipping Information
                </h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium">Name:</span> {order.shippingName}</p>
                  <p><span className="font-medium">Phone:</span> {order.shippingPhone}</p>
                  <p><span className="font-medium">Address:</span> {order.shippingAddress}</p>
                  <p><span className="font-medium">City:</span> {order.city}</p>
                </div>
              </div>

              {/* Payment Information */}
              <div className="border rounded-md p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-accent" />
                  Payment Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Method:</span>
                    <span className="font-medium text-gray-900">{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Status:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                  {order.paymentReference && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Reference:</span>
                      <span className="font-medium text-gray-900">{order.paymentReference}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="text-gray-900">{formatCurrencyPKR(order.totalAmount - order.deliveryFee)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Delivery Fee:</span>
                        <span className="text-gray-900">{formatCurrencyPKR(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-brand-accent">{formatCurrencyPKR(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Need help?</strong> If you have any questions about your order, please contact us at{' '}
                <a href="tel:03393399393" className="underline font-medium">03393399393</a> or{' '}
                <Link href="/contact" className="underline font-medium">visit our contact page</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Help Section (when no order found) */}
        {!order && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Your Order</h3>
            <p className="text-slate-600 mb-4">
              Enter your order ID or phone number above to view your order status and details.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 transition-opacity"
              >
                <Phone className="h-4 w-4" />
                Contact Support
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

