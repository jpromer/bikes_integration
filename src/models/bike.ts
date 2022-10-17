import { Schema, model } from 'mongoose';

export interface BikeCharacteristicsInterface {
  color: string;
  model: string;
}

export interface BikeInterface extends BikeCharacteristicsInterface {
  bikeId: string;
}

const bikeSchema = new Schema<BikeInterface>({
  bikeId: { type: String, required: true },
  color: { type: String, required: true },
  model: { type: String, required: true },
});

const Bike = model<BikeInterface>('Bike', bikeSchema);

export default Bike;
