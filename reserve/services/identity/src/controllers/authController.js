import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw new AppError("Missing required fields", 400, "MISSING_FIELDS");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ email, passwordHash, name });

    const accessToken = signAccessToken({ userId: user._id });

    res.status(201).json({
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return next(new AppError("Email already registered", 409, "EMAIL_TAKEN"));
    }
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Missing required fields", 400, "MISSING_FIELDS");
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(
        "Invalid email or password",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const accessToken = signAccessToken({ userId: user._id });

    res.status(200).json({
      user: user.toJSON(),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}
