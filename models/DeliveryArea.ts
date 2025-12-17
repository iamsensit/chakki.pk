import mongoose from 'mongoose'

const DeliveryAreaSchema = new mongoose.Schema({
	deliveryType: { type: String, enum: ['range', 'city'], default: 'range' }, // 'range' for radius-based, 'city' for city-wide
	city: { type: String, required: true },
	shopLocation: {
		address: { type: String, required: true },
		latitude: { type: Number, required: true },
		longitude: { type: Number, required: true }
	},
	deliveryRadius: { type: Number, default: 0 }, // in kilometers, 0 for city-wide delivery
	deliveryAreas: [{
		name: { type: String, required: true },
		placeId: { type: String }, // Google Place ID
		address: { type: String },
		latitude: { type: Number, required: true },
		longitude: { type: Number, required: true },
		radius: { type: Number, default: 0 }, // 0 means use city-wide radius
		bounds: { // Google Maps bounds for the society
			northeast: {
				lat: { type: Number },
				lng: { type: Number }
			},
			southwest: {
				lat: { type: Number },
				lng: { type: Number }
			}
		},
		viewport: { // Google Maps viewport
			northeast: {
				lat: { type: Number },
				lng: { type: Number }
			},
			southwest: {
				lat: { type: Number },
				lng: { type: Number }
			}
		}
	}],
	isActive: { type: Boolean, default: true },
	displayOrder: { type: Number, default: 0 }
}, {
	timestamps: true
})

export default mongoose.models.DeliveryArea || mongoose.model('DeliveryArea', DeliveryAreaSchema)

