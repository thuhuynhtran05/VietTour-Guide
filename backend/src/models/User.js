// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // 🔐 LƯU HASH, KHÔNG LƯU PASSWORD THƯỜNG
    passwordHash: {
      type: String,
      required: true,
    },

    // 👤 ROLE: admin | guide | user
    role: {
      type: String,
      enum: ["admin", "guide", "user"], // ✅ ĐỔI customer → user
      default: "user",
    },

    // 📌 THÔNG TIN RIÊNG CỦA GUIDE
    phone: String,
    languages: [String],
    bio: String,
    avatar: String,
    experience: Number,
    specialties: [String],

    // 📌 TRẠNG THÁI TÀI KHOẢN
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: function () {
        // Guide phải chờ duyệt, user dùng luôn
        return this.role === "guide" ? "pending" : "active";
      },
    },

    // 👮‍♂️ LOG DUYỆT / TỪ CHỐI
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionReason: String,

    // 🌟 ĐÁNH GIÁ
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 🔍 INDEX PHỤC VỤ ADMIN FILTER
userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model("User", userSchema);
