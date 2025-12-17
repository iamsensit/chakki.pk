"use client"

import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  // Contact information - update these with your actual details
  const contactInfo = {
    phone: '03393399393',
    email: 'info@chakki.pk',
    address: 'Your Business Address, City, Pakistan',
    whatsapp: '923393399393', // WhatsApp number without + or spaces
    mapLocation: 'Lahore, Pakistan' // Update with your actual location for map
  }

  // Google Maps embed URL - update with your actual coordinates
  // You can get coordinates from Google Maps by right-clicking on your location
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3403.0!2d74.3587!3d31.5204!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDMxJzEzLjQiTiA3NMKwMjEnMzEuMyJF!5e0!3m2!1sen!2s!4v1234567890`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-pg py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-lg text-slate-600">
              We'd love to hear from you. Get in touch with us through any of the following ways.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information Card */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
              
              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a 
                      href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                      className="text-brand-accent hover:underline text-lg font-medium"
                    >
                      {contactInfo.phone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a 
                      href={`mailto:${contactInfo.email}`}
                      className="text-brand-accent hover:underline text-lg font-medium"
                    >
                      {contactInfo.email}
                    </a>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                    <p className="text-slate-600 text-lg">
                      {contactInfo.address}
                    </p>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">WhatsApp for Inquiries</h3>
                    <a 
                      href={`https://wa.me/${contactInfo.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-lg"
                    >
                      <span>Chat with us on WhatsApp</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="mt-8 pt-8 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Business Hours</h3>
                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">9:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-semibold text-gray-900">Find Us</h2>
                <p className="text-slate-600 mt-2">Visit our location</p>
              </div>
              <div className="relative w-full h-96">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                />
              </div>
              <div className="p-6">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.mapLocation)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-brand-accent hover:underline font-medium"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
              className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow"
            >
              <Phone className="h-8 w-8 text-brand-accent mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
              <p className="text-slate-600 text-sm">{contactInfo.phone}</p>
            </a>
            <a
              href={`mailto:${contactInfo.email}`}
              className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow"
            >
              <Mail className="h-8 w-8 text-brand-accent mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
              <p className="text-slate-600 text-sm">{contactInfo.email}</p>
            </a>
            <a
              href={`https://wa.me/${contactInfo.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow"
            >
              <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">WhatsApp</h3>
              <p className="text-slate-600 text-sm">Chat with us</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

