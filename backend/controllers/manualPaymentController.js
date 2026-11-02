import ManualPayment from "../models/ManualPayment.js";
import User from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const submitManualPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { transactionReference, amount = 12 } = req.body;

    if (!transactionReference || !transactionReference.trim()) {
      return res.status(400).json({ message: "Transaction reference is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Payment screenshot is required" });
    }

    let screenshotUrl = "";
    const cloudinaryResult = await uploadOnCloudinary(req.file.path, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    if (cloudinaryResult && (cloudinaryResult.secure_url || cloudinaryResult.url)) {
      screenshotUrl = cloudinaryResult.secure_url || cloudinaryResult.url;
    } else {
      screenshotUrl = `/temp/${req.file.filename || req.file.originalname}`;
    }

    const payment = await ManualPayment.create({
      userId,
      amount: Number(amount) || 12,
      currency: "USD",
      transactionReference: transactionReference.trim(),
      screenshotUrl,
      status: "PENDING",
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-manual-payment", payment);
    }

    return res.status(201).json({
      message: "Payment proof submitted successfully. Super admin will review it shortly.",
      payment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit payment proof", error: error.message });
  }
};

export const getMyPaymentStatus = async (req, res) => {
  try {
    const payment = await ManualPayment.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json({ payment: payment || null });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payment status", error: error.message });
  }
};

export const getAdminManualPayments = async (req, res) => {
  try {
    const payments = await ManualPayment.find()
      .populate("userId", "username email avatar")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payments", error: error.message });
  }
};

export const approveManualPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await ManualPayment.findById(id);

    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    payment.status = "APPROVED";
    payment.reviewedBy = req.userId;
    payment.reviewedAt = new Date();
    await payment.save();

    const user = await User.findById(payment.userId);
    if (user) {
      user.subscription = {
        plan: "PRO",
        status: "active",
        cancelAtPeriodEnd: false,
        stripeCustomerId: user.subscription?.stripeCustomerId || null,
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      await user.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`user:${user._id}`).emit("subscription-updated", user.subscription);
      }
    }

    return res.json({
      message: "Payment approved successfully and Pro plan activated for 30 days",
      payment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve payment", error: error.message });
  }
};

export const rejectManualPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await ManualPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    payment.status = "REJECTED";
    payment.adminNotes = reason || "Payment verification failed. Please try again with valid proof.";
    payment.reviewedBy = req.userId;
    payment.reviewedAt = new Date();
    await payment.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${payment.userId}`).emit("subscription-rejected", {
        reason: payment.adminNotes,
      });
    }

    return res.json({
      message: "Payment rejected",
      payment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject payment", error: error.message });
  }
};
