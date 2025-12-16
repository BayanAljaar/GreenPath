import { Request, Response } from "express";
import {Country} from "../models/Country";

export const getAllCountries = async (req: Request, res: Response) => {
  try {
    const countries = await Country.find();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
