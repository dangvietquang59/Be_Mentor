const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String },
    role: { type: String },
    bio: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    imageUrl: { type: String },
    age: { type: Number },
    rating: { type: String },
    slug: { type: String },
    technologies: [
      {
        technology: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Technologies",
        },
        experienceYears: { type: Number, required: true },
      },
    ],
    coin: { type: Number, default: 0 },
    pricePerHour: { type: Number, default: 0 },
    authenRole: { type: String, default: "User" },
    blocked: { type: Boolean, default: false },
    confirmed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
