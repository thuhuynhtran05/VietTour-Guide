// backend/src/controllers/authController.js
const User = require("../models/User");
const GuideProfile = require("../models/GuideProfile");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =======================
// REGISTER
// POST /api/auth/register
// =======================
exports.register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      certifications,
      languages,
      bio,
    } = req.body;

    console.log("📝 Register attempt:", { name, email, phone, role });

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
    }

    // Check email exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    // Hash password → LƯU passwordHash
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user data (KHỚP SCHEMA)
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      passwordHash, // ✅ ĐÚNG FIELD
      role: role || "customer", // admin | guide | customer
      status: role === "guide" ? "pending" : "active",
    };

    // Nếu là guide, thêm thông tin
    if (role === "guide") {
      if (languages) {
        userData.languages = languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
      }

      if (bio) {
        userData.bio = bio.trim();
      }
    }

    const user = await User.create(userData);

    // Nếu là guide → tạo GuideProfile
    if (role === "guide") {
      const certArray = certifications
        ? certifications
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      await GuideProfile.create({
        user: user._id,
        languages: userData.languages || [],
        certifications: certArray,
        bio: userData.bio || "",
        approved: false,
      });

      console.log("✅ Created GuideProfile for user:", user._id);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ User registered successfully:", user._id);

    return res.status(201).json({
      success: true,
      message:
        role === "guide"
          ? "Đăng ký thành công! Vui lòng chờ admin duyệt hồ sơ."
          : "Đăng ký thành công!",
      token,
      user: {
        _id: user._id,  // ✅ FIX: Thêm _id
        id: user._id,   // ✅ Giữ id để tương thích
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email đã được sử dụng",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: messages[0] || "Dữ liệu không hợp lệ",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};

// =======================
// LOGIN
// POST /api/auth/login
// =======================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Compare password (ĐÚNG FIELD)
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Check account status
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản của bạn đã bị tạm khóa",
      });
    }

    if (user.role === "guide" && user.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hướng dẫn viên đang chờ duyệt",
      });
    }

    if (user.role === "guide" && user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản hướng dẫn viên đã bị từ chối",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful:", user._id);
    console.log("🎫 Token generated:", token.substring(0, 30) + "...");

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      token,
      user: {
        _id: user._id,  // ✅ FIX: Thêm _id
        id: user._id,   // ✅ Giữ id để tương thích
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
};