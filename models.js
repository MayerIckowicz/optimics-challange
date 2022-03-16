import { DatabaseModel } from "djorm/models/index.js";
import { FieldValidationError } from "djorm/errors.js";
import {
  DateField,
  DateTimeField,
  CharField,
  ForeignKey,
  PositiveIntegerField,
} from "djorm/fields/index.js";
//import { setupCommonApi } from "../__jest__/api.js";

//const API_ENDPOINT = setupCommonApi();

class TimestampedModel extends DatabaseModel {
  static id = new PositiveIntegerField();
  static createdAt = new DateTimeField();
  static updatedAt = new DateTimeField({ null: true });
  static meta = {
    abstract: true,
  };

  async create() {
    this.createdAt = new Date();
    return await super.create();
  }

  async update() {
    this.updatedAt = new Date();
    return await super.update();
  }
}

export class Pet extends TimestampedModel {
  static animal = new CharField();
  static name = new CharField();
  static birthday = new DateField();
  static meta = {
    modelName: "Pet",
  };
}

export class Person extends TimestampedModel {
  static name = new CharField();
  static meta = {
    modelName: "Person",
  };
}

export const RESERVATION_STATUS_NEW = 1;
export const RESERVATION_STATUS_CONFIRMED = 2;
export const RESERVATION_STATUS_CANCELLED = 3;

export const RESERVATION_STATUS_CHOICES = [
  RESERVATION_STATUS_NEW,
  RESERVATION_STATUS_CONFIRMED,
  RESERVATION_STATUS_CANCELLED,
];

export class ReservationOverlaps extends FieldValidationError {
  code = "reservation-overlaps";

  constructor(inst, fieldName) {
    super(
      inst,
      fieldName,
      `Field "${fieldName}" overlaps with another reservation`
    );
  }
}

export class Reservation extends TimestampedModel {
  static owner = new ForeignKey({
    model: "Person",
    keyField: "ownerId",
    relatedName: "reservations",
  });

  static pet = new ForeignKey({
    model: "Pet",
    keyField: "petId",
    relatedName: "reservations",
  });

  static status = new PositiveIntegerField({
    default: RESERVATION_STATUS_NEW,
    choices: RESERVATION_STATUS_CHOICES,
  });

  static since = new DateTimeField({
    /*
    validator: (value, inst, fieldName) => {
      throw new ReservationOverlaps(inst, fieldName)
    },
    */

    validator: async (value, inst, fieldName) => {
      const foundReservationsSince = await inst.constructor.objects
        .filter({
          petId: inst.petId,
          until__gt: inst.since,
          since__lt: inst.until,
        })
        .first();

      if (foundReservationsSince) {
        console.log(foundReservationsSince, "FOUND_RES_SINCE");
        throw new ReservationOverlaps(inst, fieldName);
      }
      console.log(inst, "instSINCE");
    },
  });

  static until = new DateTimeField({
    /*
    validator: async (value, inst, fieldName) => {
      throw new ReservationOverlaps(inst, fieldName)
    },
    */

    validator: async (value, inst, fieldName) => {
      const foundReservationsUntil = await inst.constructor.objects
        .filter({
          petId: inst.petId,
          // if until is greater then inst.since and at the same time
          // since is lesser then the inst.until, that means that we have an overlap
          until__gt: inst.since,
          since__lt: inst.until,
        })
        .first();

      if (foundReservationsUntil) {
        console.log(foundReservationsUntil, "FOUND_RES_UNTIL");
        throw new ReservationOverlaps(inst, fieldName);
      }
      console.log(inst, "inst");
    },
  });
}

Pet.register();
Person.register();
Reservation.register();
