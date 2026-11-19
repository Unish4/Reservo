import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  newJti,
} from "../utils/jwt.js";
import {
  createSession,
  getSession,
  revokeSession,
  revokeAllForUser,
} from "../services/sessionService.js";

function authResponse(
  user,
  {
    businessId = null,
    role = null,
    refreshJti = null,
    refreshToken = null,
  } = {},
) {
  const accessToken = signAccessToken({ userId: user._id, businessId, role });
  return {
    user: user.toJSON(),
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
  };
}

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

    const { refreshToken, jti } = await issueRefresh(user);
    res.status(201).json(authResponse(user, { refreshToken }));
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

    const { refreshToken } = await issueRefresh(user);
    res.json(authResponse(user, { refreshToken }));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    let payload;
    try {
      payload = verifyToken(refreshToken, "refresh");
    } catch {
      throw new AppError("Invalid refresh token", 401, "REFRESH_INVALID");
    }

    const session = await getSession(payload.jti);
    if (!session)
      throw new AppError("Session expired or revoked", 401, "SESSION_REVOKED");

    const user = await User.findById(payload.sub);
    if (!user) throw new AppError("User no longer exists", 401, "USER_GONE");

    await revokeSession(payload.jti, payload.sub);
    const { refreshToken: newRefresh } = await issueRefresh(user);
    res.json(authResponse(user, { refreshToken: newRefresh }));
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      throw new AppError("refreshToken is required", 400, "VALIDATION_ERROR");
    try {
      const payload = verifyToken(refreshToken, "refresh");
      await revokeSession(payload.jti, payload.sub);
    } catch {
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(req, res, next) {
  try {
    const count = await revokeAllForUser(req.user.sub);
    res.json({ revoked: count });
  } catch (err) {
    next(err);
  }
}

// Helper — shared by register/login/refresh.
async function issueRefresh(user) {
  const jti = newJti();
  const refreshToken = signRefreshToken({ userId: user._id, jti });
  await createSession({ jti, userId: user._id });
  return { refreshToken, jti };
}