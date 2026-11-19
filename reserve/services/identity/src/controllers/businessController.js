import { Business } from "../models/Business.js";
import { Membership } from "../models/Membership.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createBusiness(req, res, next) {
  try {
    const { name, timezone } = req.body;
    const slug = slugify(name);
    if (!slug) throw new AppError("Invalid business name", 400, "INVALID_NAME");

    const existing = await Business.findOne({ slug });
    if (existing)
      throw new AppError("Business slug already taken", 409, "SLUG_TAKEN");

    const business = await Business.create({
      name,
      slug,
      timezone: timezone ?? "UTC",
      ownerId: req.user.sub,
    });
    await Membership.create({
      userId: req.user.sub,
      businessId: business._id,
      role: "owner",
    });
    res.status(201).json({ business: business.toJSON(), role: "owner" });
  } catch (error) {
    if (error?.code === 11000)
      return next(
        new AppError("Business slug already taken", 409, "SLUG_TAKEN"),
      );
    next(error);
  }
}

export async function listMyBusinesses(req, res, next) {
  try {
    const memberships = await Membership.find({ userId: req.user.sub })
      .populate("businessId")
      .lean();
    const businesses = memberships
      .filter((m) => m.businessId)
      .map((m) => ({ ...m.businessId, role: m.role }));
    res.json({ businesses });
  } catch (error) {
    next(error);
  }
}

export async function addMember(req, res, next) {
  try {
    const { email, role } = req.body;
    const businessId = req.businessId;

    const user = await User.findOne({ email });
    if (!user)
      throw new AppError("No user with that email", 404, "USER_NOT_FOUND");

    const existing = await Membership.findOne({ userId: user._id, businessId });
    if (existing) throw new AppError("Already a member", 409, "ALREADY_MEMBER");

    const membership = await Membership.create({
      userId: user._id,
      businessId,
      role,
    });
    res.status(201).json({ membership: membership.toJSON() });
  } catch (error) {
    if (error?.code === 11000)
      return next(new AppError("Already a member", 409, "ALREADY_MEMBER"));
    next(error);
  }
}

export async function listMembers(req, res, next) {
  try {
    const memberships = await Membership.find({ businessId: req.businessId })
      .populate("userId", "email name")
      .lean();
    res.json({ memberships });
  } catch (error) {
    next(error);
  }
}
