import mongoose from 'mongoose'

const UserDeliveryLocationSchema = new mongoose.Schema({
	userId: { type: String, required: true, unique: true }, // User email
	address: { type: String, required: true },
	latitude: { type: Number, required: true },
	longitude: { type: Number, required: true },
	city: { type: String, required: true },
	society: { type: String }, // Society/area name
	streetNumber: { type: String },
	houseNumber: { type: String },
	landmark: { type: String },
	deliveryAreaId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryArea' } // Reference to which delivery area this location belongs to
}, {
	timestamps: true
})

export default mongoose.models.UserDeliveryLocation || mongoose.model('UserDeliveryLocation', UserDeliveryLocationSchema)

