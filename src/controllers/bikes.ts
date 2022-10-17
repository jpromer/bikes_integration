import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';
import { validationResult, ValidationError, Result } from 'express-validator';
import HttpError from '../models/http-error';
import Bike, {
  BikeInterface,
  BikeCharacteristicsInterface,
} from '../models/bike';

export const getBikeById = (
  req: Request<{ bid: string }>,
  res: Response,
  next: NextFunction
): void => {
  const bikeId: string = req.params.bid;
  Bike.findOne({ bikeId }).then(
    (bike) => {
      if (bike == null) {
        return next(
          new HttpError('Could not find bike for the provided id.', 404)
        );
      }
      res.json({ bike: bike.toObject({ getters: true }) });
    },
    () => {
      return next(
        new HttpError('Something went wrong, could not find a bike.', 500)
      );
    }
  );
};

export const createBike = async (
  bike?: BikeInterface | null
): Promise<
  Document<unknown, unknown, BikeInterface> &
    BikeInterface & {
      _id: Types.ObjectId;
    }
> => {
  if (bike != null) {
    const { color, model, bikeId }: BikeInterface = bike;

    const tempBike = new Bike({
      bikeId,
      color,
      model,
    });

    return await tempBike.save().then(
      async (createdBike) => {
        return await Promise.resolve(createdBike);
      },
      async () => {
        return await Promise.reject(
          new HttpError('Creating bike failed, please try again.', 500)
        );
      }
    );
  } else {
    return await Promise.reject(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }
};

export const createBikeRoute = (
  req: Request<Result<ValidationError>, unknown, BikeInterface>,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }
  createBike(req.body).then(
    (bike) => {
      res.status(201).json({ bike });
    },
    (error) => {
      return next(error);
    }
  );
};

export const getAllBikes = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  Bike.find().then(
    (allBikes) => {
      res.json({
        bikes: allBikes.map((bike) => bike.toObject({ getters: true })),
      });
    },
    () => {
      return next(
        new HttpError('Fetching bikes failed, please try again later.', 500)
      );
    }
  );
};

export const updateBike = async (
  bike?: BikeInterface | null
): Promise<
  Document<unknown, unknown, BikeInterface> &
    BikeInterface & {
      _id: Types.ObjectId;
    }
> => {
  if (bike != null) {
    const { color, model, bikeId }: BikeInterface = bike;
    Bike.findOne({ bikeId }).then(
      async (tempBike) => {
        if (tempBike === null) {
          return await Promise.reject(
            new HttpError('Could not find bike for this id.', 404)
          );
        }
        tempBike.color = color;
        tempBike.model = model;
        tempBike.save().then(
          async (updateBike) => {
            return await Promise.resolve(updateBike);
          },
          async () => {
            return await Promise.reject(
              new HttpError('Something went wrong, could not update bike.', 500)
            );
          }
        );
      },
      async () => {
        return await Promise.reject(
          new HttpError('Something went wrong, could not update bike.', 500)
        );
      }
    );
  }
  return await Promise.reject(
    new HttpError('Invalid inputs passed, please check your data.', 422)
  );
};

export const updateBikeRoute = (
  req: Request<{ bid: string }, unknown, BikeCharacteristicsInterface>,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const bike: BikeInterface = {
    ...req.body,
    bikeId: req.params.bid,
  };

  updateBike(bike).then(
    (updatedBike) => {
      res.status(200).json({ bike: updatedBike.toObject({ getters: true }) });
    },
    (error) => {
      return next(error);
    }
  );
};

export const deleteBike = async (
  bikeId?: string | null
): Promise<
  Document<unknown, unknown, BikeInterface> &
    BikeInterface & {
      _id: Types.ObjectId;
    }
> => {
  if (bikeId != null) {
    return await Bike.findOne({ bikeId }).then(
      async (tempBike) => {
        if (tempBike == null) {
          return await Promise.reject(
            new HttpError('Could not find bike for this id.', 404)
          );
        }
        return await tempBike.remove().then(
          async (deletedBike) => {
            return await Promise.resolve(deletedBike);
          },
          async () => {
            return await Promise.reject(
              new HttpError('Something went wrong, could not delete bike.', 500)
            );
          }
        );
      },
      async () => {
        return await Promise.reject(
          new HttpError('Something went wrong, could not delete bike.', 500)
        );
      }
    );
  } else {
    return await Promise.reject(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }
};

export const deleteBikeRoute = (
  req: Request<{ bid: string }>,
  res: Response,
  next: NextFunction
): void => {
  const bikeId: string = req.params.bid;

  deleteBike(bikeId).then(
    () => {
      res.status(200).json({ message: 'Deleted bike.' });
    },
    (error) => {
      return next(error);
    }
  );
};
